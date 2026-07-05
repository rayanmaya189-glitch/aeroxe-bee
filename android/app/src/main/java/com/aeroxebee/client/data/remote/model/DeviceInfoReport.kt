package com.aeroxebee.client.data.remote.model

import com.google.gson.annotations.SerializedName

/**
 * Request body for POST /api/v1/devices/info.
 * Sent by Android after login to report physical device metadata
 * (model, OS version, battery, network, device state) to the backend.
 */
data class DeviceInfoReportRequest(
    @SerializedName("physical_device_id") val physicalDeviceId: String,
    @SerializedName("model") val model: String,
    @SerializedName("manufacturer") val manufacturer: String,
    @SerializedName("os_version") val osVersion: String,
    @SerializedName("sdk_level") val sdkLevel: Int,
    @SerializedName("app_version") val appVersion: String,
    @SerializedName("battery_level") val batteryLevel: Double,
    @SerializedName("is_charging") val isCharging: Boolean,
    @SerializedName("network_type") val networkType: String,
    @SerializedName("device_state") val deviceState: String, // ACTIVE, DOZE_RISK, OEM_KILL_RISK
)
