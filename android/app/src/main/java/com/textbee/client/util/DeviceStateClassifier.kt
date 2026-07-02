package com.textbee.client.util

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.textbee.client.domain.model.DeviceState
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeviceStateClassifier @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val aggressiveOems = setOf(
        "xiaomi", "redmi", "huawei", "honor", "oppo", "realme",
        "vivo", "oneplus", "asus", "lenovo", "meizu", " Samsung",
    )

    private val moderateOems = setOf(
        "nokia", "sony", "motorola", "lg", "google",
        "nothing", "oneplus",
    )

    fun classify(): DeviceState {
        val manufacturer = Build.MANUFACTURER.lowercase()

        if (isOemKillRisk(manufacturer)) {
            if (!isBatteryOptimizationExempted()) {
                return DeviceState.OEM_KILL_RISK
            }
        }

        if (isDozeRisk()) {
            return DeviceState.DOZE_RISK
        }

        return DeviceState.ACTIVE
    }

    private fun isOemKillRisk(manufacturer: String): Boolean {
        if (aggressiveOems.any { manufacturer.contains(it) }) return true
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && moderateOems.any { manufacturer.contains(it) }) {
            return true
        }
        return false
    }

    private fun isDozeRisk(): Boolean {
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        return !pm.isIgnoringBatteryOptimizations(context.packageName)
    }

    private fun isBatteryOptimizationExempted(): Boolean {
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        return pm.isIgnoringBatteryOptimizations(context.packageName)
    }

    fun openBatterySettings() {
        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
            data = Uri.parse("package:${context.packageName}")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }

    fun isExactAlarmPermitted(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        val am = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
        return am.canScheduleExactAlarms()
    }

    fun openExactAlarmSettings() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                data = Uri.parse("package:${context.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }
    }
}
