package com.aeroxebee.client.data.remote.interceptor

import android.util.Log
import com.aeroxebee.client.BuildConfig
import com.aeroxebee.client.data.remote.model.DeviceLoginRequest
import com.aeroxebee.client.data.remote.model.TokenRefreshRequest
import com.aeroxebee.client.util.TokenManager
import com.google.gson.Gson
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.util.concurrent.TimeUnit

class AuthInterceptor(
    private val tokenManager: TokenManager,
) : Interceptor {
    private val gson = Gson()
    private val refreshClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val token = tokenManager.getToken()

        val request = if (token != null) {
            originalRequest.newBuilder()
                .addHeader("Authorization", "Bearer $token")
                .build()
        } else {
            originalRequest
        }

        val response = chain.proceed(request)

        if (response.code == 401 && token != null) {
            // Try refresh token first
            val refreshToken = tokenManager.getRefreshToken()
            if (refreshToken != null) {
                synchronized(this) {
                    val newToken = attemptRefresh(refreshToken)
                    if (newToken != null) {
                        tokenManager.saveToken(newToken)
                        response.close()
                        return chain.proceed(
                            originalRequest.newBuilder()
                                .addHeader("Authorization", "Bearer $newToken")
                                .build()
                        )
                    }
                }
            }

            // No refresh token or refresh failed — try auto-relogin with stored credentials
            val email = tokenManager.getAccountEmail()
            val password = tokenManager.getAccountPassword()
            val deviceId = tokenManager.getDeviceId()
            if (email != null && password != null && deviceId != null) {
                synchronized(this) {
                    val newToken = attemptAutoRelogin(email, password, deviceId)
                    if (newToken != null) {
                        tokenManager.saveToken(newToken)
                        response.close()
                        return chain.proceed(
                            originalRequest.newBuilder()
                                .addHeader("Authorization", "Bearer $newToken")
                                .build()
                        )
                    }
                }
            }
        }

        return response
    }

    private fun attemptRefresh(refreshToken: String): String? {
        return try {
            val url = BuildConfig.BASE_URL.trimEnd('/') + "/auth/refresh"
            val body = gson.toJson(TokenRefreshRequest(refreshToken))
                .toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url(url)
                .post(body)
                .build()
            val response = refreshClient.newCall(request).execute()
            val bodyStr = response.body?.string() ?: return null
            if (response.isSuccessful) {
                val json = gson.fromJson(bodyStr, Map::class.java)
                val data = json["data"] as? Map<*, *>
                data?.get("token") as? String
            } else {
                null
            }
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Extracts the raw physical ANDROID_ID from a composite device ID.
     * The composite format is "{ANDROID_ID}-sim{slot}" (e.g. "abc123-sim1").
     */
    private fun extractRawAndroidId(compositeId: String): String {
        val idx = compositeId.lastIndexOf("-sim")
        return if (idx > 0) compositeId.substring(0, idx) else compositeId
    }

    private fun attemptAutoRelogin(email: String, password: String, androidId: String): String? {
        return try {
            // Use the raw ANDROID_ID (physical device id), NOT the composite
            // deviceId-simN stored in tokenManager.getDeviceId(), because the
            // backend constructs the composite ID itself (androidId-sim{slot}).
            // Sending a composite ID would cause a malformed "androidId-sim1-sim1".
            //
            // Try stored raw ID first; for existing users upgrading, extract it
            // from the composite ID by stripping the "-sim{N}" suffix.
            val rawAndroidId = tokenManager.getAndroidId()
                ?: extractRawAndroidId(androidId)
            val simSlot = tokenManager.getSimSlot() + 1
            val request = DeviceLoginRequest(
                email = email,
                password = password,
                deviceId = rawAndroidId,
                simSlot = simSlot,
            )
            val body = gson.toJson(request)
                .toRequestBody("application/json".toMediaType())
            val httpRequest = Request.Builder()
                .url(BuildConfig.BASE_URL.trimEnd('/') + "/devices/login")
                .post(body)
                .build()
            val response = refreshClient.newCall(httpRequest).execute()
            val bodyStr = response.body?.string() ?: return null
            if (response.isSuccessful) {
                val json = gson.fromJson(bodyStr, Map::class.java)
                val success = json["success"] as? Boolean ?: false
                if (success) {
                    val data = json["data"] as? Map<*, *>
                    data?.get("token") as? String
                } else null
            } else null
        } catch (e: Exception) {
            Log.w("AuthInterceptor", "Auto-relogin failed: ${e.message}")
            null
        }
    }
}
