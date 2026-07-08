package com.aeroxebee.client.device.imei

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat

object ImeiProvider {

    fun getImei(context: Context): String? {
        return try {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE)
                != PackageManager.PERMISSION_GRANTED
            ) return null

            val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager

            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                tm.imei
            } else {
                null
            }
        } catch (_: Exception) { null }
    }

    fun getMeid(context: Context): String? {
        return try {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE)
                != PackageManager.PERMISSION_GRANTED
            ) return null

            val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager

            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                tm.meid
            } else {
                null
            }
        } catch (_: Exception) { null }
    }

    fun getHardwareSerial(): String? {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                null
            } else {
                Build.getSerial()
            }
        } catch (_: Exception) { null }
    }

    data class ImeiInfo(
        val imei: String?,
        val meid: String?,
        val hardwareSerial: String?,
    )

    fun collect(context: Context): ImeiInfo {
        return ImeiInfo(
            imei = getImei(context),
            meid = getMeid(context),
            hardwareSerial = getHardwareSerial(),
        )
    }
}
