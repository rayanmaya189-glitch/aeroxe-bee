package com.aeroxebee.client.data.remote.interceptor

import com.aeroxebee.client.BuildConfig
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
        }

        return response
    }

    private fun attemptRefresh(refreshToken: String): String? {
        return try {
            // Use BuildConfig.BASE_URL directly — it already includes /api/v1
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
}
