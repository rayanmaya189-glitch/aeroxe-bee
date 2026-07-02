package com.textbee.client.data.remote.api

import com.textbee.client.data.remote.model.*
import retrofit2.Response
import retrofit2.http.*

interface TextBeeApi {
    @POST("devices/register")
    suspend fun registerDevice(@Body request: RegisterRequest): Response<ApiResponse<RegisterResponse>>

    @POST("devices/heartbeat")
    suspend fun sendHeartbeat(@Body request: HeartbeatRequest): Response<ApiResponse<Unit>>

    @GET("devices/tasks")
    suspend fun fetchTasks(
        @Query("device_id") deviceId: String,
        @Query("limit") limit: Int = 10,
    ): Response<ApiResponse<List<SMSCommand>>>

    @POST("devices/status")
    suspend fun updateStatus(@Body request: StatusUpdateRequest): Response<ApiResponse<Unit>>

    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: TokenRefreshRequest): Response<ApiResponse<TokenRefreshResponse>>
}
