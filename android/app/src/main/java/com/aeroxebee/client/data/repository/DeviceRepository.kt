package com.aeroxebee.client.data.repository

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
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import com.aeroxebee.client.BuildConfig
import com.aeroxebee.client.data.remote.model.*
import com.aeroxebee.client.domain.model.DeviceInfo
import com.aeroxebee.client.domain.model.SimSlotInfo
import com.aeroxebee.client.util.DeviceStateClassifier
import com.aeroxebee.client.util.TokenManager
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeviceRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: AeroXeBeeApi,
    private val tokenManager: TokenManager,
    private val deviceStateClassifier: DeviceStateClassifier,
) {
    /**
     * Login to the server with email+password and register/authenticate this device.
     * Stores all credentials (token, MQTT details, device info) in TokenManager on success.
     * After login, reports device info to backend via POST /api/v1/devices/info.
     */
    suspend fun loginDevice(email: String, password: String, simSlot: Int = 0): Result<Unit> = runCatching {
        val androidId = Settings.Secure.getString(
            context.contentResolver, Settings.Secure.ANDROID_ID
        ) ?: throw Exception("Unable to get device ID")
        val deviceId = androidId

        val request = DeviceLoginRequest(
            email = email,
            password = password,
            deviceId = deviceId,
            simSlot = simSlot + 1, // Backend expects 1-based sim slot
        )
        val response = api.deviceLogin(request)
        val body = response.body()

        if (response.isSuccessful && body?.success == true && body.data != null) {
            val data = body.data

            // Save auth token
            tokenManager.saveToken(data.token)

            // Save device info — use backend-returned device ID (e.g. "androidid-sim1")
            tokenManager.saveDeviceId(data.deviceId)
            tokenManager.saveSimSlot(simSlot)

            // Save account info
            tokenManager.saveAccountEmail(email)
            tokenManager.saveAccountPassword(password)
            tokenManager.saveAccountName(data.account?.name ?: email)
            tokenManager.saveAccountId(data.account?.id ?: "")

            // Save MQTT connection details — broker URL from BuildConfig, credentials from login response
            tokenManager.saveMqttBrokerUrl(BuildConfig.MQTT_BROKER_URL)
            data.mqtt?.let { mqtt ->
                tokenManager.saveMqttUsername(mqtt.username)
                tokenManager.saveMqttPassword(mqtt.password)
            }

            // Mark as registered
            tokenManager.saveRegistered(true)

            // Report device info to backend (best-effort, non-blocking)
            reportDeviceInfoToBackend(deviceId)
        } else {
            throw Exception(body?.error ?: "Login failed")
        }
    }

    /**
     * Report physical device metadata to the backend after login.
     * Includes model, OS version, battery, network, and device state classification.
     * This is best-effort: failures are logged but don't block login.
     */
    suspend fun reportDeviceInfoToBackend(physicalDeviceId: String) {
        withContext(Dispatchers.IO) {
            try {
                val batteryLevel = getBatteryLevel()
                val isCharging = isCharging()
                val networkType = getNetworkType(
                    context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
                )
                val deviceState = deviceStateClassifier.classify().name

                val request = DeviceInfoReportRequest(
                    physicalDeviceId = physicalDeviceId,
                    model = Build.MODEL,
                    manufacturer = Build.MANUFACTURER,
                    osVersion = "${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})",
                    sdkLevel = Build.VERSION.SDK_INT,
                    appVersion = getAppVersion(),
                    batteryLevel = batteryLevel.toDouble(),
                    isCharging = isCharging,
                    networkType = networkType,
                    deviceState = deviceState,
                )
                val response = api.reportDeviceInfo(request)
                if (response.isSuccessful) {
                    android.util.Log.i("DeviceRepository", "Device info reported successfully: state=$deviceState")
                } else {
                    android.util.Log.w("DeviceRepository", "Device info report failed: ${response.code()}")
                }
            } catch (e: Exception) {
                android.util.Log.w("DeviceRepository", "Device info report failed: ${e.message}")
            }
        }
    }

    private fun getAppVersion(): String {
        return try {
            val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            pInfo.versionName ?: "1.0.0"
        } catch (_: Exception) { "1.0.0" }
    }

    suspend fun deregisterDevice(): Result<Unit> = runCatching {
        val deviceId = tokenManager.getDeviceId() ?: throw Exception("No device registered")
        api.deregisterDevice(DeregisterRequest(deviceId))
    }

    suspend fun updateStatus(request: StatusUpdateRequest) {
        try {
            api.updateStatus(request)
        } catch (e: Exception) {
            android.util.Log.w("DeviceRepository", "Failed to update status for message ${request.messageId}: ${e.message}")
        }
    }

    @SuppressLint("MissingPermission", "NewApi")
    @Suppress("DEPRECATION")
    fun getDeviceInfo(): DeviceInfo {
        val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        val slots = mutableListOf<SimSlotInfo>()

        val subManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
        val subs = subManager.activeSubscriptionInfoList ?: emptyList()
        val modemCount = tm.activeModemCount

        if (modemCount > 0) {
            for (i in 0 until modemCount) {
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
        } else {
            // Fallback for devices that don't report activeModemCount (e.g. some tablets/emulators).
            // Use active subscriptions directly, or create a single placeholder slot.
            for (sub in subs) {
                slots.add(
                    SimSlotInfo(
                        slot = sub.simSlotIndex,
                        carrier = sub.carrierName?.toString() ?: "",
                        phoneNumber = sub.number ?: "",
                        isAvailable = true,
                    )
                )
            }
        }

        // If still empty, create a single fallback slot so the UI never shows "No SIM slots detected"
        // on a device that clearly has telephony capability.
        if (slots.isEmpty()) {
            slots.add(
                SimSlotInfo(
                    slot = 0,
                    carrier = tm.networkOperatorName?.takeIf { it.isNotBlank() } ?: "Unknown",
                    isAvailable = false,
                )
            )
        }

        val androidId = Settings.Secure.getString(
            context.contentResolver, Settings.Secure.ANDROID_ID
        ) ?: ""

        return DeviceInfo(
            deviceId = tokenManager.getDeviceId() ?: androidId,
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
