package com.aeroxebee.client.data.remote.api

import com.aeroxebee.client.data.remote.model.*
import retrofit2.Response
import retrofit2.http.*

interface AeroXeBeeApi {
    // ─── Device Auth ────────────────────────────────────────
    @POST("devices/login")
    suspend fun deviceLogin(@Body request: DeviceLoginRequest): Response<ApiResponse<DeviceLoginResponse>>

    @POST("devices/qr-login")
    suspend fun qrLogin(@Body request: QRLoginRequest): Response<ApiResponse<DeviceLoginResponse>>

    @POST("devices/register")
    suspend fun registerDevice(@Body request: RegisterRequest): Response<ApiResponse<RegisterResponse>>

    @POST("devices/deregister")
    suspend fun deregisterDevice(@Body request: DeregisterRequest): Response<ApiResponse<Map<String, Any>>>

    @POST("devices/info")
    suspend fun reportDeviceInfo(@Body request: DeviceInfoReportRequest): Response<ApiResponse<Unit>>

    @POST("devices/status")
    suspend fun updateStatus(@Body request: StatusUpdateRequest): Response<ApiResponse<Unit>>

    // ─── Auth ───────────────────────────────────────────────
    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: TokenRefreshRequest): Response<ApiResponse<TokenRefreshResponse>>

    @POST("auth/fcm-token")
    suspend fun registerFCMToken(@Body request: FCMTokenRequest): Response<ApiResponse<Unit>>

    // ─── Member Dashboard ───────────────────────────────────
    @GET("member/dashboard")
    suspend fun getMemberDashboard(): Response<ApiResponse<MemberDashboardResponse>>

    @GET("member/devices")
    suspend fun getMemberDevices(): Response<ApiResponse<List<MemberDeviceInfo>>>

    @PUT("member/devices/{id}")
    suspend fun updateMemberDevice(@Path("id") id: String, @Body request: UpdateDeviceNameRequest): Response<ApiResponse<Unit>>

    @DELETE("member/devices/{id}")
    suspend fun deleteMemberDevice(@Path("id") id: String): Response<ApiResponse<Unit>>

    @GET("member/messages")
    suspend fun getMemberMessages(
        @Query("page") page: Int = 1,
        @Query("page_size") pageSize: Int = 50
    ): Response<ApiResponse<MemberMessagesResponse>>

    @GET("member/analytics")
    suspend fun getMemberAnalytics(): Response<ApiResponse<List<MemberAnalyticsItem>>>

    @GET("member/stats")
    suspend fun getMemberStats(): Response<ApiResponse<MemberStatsResponse>>

    // ─── Member Templates ───────────────────────────────────
    @GET("member/templates")
    suspend fun getMemberTemplates(): Response<ApiResponse<List<MemberTemplate>>>

    @POST("member/templates")
    suspend fun createMemberTemplate(@Body request: CreateTemplateRequest): Response<ApiResponse<MemberTemplate>>

    @PUT("member/templates/{id}")
    suspend fun updateMemberTemplate(@Path("id") id: String, @Body request: CreateTemplateRequest): Response<ApiResponse<MemberTemplate>>

    @DELETE("member/templates/{id}")
    suspend fun deleteMemberTemplate(@Path("id") id: String): Response<ApiResponse<Unit>>

    // ─── Member Webhooks ────────────────────────────────────
    @GET("member/webhooks")
    suspend fun getMemberWebhooks(): Response<ApiResponse<List<MemberWebhook>>>

    @POST("member/webhooks")
    suspend fun createMemberWebhook(@Body request: CreateWebhookRequest): Response<ApiResponse<MemberWebhook>>

    @PUT("member/webhooks/{id}")
    suspend fun updateMemberWebhook(@Path("id") id: String, @Body request: CreateWebhookRequest): Response<ApiResponse<MemberWebhook>>

    @DELETE("member/webhooks/{id}")
    suspend fun deleteMemberWebhook(@Path("id") id: String): Response<ApiResponse<Unit>>

    @POST("member/webhooks/{id}/rotate-secret")
    suspend fun rotateMemberWebhookSecret(@Path("id") id: String): Response<ApiResponse<Map<String, String>>>

    // ─── Member Preferences ─────────────────────────────────
    @GET("member/preferences")
    suspend fun getMemberPreferences(): Response<ApiResponse<MemberPreferences>>

    @PUT("member/preferences")
    suspend fun updateMemberPreferences(@Body request: MemberPreferences): Response<ApiResponse<Unit>>

    // ─── Member KYC ─────────────────────────────────────────
    @GET("member/kyc")
    suspend fun getMemberKyc(): Response<ApiResponse<MemberKycStatus>>

    @POST("member/kyc")
    suspend fun submitMemberKyc(@Body request: SubmitKycRequest): Response<ApiResponse<Unit>>

    // ─── Member Subscription & Payment ──────────────────────
    @GET("plans")
    suspend fun getPlans(): Response<ApiResponse<List<MemberPlan>>>

    @GET("payment-configs")
    suspend fun getEnabledPaymentConfigs(): Response<ApiResponse<List<MemberPaymentConfig>>>

    @POST("member/subscription-requests")
    suspend fun createSubscriptionRequest(@Body request: CreateSubscriptionRequest): Response<ApiResponse<Unit>>

    @GET("member/subscription-requests")
    suspend fun getMemberSubscriptionRequests(
        @Query("page") page: Int = 1,
        @Query("page_size") pageSize: Int = 20,
        @Query("status") status: String? = null
    ): Response<ApiResponse<MemberPaginatedResponse<MemberSubscriptionRequestItem>>>

    @POST("member/payment-requests")
    suspend fun createPaymentRequest(@Body request: CreatePaymentRequest): Response<ApiResponse<Unit>>

    @GET("member/payment-requests")
    suspend fun getMemberPaymentRequests(
        @Query("page") page: Int = 1,
        @Query("page_size") pageSize: Int = 20,
        @Query("status") status: String? = null
    ): Response<ApiResponse<MemberPaginatedResponse<MemberPaymentRequestItem>>>

    // ─── Account ────────────────────────────────────────────
    @GET("account/profile")
    suspend fun getAccountProfile(): Response<ApiResponse<MemberDashboardResponse>>

    @GET("account/api-keys")
    suspend fun getApiKeys(): Response<ApiResponse<List<MemberApiKey>>>

    @POST("account/api-keys")
    suspend fun createApiKey(@Body request: CreateApiKeyRequest): Response<ApiResponse<MemberApiKeyCreateResult>>

    @DELETE("account/api-keys/{id}")
    suspend fun revokeApiKey(@Path("id") id: String): Response<ApiResponse<Unit>>

    // ─── Sessions ───────────────────────────────────────────
    @GET("auth/sessions")
    suspend fun getSessions(): Response<ApiResponse<List<MemberSession>>>

    @DELETE("auth/sessions/{id}")
    suspend fun revokeSession(@Path("id") id: String): Response<ApiResponse<Unit>>

    @DELETE("auth/sessions")
    suspend fun revokeAllSessions(): Response<ApiResponse<Unit>>

    // ─── 2FA ────────────────────────────────────────────────
    @GET("auth/2fa/status")
    suspend fun get2FAStatus(): Response<ApiResponse<MemberTwoFAStatus>>

    @POST("auth/2fa/setup")
    suspend fun setup2FA(): Response<ApiResponse<MemberTwoFASetup>>

    @POST("auth/2fa/verify")
    suspend fun verify2FA(@Body request: Verify2FARequest): Response<ApiResponse<Unit>>

    @POST("auth/2fa/disable")
    suspend fun disable2FA(@Body request: Verify2FARequest): Response<ApiResponse<Unit>>

    // ─── Feature Catalog ────────────────────────────────────
    @GET("feature-catalog")
    suspend fun getFeatureCatalog(@Query("active_only") activeOnly: Boolean = false): Response<ApiResponse<List<MemberFeatureCatalogItem>>>

    // ─── Version Check (in-app update) ──────────────────────
    @GET("version-check")
    suspend fun checkForUpdate(@Query("version_code") versionCode: Int): Response<ApiResponse<VersionCheckResponse>>

    // ─── OTP ────────────────────────────────────────────────
    @POST("otp/send")
    suspend fun sendOtp(@Body request: OtpSendRequest): Response<ApiResponse<OtpSendResponse>>

    @POST("otp/verify")
    suspend fun verifyOtp(@Body request: OtpVerifyRequest): Response<ApiResponse<OtpVerifyResponse>>
}
