package com.textbee.client.data.repository

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.Build
import android.provider.Settings
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
    @SuppressLint("MissingPermission")
    suspend fun registerDevice(apiKey: String, simSlot: Int = 0): Result<Unit> = runCatching {
        val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        val deviceId = tm.imei ?: Settings.Secure.getString(
            context.contentResolver, Settings.Secure.ANDROID_ID
        )
        val phoneNumber = tm.line1Number ?: ""
        val carrier = tm.networkOperatorName ?: ""

        val request = RegisterRequest(
            physicalDeviceId = deviceId,
            phoneNumber = phoneNumber,
            carrier = carrier,
            simSlot = simSlot,
            appVersion = "1.0.0",
            model = Build.MODEL,
            osVersion = Build.VERSION.RELEASE,
            apiKey = apiKey,
        )
        val response = api.registerDevice(request)
        val body = response.body()

        if (response.isSuccessful && body?.success == true && body.data != null) {
            val data = body.data
            tokenManager.saveToken(data.token)
            tokenManager.saveDeviceId(data.deviceId)
            tokenManager.saveSimSlot(simSlot)
            data.mqttBrokerUrl?.let { tokenManager.saveMqttBrokerUrl(it) }
            data.mqttUsername?.let { tokenManager.saveMqttUsername(it) }
            data.mqttPassword?.let { tokenManager.saveMqttPassword(it) }
            data.mqttCredentialId?.let { tokenManager.saveMqttCredentialId(it) }
        } else {
            throw Exception(body?.error ?: "Registration failed")
        }
    }

    suspend fun deregisterDevice(): Result<Unit> = runCatching {
        val deviceId = tokenManager.getDeviceId() ?: throw Exception("No device registered")
        api.deregisterDevice(DeregisterRequest(deviceId))
    }

    suspend fun updateStatus(request: StatusUpdateRequest) {
        try { api.updateStatus(request) } catch (_: Exception) {}
    }

    @SuppressLint("MissingPermission", "NewApi")
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
        val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        val intent = context.registerReceiver(null, filter)
        val level = intent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = intent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        return if (level >= 0 && scale > 0) (level * 100) / scale else 50
    }

    private fun isCharging(): Boolean {
        val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        val intent = context.registerReceiver(null, filter)
        val status = intent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        return status == BatteryManager.BATTERY_STATUS_CHARGING ||
                status == BatteryManager.BATTERY_STATUS_FULL
    }

    @SuppressLint("MissingPermission")
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
