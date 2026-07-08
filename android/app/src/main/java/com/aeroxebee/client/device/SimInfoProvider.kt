package com.aeroxebee.client.device

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import java.util.UUID

object DeviceIdProvider {
    fun getAndroidId(context: Context): String {
        return Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID,
        ) ?: "unknown"
    }
}

object LocalUuidStore {
    private const val PREF = "device_prefs"
    private const val KEY = "device_uuid"

    fun getOrCreate(context: Context): String {
        val prefs = context.getSharedPreferences(PREF, Context.MODE_PRIVATE)
        var uuid = prefs.getString(KEY, null)
        if (uuid == null) {
            uuid = UUID.randomUUID().toString()
            prefs.edit().putString(KEY, uuid).apply()
        }
        return uuid
    }
}

object SimInfoProvider {
    fun getSimInfo(context: Context): Map<String, String> {
        val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as android.telephony.TelephonyManager
        val hasPhonePermission = ContextCompat.checkSelfPermission(
            context, Manifest.permission.READ_PHONE_STATE,
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasPhonePermission) {
            return mapOf(
                "carrier" to "unknown",
                "country" to "unknown",
                "sim_operator" to "unknown",
            )
        }

        return mapOf(
            "carrier" to (tm.networkOperatorName ?: "unknown"),
            "country" to (tm.networkCountryIso ?: "unknown"),
            "sim_operator" to (tm.simOperator ?: "unknown"),
        )
    }
}

object BuildInfoProvider {
    fun getBuildInfo(): Map<String, String> {
        return mapOf(
            "model" to Build.MODEL,
            "brand" to Build.BRAND,
            "manufacturer" to Build.MANUFACTURER,
            "os_version" to Build.VERSION.RELEASE,
            "sdk_level" to Build.VERSION.SDK_INT.toString(),
        )
    }
}

object InstallTimeProvider {
    fun getInstallTime(context: Context): Long {
        return try {
            val pm = context.packageManager
            val pkgInfo = pm.getPackageInfo(context.packageName, 0)
            pkgInfo.firstInstallTime
        } catch (_: Exception) {
            0L
        }
    }

    fun getInstallTimeMillis(context: Context): Long = getInstallTime(context)
}
