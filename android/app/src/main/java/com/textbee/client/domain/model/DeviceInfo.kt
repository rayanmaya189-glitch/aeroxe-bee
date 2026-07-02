package com.textbee.client.domain.model

data class DeviceInfo(
    val deviceId: String = "",
    val phoneNumber: String = "",
    val simSlots: List<SimSlotInfo> = emptyList(),
    val batteryLevel: Int = 0,
    val isCharging: Boolean = false,
    val networkStrength: Int = 0,
    val networkType: String = "",
    val appVersion: String = "1.0.0",
    val lastHeartbeat: Long = System.currentTimeMillis(),
    val manufacturer: String = android.os.Build.MANUFACTURER,
    val model: String = android.os.Build.MODEL,
    val osVersion: String = android.os.Build.VERSION.RELEASE,
    val sdkLevel: Int = android.os.Build.VERSION.SDK_INT,
)

data class SimSlotInfo(
    val slot: Int,
    val carrier: String = "",
    val phoneNumber: String = "",
    val isAvailable: Boolean = false,
    val isRoaming: Boolean = false,
)

data class Stats(
    val totalSent: Long = 0,
    val totalDelivered: Long = 0,
    val totalFailed: Long = 0,
    val successRate: Double = 0.0,
    val messagesToday: Long = 0,
    val isConnected: Boolean = false,
    val total: Long = 0,
    val sent: Long = 0,
    val failed: Long = 0,
)
