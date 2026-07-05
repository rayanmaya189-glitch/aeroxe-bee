package com.textbee.client.util

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.os.SystemClock
import android.provider.Settings
import com.textbee.client.worker.WatchdogReceiver
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Classifies the device state as ACTIVE, DOZE_RISK, or OEM_KILL_RISK
 * based on manufacturer-specific behaviors, doze mode, and battery optimization.
 *
 * PRD §5.4: each device reports/derives a device_state of ACTIVE, DOZE_RISK, or OEM_KILL_RISK
 * based on manufacturer, OS version, and observed background-execution behavior.
 */
@Singleton
class DeviceStateClassifier @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    /**
     * Classify the current device state based on manufacturer, OS version,
     * battery optimization status, and doze mode.
     */
    fun classify(): String {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager

        // Check if device ignores battery optimizations (whitelisted)
        val isIgnoringBatteryOptimizations = try {
            powerManager.isIgnoringBatteryOptimizations(context.packageName)
        } catch (_: Exception) { false }

        // Check doze mode status
        val isDeviceIdleMode = try {
            powerManager.isDeviceIdleMode
        } catch (_: Exception) { false }

        // Known aggressive OEMs that kill background services
        val aggressiveOemKillManufacturers = setOf(
            "xiaomi", "redmi", "poco",          // MIUI/HyperOS
            "huawei", "honor",                    // EMUI
            "samsung",                            // OneUI (varies by version)
            "oppo", "oneplus", "realme",          // ColorOS/OxygenOS
            "vivo",                               // FunTouchOS
            "lenovo",                             // ZUI
            "sony",                               // Xperia
            "meizu",                              // Flyme
        )

        val manufacturer = Build.MANUFACTURER.lowercase()

        // OEM_KILL_RISK: aggressive OEM + not whitelisted from battery optimization
        if (manufacturer in aggressiveOemKillManufacturers && !isIgnoringBatteryOptimizations) {
            return "OEM_KILL_RISK"
        }

        // DOZE_RISK: device is in doze mode or not whitelisted
        if (isDeviceIdleMode || !isIgnoringBatteryOptimizations) {
            return "DOZE_RISK"
        }

        // ACTIVE: whitelisted and not in doze
        return "ACTIVE"
    }
}
