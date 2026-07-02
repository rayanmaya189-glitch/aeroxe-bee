package com.textbee.client.data.remote.model

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
    @SerializedName("priority") val priority: String = "NORMAL",
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
