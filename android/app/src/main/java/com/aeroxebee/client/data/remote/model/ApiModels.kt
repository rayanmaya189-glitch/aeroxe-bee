package com.aeroxebee.client.data.remote.model

import com.google.gson.annotations.SerializedName

data class ApiResponse<T>(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: T? = null,
    @SerializedName("error") val error: String? = null,
)

data class RegisterRequest(
    @SerializedName("physical_device_id") val physicalDeviceId: String,
    @SerializedName("phone_number") val phoneNumber: String,
    @SerializedName("carrier") val carrier: String,
    @SerializedName("sim_slot") val simSlot: Int,
    @SerializedName("app_version") val appVersion: String,
    @SerializedName("model") val model: String,
    @SerializedName("os_version") val osVersion: String,
    @SerializedName("api_key") val apiKey: String,
)

data class RegisterResponse(
    @SerializedName("device_id") val deviceId: String,
    @SerializedName("token") val token: String,
    @SerializedName("mqtt_broker_url") val mqttBrokerUrl: String?,
    @SerializedName("mqtt_credential_id") val mqttCredentialId: String?,
    @SerializedName("mqtt_username") val mqttUsername: String?,
    @SerializedName("mqtt_password") val mqttPassword: String?,
)

data class SMSCommand(
    @SerializedName("id") val id: String,
    @SerializedName("account_id") val accountId: String,
    @SerializedName("recipient") val recipient: String,
    @SerializedName("message") val message: String,
    @SerializedName("sender") val sender: String = "",
    @SerializedName("priority") val priority: String = "NORMAL",
    @SerializedName("sim_slot") val simSlot: Int = -1,
    @SerializedName("timestamp") val timestamp: Long = 0L,
)

data class StatusUpdateRequest(
    @SerializedName("message_id") val messageId: String,
    @SerializedName("device_id") val deviceId: String,
    @SerializedName("status") val status: String,
    @SerializedName("delivery_status") val deliveryStatus: String = "SENT",
    @SerializedName("confidence_score") val confidenceScore: Double = 0.0,
    @SerializedName("error") val error: String? = null,
    @SerializedName("sim_slot") val simSlot: Int = 0,
    @SerializedName("timestamp") val timestamp: Long = System.currentTimeMillis(),
)

data class TokenRefreshRequest(
    @SerializedName("refresh_token") val refreshToken: String,
)

data class TokenRefreshResponse(
    @SerializedName("token") val token: String,
)

data class DeregisterRequest(
    @SerializedName("device_id") val deviceId: String,
)

data class DeviceLoginRequest(
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String,
    @SerializedName("device_id") val deviceId: String,
    @SerializedName("sim_slot") val simSlot: Int = 1,
)

data class QRLoginRequest(
    @SerializedName("pairing_token") val pairingToken: String,
    @SerializedName("device_id") val deviceId: String,
    @SerializedName("phone_number") val phoneNumber: String = "",
    @SerializedName("carrier") val carrier: String = "",
    @SerializedName("sim_slot") val simSlot: Int = 1,
    @SerializedName("app_version") val appVersion: String = "",
    @SerializedName("model") val model: String = "",
    @SerializedName("os_version") val osVersion: String = "",
)

data class DeviceLoginResponse(
    @SerializedName("device_id") val deviceId: String,
    @SerializedName("is_new_device") val isNewDevice: Boolean,
    @SerializedName("token") val token: String,
    @SerializedName("mqtt") val mqtt: MqttConnectionInfo?,
    @SerializedName("device") val device: DeviceInfoData?,
    @SerializedName("account") val account: AccountInfo?,
)

data class MqttConnectionInfo(
    @SerializedName("broker_url") val brokerUrl: String,
    @SerializedName("username") val username: String,
    @SerializedName("password") val password: String,
    @SerializedName("credential_id") val credentialId: String,
)

data class DeviceInfoData(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String?,
    @SerializedName("sim_slot") val simSlot: Int,
    @SerializedName("status") val status: String?,
    @SerializedName("carrier") val carrier: String?,
)

data class AccountInfo(
    @SerializedName("id") val id: String,
    @SerializedName("email") val email: String,
    @SerializedName("name") val name: String?,
)

// ─── Member Dashboard ───────────────────────────────────────

data class MemberDashboardResponse(
    @SerializedName("account") val account: MemberAccountInfo,
    @SerializedName("devices") val devices: MemberDevicesInfo,
    @SerializedName("messages") val messages: MemberMessagesInfo,
    @SerializedName("usage") val usage: MemberUsageInfo,
    @SerializedName("subscription") val subscription: MemberSubscriptionInfo?,
)

