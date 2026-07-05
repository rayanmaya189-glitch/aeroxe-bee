package com.aeroxebee.client.util

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ExactAlarmHandler @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    fun canScheduleExactAlarms(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            return ContextCompat.checkSelfPermission(context, Manifest.permission.SCHEDULE_EXACT_ALARM) ==
                    PackageManager.PERMISSION_GRANTED
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val am = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
            return am.canScheduleExactAlarms()
        }
        return true
    }

    fun hasExactAlarmPermission(): Boolean = canScheduleExactAlarms()

    fun isPermissionRequestNeeded(): Boolean {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !canScheduleExactAlarms()
    }

    companion object {
        const val KEY_EXACT_ALARM_GRANTED = "exact_alarm_granted"
    }
}
