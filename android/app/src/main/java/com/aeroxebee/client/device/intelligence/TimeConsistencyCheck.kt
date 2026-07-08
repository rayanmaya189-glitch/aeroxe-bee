package com.aeroxebee.client.device.intelligence

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader

object TimeConsistencyCheck {

    data class TimeCheckResult(
        val consistent: Boolean,
        val issues: List<String>,
        val systemTime: Long,
        val buildTime: Long,
        val installTime: Long,
        val timeSkewMinutes: Long,
    )

    fun check(context: Context): TimeCheckResult {
        val issues = mutableListOf<String>()
        val now = System.currentTimeMillis()
        val buildTime = Build.TIME * 1000L
        val installTime = getInstallTime(context)

        var timeSkew = 0L

        if (buildTime > 0 && now < buildTime) {
            issues.add("system_time_before_build")
            timeSkew = (buildTime - now) / 60000
        }

        if (installTime > 0 && now < installTime) {
            issues.add("system_time_before_install")
        }

        if (installTime > 0 && buildTime > 0 && installTime < buildTime) {
            issues.add("install_time_before_build")
        }

        if (now > 4102444800000L) { // year 2100
            issues.add("system_time_far_future")
        }

        return TimeCheckResult(
            consistent = issues.isEmpty(),
            issues = issues,
            systemTime = now,
            buildTime = buildTime,
            installTime = installTime,
            timeSkewMinutes = timeSkew,
        )
    }

    private fun getInstallTime(context: Context): Long {
        return try {
            val pm = context.packageManager
            val pkgInfo = pm.getPackageInfo(context.packageName, 0)
            pkgInfo.firstInstallTime
        } catch (_: Exception) {
            0L
        }
    }
}