data class MemberAccountInfo(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("email") val email: String,
    @SerializedName("plan") val plan: String,
    @SerializedName("status") val status: String,
)

data class MemberDevicesInfo(
    @SerializedName("total") val total: Int,
    @SerializedName("online") val online: Int,
)

data class MemberMessagesInfo(
    @SerializedName("total_sent") val totalSent: Long,
    @SerializedName("total_delivered") val totalDelivered: Long,
    @SerializedName("total_failed") val totalFailed: Long,
    @SerializedName("delivery_rate") val deliveryRate: Double,
)

data class MemberUsageInfo(
    @SerializedName("daily") val daily: Long,
    @SerializedName("monthly") val monthly: Long,
)

data class MemberSubscriptionInfo(
    @SerializedName("plan_type") val planType: String,
    @SerializedName("billing_cycle") val billingCycle: String,
    @SerializedName("status") val status: String,
    @SerializedName("renewal_date") val renewalDate: String,
)

// ─── Member Devices ─────────────────────────────────────────

data class MemberDeviceInfo(
    @SerializedName("id") val id: String,
    @SerializedName("physical_device_id") val physicalDeviceId: String,
    @SerializedName("name") val name: String?,
    @SerializedName("sim_slot") val simSlot: Int,
    @SerializedName("carrier") val carrier: String,
    @SerializedName("status") val status: String,
    @SerializedName("last_seen") val lastSeen: String?,
)

data class UpdateDeviceNameRequest(
    @SerializedName("name") val name: String,
)

// ─── Member Messages ────────────────────────────────────────

data class MemberMessagesResponse(
    @SerializedName("data") val data: List<MemberMessage>,
    @SerializedName("total") val total: Long,
    @SerializedName("page") val page: Int,
    @SerializedName("page_size") val pageSize: Int,
    @SerializedName("total_pages") val totalPages: Int,
)

data class MemberMessage(
    @SerializedName("id") val id: String,
    @SerializedName("recipient") val recipient: String,
    @SerializedName("sender") val sender: String,
    @SerializedName("status") val status: String,
    @SerializedName("delivery_status") val deliveryStatus: String,
    @SerializedName("confidence_score") val confidenceScore: Double,
    @SerializedName("created_at") val createdAt: String,
)

// ─── Member Analytics ───────────────────────────────────────

data class MemberAnalyticsItem(
    @SerializedName("id") val id: String,
    @SerializedName("date") val date: String,
    @SerializedName("total_sent") val totalSent: Long,
    @SerializedName("total_delivered") val totalDelivered: Long,
    @SerializedName("total_failed") val totalFailed: Long,
    @SerializedName("avg_confidence") val avgConfidence: Double,
)

data class MemberStatsResponse(
    @SerializedName("total_sent") val totalSent: Long,
    @SerializedName("total_delivered") val totalDelivered: Long,
    @SerializedName("total_failed") val totalFailed: Long,
    @SerializedName("delivery_rate") val deliveryRate: Double,
)

// ─── Member Templates ───────────────────────────────────────

data class MemberTemplate(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("body") val body: String,
    @SerializedName("variables") val variables: List<String>,
    @SerializedName("created_at") val createdAt: String,
)

data class CreateTemplateRequest(
    @SerializedName("name") val name: String,
    @SerializedName("body") val body: String,
    @SerializedName("variables") val variables: List<String>,
)

// ─── Member Webhooks ────────────────────────────────────────

data class MemberWebhook(
    @SerializedName("id") val id: String,
    @SerializedName("url") val url: String,
    @SerializedName("events") val events: List<String>,
    @SerializedName("active") val active: Boolean,
    @SerializedName("created_at") val createdAt: String,
)

data class CreateWebhookRequest(
    @SerializedName("url") val url: String,
    @SerializedName("events") val events: List<String>,
)

// ─── Member Preferences ─────────────────────────────────────

data class MemberPreferences(
    @SerializedName("email_notifications") val emailNotifications: Boolean = true,
    @SerializedName("sms_notifications") val smsNotifications: Boolean = true,
    @SerializedName("webhook_notifications") val webhookNotifications: Boolean = true,
    @SerializedName("billing_alerts") val billingAlerts: Boolean = true,
    @SerializedName("security_alerts") val securityAlerts: Boolean = true,
)

// ─── Member KYC ─────────────────────────────────────────────

