package com.aeroxebee.client.device.intelligence

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build

object FeatureClassDetector {

    fun getFlags(context: Context): Map<String, Boolean> {
        val pm = context.packageManager
        return mapOf(
            "has_fingerprint" to pm.hasSystemFeature(PackageManager.FEATURE_FINGERPRINT),
            "has_nfc" to pm.hasSystemFeature(PackageManager.FEATURE_NFC),
            "has_bluetooth" to pm.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH),
            "has_telephony" to pm.hasSystemFeature(PackageManager.FEATURE_TELEPHONY),
            "has_touchscreen" to pm.hasSystemFeature(PackageManager.FEATURE_TOUCHSCREEN),
            "has_camera" to pm.hasSystemFeature(PackageManager.FEATURE_CAMERA),
            "has_gps" to pm.hasSystemFeature(PackageManager.FEATURE_LOCATION_GPS),
            "has_wifi" to pm.hasSystemFeature(PackageManager.FEATURE_WIFI),
            "has_face" to pm.hasSystemFeature(PackageManager.FEATURE_FACE),
            "has_iris" to pm.hasSystemFeature(PackageManager.FEATURE_IRIS),
            "is_watch" to pm.hasSystemFeature(PackageManager.FEATURE_WATCH),
            "is_television" to pm.hasSystemFeature(PackageManager.FEATURE_TELEVISION),
            "is_automotive" to pm.hasSystemFeature(PackageManager.FEATURE_AUTOMOTIVE),
        )
    }

    fun getAnomalyScore(flags: Map<String, Boolean>): Float {
        var anomalies = 0

        val brand = Build.BRAND.lowercase()
        val model = Build.MODEL.lowercase()

        val knownPhoneBrands = listOf("samsung", "google", "oneplus", "xiaomi", "oppo",
            "vivo", "huawei", "honor", "motorola", "nokia", "sony", "lg", "asus", "lenovo", "htc")

        val isKnownPhone = knownPhoneBrands.any { brand.contains(it) }

        // Known phone brand lacking fingerprint
        if (isKnownPhone && flags["has_fingerprint"] == false) anomalies++
        // Known phone lacking NFC
        if (isKnownPhone && flags["has_nfc"] == false) anomalies++
        // Phone lacking telephony
        if (flags["has_telephony"] == false && flags["is_television"] == false && flags["is_watch"] == false) anomalies++
        // Phone lacking touchscreen
        if (flags["has_touchscreen"] == false) anomalies++
        // Phone lacking camera
        if (flags["has_camera"] == false && isKnownPhone) anomalies++
        // Phone lacking bluetooth
        if (flags["has_bluetooth"] == false && isKnownPhone) anomalies++
        // TV or watch pretending to be phone
        if ((flags["is_television"] == true || flags["is_watch"] == true || flags["is_automotive"] == true)
            && flags["has_telephony"] == true) anomalies += 2
        // Has face or iris but no camera
        if ((flags["has_face"] == true || flags["has_iris"] == true) && flags["has_camera"] == false) anomalies++

        val maxAnomalies = 10
        return (anomalies.toFloat() / maxAnomalies).coerceAtMost(1f)
    }

    fun hasAnomalies(context: Context): Boolean {
        return getAnomalyScore(getFlags(context)) > 0.3f
    }
}
