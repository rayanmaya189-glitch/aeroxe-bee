package com.aeroxebee.client.device

import android.content.Context
import android.util.Base64
import java.security.MessageDigest

data class DeviceFingerprint(
    val androidId: String,
    val uuid: String,
    val model: String,
    val brand: String,
    val manufacturer: String,
    val osVersion: String,
    val sdkLevel: Int,
    val sim: Map<String, String>,
    val installTime: Long,
)

object FingerprintBuilder {
    fun build(context: Context): DeviceFingerprint {
        val simInfo = SimInfoProvider.getSimInfo(context)
        val buildInfo = BuildInfoProvider.getBuildInfo()

        return DeviceFingerprint(
            androidId = DeviceIdProvider.getAndroidId(context),
            uuid = LocalUuidStore.getOrCreate(context),
            model = buildInfo["model"] ?: "unknown",
            brand = buildInfo["brand"] ?: "unknown",
            manufacturer = buildInfo["manufacturer"] ?: "unknown",
            osVersion = buildInfo["os_version"] ?: "unknown",
            sdkLevel = buildInfo["sdk_level"]?.toIntOrNull() ?: 0,
            sim = simInfo,
            installTime = InstallTimeProvider.getInstallTime(context),
        )
    }
}

object FingerprintHasher {
    fun hash(fingerprint: DeviceFingerprint): String {
        val raw = buildString {
            append(fingerprint.androidId)
            append(fingerprint.uuid)
            append(fingerprint.model)
            append(fingerprint.brand)
            append(fingerprint.manufacturer)
            append(fingerprint.osVersion)
            append(fingerprint.sdkLevel)
            append(fingerprint.sim["carrier"])
            append(fingerprint.sim["country"])
            append(fingerprint.sim["sim_operator"])
            append(fingerprint.installTime)
        }

        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(raw.toByteArray())
        return Base64.encodeToString(hash, Base64.NO_WRAP)
    }

    fun hashRaw(context: Context): String {
        val fingerprint = FingerprintBuilder.build(context)
        return hash(fingerprint)
    }
}
