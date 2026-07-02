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
