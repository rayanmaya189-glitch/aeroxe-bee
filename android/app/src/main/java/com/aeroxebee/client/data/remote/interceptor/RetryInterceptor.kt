package com.aeroxebee.client.data.remote.interceptor

import okhttp3.Interceptor
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor

class RetryInterceptor(
    private val maxRetries: Int = 3,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        var attempt = 0

        while (true) {
            attempt++
            val response = try {
                chain.proceed(chain.request())
            } catch (e: Exception) {
                // Network errors (timeout, connection refused, etc.) are retryable
                if (attempt >= maxRetries) throw e
                Thread.sleep(1000L * attempt)
                continue
            }
            // Only retry on server errors (5xx).
            // Never retry on client errors (4xx) — they indicate invalid requests
            // that will fail identically on retry (e.g. 400, 401, 403, 404).
            val code = response.code
            if (code in 200..399 || code in 400..499 || attempt >= maxRetries) {
                return response
            }
            response.close()
            Thread.sleep(1000L * attempt)
        }
    }
}
