package com.textbee.client.data.remote.api

import com.textbee.client.data.remote.model.*
import retrofit2.Response
import retrofit2.http.*

interface TextBeeApi {
    @POST("devices/login")
    suspend fun deviceLogin(@Body request: DeviceLoginRequest): Response<ApiResponse<DeviceLoginResponse>>

    @POST("devices/register")
    suspend fun registerDevice(@Body request: RegisterRequest): Response<ApiResponse<RegisterResponse>>

    @POST("devices/status")
    suspend fun updateStatus(@Body request: StatusUpdateRequest): Response<ApiResponse<Unit>>

    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: TokenRefreshRequest): Response<ApiResponse<TokenRefreshResponse>>

    @POST("devices/deregister")
    suspend fun deregisterDevice(@Body request: DeregisterRequest): Response<ApiResponse<Map<String, Any>>>
}
