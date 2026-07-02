package com.textbee.client.data.repository

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import com.textbee.client.data.remote.api.TextBeeApi
import com.textbee.client.data.remote.model.*
import com.textbee.client.domain.model.DeviceInfo
import com.textbee.client.domain.model.SimSlotInfo
import com.textbee.client.util.TokenManager
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeviceRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: TextBeeApi,
    private val tokenManager: TokenManager,
) {
    suspend fun registerDevice(): Result<String> = runCatching {
        val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        val deviceId = tm.imei ?: android.provider.Settings.Secure.getString(
            context.contentResolver, android.provider.Settings.Secure.ANDROID_ID
        )
        val phoneNumber = tm.line1Number ?: ""
        val carrier = tm.networkOperatorName ?: ""

        val request = RegisterRequest(
            deviceId = deviceId, phoneNumber = phoneNumber,
            carrier = carrier, simSlot = 0, appVersion = "1.0.0",
        )
        val response = api.registerDevice(request)
        val body = response.body()

        if (response.isSuccessful && body?.success == true && body.data != null) {
            tokenManager.saveToken(body.data.token)
            body.data.token
        } else {
            throw Exception(body?.error ?: "Registration failed")
        }
    }

    suspend fun sendHeartbeat(deviceInfo: DeviceInfo) {
        val request = HeartbeatRequest(
            deviceId = deviceInfo.deviceId,
            batteryLevel = deviceInfo.batteryLevel,
            isCharging = deviceInfo.isCharging,
            networkStrength = deviceInfo.networkStrength,
            networkType = deviceInfo.networkType,
            simSlots = deviceInfo.simSlots.map {
                SimSlotStatus(it.slot, it.carrier, it.phoneNumber, it.isAvailable, it.isRoaming)
            },
        )
        try { api.sendHeartbeat(request) } catch (_: Exception) {}
    }

    fun getDeviceInfo(): DeviceInfo {
        val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        val slots = mutableListOf<SimSlotInfo>()

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            val subManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
            val subs = subManager.activeSubscriptionInfoList ?: emptyList()
            for (i in 0 until tm.activeModemCount) {
                try {
                    val info = subs.find { it.simSlotIndex == i }
                    slots.add(
                        SimSlotInfo(
                            slot = i, carrier = info?.carrierName?.toString() ?: "",
                            phoneNumber = info?.number ?: "", isAvailable = info != null,
                        )
                    )
                } catch (_: Exception) {
                    slots.add(SimSlotInfo(slot = i, isAvailable = false))
                }
            }
        }

        return DeviceInfo(
            deviceId = tokenManager.getDeviceId() ?: "",
            phoneNumber = tm.line1Number ?: "",
            simSlots = slots,
            batteryLevel = getBatteryLevel(),
            isCharging = isCharging(),
            networkStrength = 0,
            networkType = getNetworkType(tm),
        )
    }

    private fun getBatteryLevel(): Int {
        val intent = context.registerReceiver(null, android.content.IntentFilter(android.content.Intent.ACTION_BATTERY_CHANGED))
        val level = intent?.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = intent?.getIntExtra(android.os.BatteryManager.EXTRA_SCALE, -1) ?: -1
        return if (level >= 0 && scale > 0) (level * 100) / scale else 50
    }

    private fun isCharging(): Boolean {
        val intent = context.registerReceiver(null, android.content.IntentFilter(android.content.Intent.ACTION_BATTERY_CHANGED))
        val status = intent?.getIntExtra(android.os.BatteryManager.EXTRA_STATUS, -1) ?: -1
        return status == android.os.BatteryManager.BATTERY_STATUS_CHARGING ||
                status == android.os.BatteryManager.BATTERY_STATUS_FULL
    }

    private fun getNetworkType(tm: TelephonyManager): String {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val activeNetwork = cm.activeNetwork ?: return "Unknown"
        val caps = cm.getNetworkCapabilities(activeNetwork) ?: return "Unknown"
        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) return "WiFi"
        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) return "Ethernet"

        return when (tm.dataNetworkType) {
            TelephonyManager.NETWORK_TYPE_LTE -> "LTE"
            TelephonyManager.NETWORK_TYPE_NR -> "5G"
            TelephonyManager.NETWORK_TYPE_UMTS -> "3G"
            TelephonyManager.NETWORK_TYPE_EDGE -> "2G"
            TelephonyManager.NETWORK_TYPE_HSPAP -> "HSPA+"
            TelephonyManager.NETWORK_TYPE_CDMA -> "CDMA"
            TelephonyManager.NETWORK_TYPE_EVDO_0 -> "EVDO"
            else -> "Cellular"
        }
    }
}
