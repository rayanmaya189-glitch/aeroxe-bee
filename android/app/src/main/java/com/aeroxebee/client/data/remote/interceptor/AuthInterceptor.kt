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

    private fun attemptAutoRelogin(email: String, password: String, androidId: String): String? {
        return try {
            val simSlot = tokenManager.getSimSlot() + 1
            val request = DeviceLoginRequest(
                email = email,
                password = password,
                deviceId = androidId,
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