data class MemberKycStatus(
    @SerializedName("status") val status: String,
    @SerializedName("full_name") val fullName: String?,
    @SerializedName("document_type") val documentType: String?,
)

data class SubmitKycRequest(
    @SerializedName("full_name") val fullName: String,
    @SerializedName("document_type") val documentType: String,
    @SerializedName("document_number") val documentNumber: String,
    @SerializedName("document_url") val documentUrl: String,
)

// ─── Member Plans ───────────────────────────────────────────

data class MemberPlan(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("monthly_price") val monthlyPrice: Double,
    @SerializedName("features") val features: List<String>,
)

data class MemberPaymentConfig(
    @SerializedName("id") val id: String,
    @SerializedName("method") val method: String,
    @SerializedName("label") val label: String,
    @SerializedName("enabled") val enabled: Boolean,
)

data class CreateSubscriptionRequest(
    @SerializedName("requested_plan") val requestedPlan: String,
    @SerializedName("requested_billing_cycle") val requestedBillingCycle: String,
    @SerializedName("reason") val reason: String,
)

data class CreatePaymentRequest(
    @SerializedName("plan_id") val planId: String,
    @SerializedName("billing_cycle") val billingCycle: String,
    @SerializedName("payment_method") val paymentMethod: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("proof_url") val proofUrl: String?,
)

data class MemberSubscriptionRequestItem(
    @SerializedName("id") val id: String,
    @SerializedName("requested_plan_name") val requestedPlanName: String,
    @SerializedName("status") val status: String,
    @SerializedName("created_at") val createdAt: String,
)

data class MemberPaymentRequestItem(
    @SerializedName("id") val id: String,
    @SerializedName("plan_name") val planName: String,
    @SerializedName("payment_method") val paymentMethod: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("status") val status: String,
    @SerializedName("created_at") val createdAt: String,
)

data class MemberPaginatedResponse<T>(
    @SerializedName("data") val data: List<T>,
    @SerializedName("total") val total: Long,
    @SerializedName("page") val page: Int,
    @SerializedName("page_size") val pageSize: Int,
    @SerializedName("total_pages") val totalPages: Int,
)

// ─── API Keys ───────────────────────────────────────────────

data class MemberApiKey(
    @SerializedName("id") val id: String,
    @SerializedName("label") val label: String,
    @SerializedName("scopes") val scopes: List<String>,
    @SerializedName("created_at") val createdAt: String,
    @SerializedName("last_used_at") val lastUsedAt: String?,
)

data class CreateApiKeyRequest(
    @SerializedName("label") val label: String,
    @SerializedName("scopes") val scopes: List<String>,
    @SerializedName("expires_in") val expiresIn: String?,
)

data class MemberApiKeyCreateResult(
    @SerializedName("id") val id: String,
    @SerializedName("label") val label: String,
    @SerializedName("api_key") val apiKey: String,
    @SerializedName("scopes") val scopes: List<String>,
)

// ─── Sessions ───────────────────────────────────────────────

data class MemberSession(
    @SerializedName("id") val id: String,
    @SerializedName("user_agent") val userAgent: String,
    @SerializedName("ip_address") val ipAddress: String,
    @SerializedName("last_active") val lastActive: String,
    @SerializedName("created_at") val createdAt: String,
)

// ─── 2FA ────────────────────────────────────────────────────

data class MemberTwoFAStatus(
    @SerializedName("enabled") val enabled: Boolean,
)

data class MemberTwoFASetup(
    @SerializedName("secret") val secret: String,
    @SerializedName("url") val url: String,
    @SerializedName("enabled") val enabled: Boolean,
)

data class Verify2FARequest(
    @SerializedName("code") val code: String,
)

// ─── Feature Catalog ────────────────────────────────────────

data class MemberFeatureCatalogItem(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("category") val category: String,
)

// ─── OTP ────────────────────────────────────────────────────

data class OtpSendRequest(
    @SerializedName("recipient") val recipient: String,
    @SerializedName("sender") val sender: String,
    @SerializedName("message") val message: String,
    @SerializedName("sim_slot") val simSlot: Int?,
)

data class OtpSendResponse(
    @SerializedName("otp_id") val otpId: String,
    @SerializedName("expires_in") val expiresIn: Int,
)

data class OtpVerifyRequest(
    @SerializedName("otp_id") val otpId: String,
    @SerializedName("code") val code: String,
)

data class OtpVerifyResponse(
    @SerializedName("verified") val verified: Boolean,
)
