package com.aeroxebee.client.data.remote.model

import com.google.gson.Gson
import retrofit2.Response

/**
 * Extracts a user-friendly error message from a Retrofit Response.
 * Checks body.error first, then parses errorBody JSON, and falls back to HTTP code.
 */
fun <T> Response<ApiResponse<T>>.errorMessage(fallback: String = "Request failed"): String {
    body()?.error?.let { return it }
    errorBody()?.string()?.let { raw ->
        try {
            Gson().fromJson(raw, ApiResponse::class.java)?.error?.let { return it }
        } catch (_: Exception) { }
    }
    return "$fallback (HTTP ${code()})"
}
