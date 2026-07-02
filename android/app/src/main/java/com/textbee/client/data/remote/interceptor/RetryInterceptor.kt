package com.textbee.client.data.remote.interceptor

import okhttp3.Interceptor
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor

class RetryInterceptor(
    private val maxRetries: Int = 3,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        var response: Response? = null
        var attempt = 0

        while (attempt < maxRetries) {
            attempt++
            try {
                response = chain.proceed(chain.request())
                if (response.isSuccessful || attempt >= maxRetries) return response
                response.close()
            } catch (e: Exception) {
                if (attempt >= maxRetries) throw e
            }
            Thread.sleep((1000L * attempt))
        }

        return response ?: chain.proceed(chain.request())
    }
}
