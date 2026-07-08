package com.aeroxebee.client.device.intelligence

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import com.aeroxebee.client.BuildConfig
import com.aeroxebee.client.data.remote.model.DeviceIntelligenceRequest
import com.aeroxebee.client.device.DeviceIdProvider
import com.aeroxebee.client.device.FingerprintHasher
import com.aeroxebee.client.device.KeystoreManager
import com.aeroxebee.client.device.LocalUuidStore
import com.aeroxebee.client.device.SimInfoProvider

object DeviceIntelligenceReportBuilder {

    fun build(context: Context): DeviceIntelligenceRequest {
        val timeCheck = TimeConsistencyCheck.check(context)
        val network = NetworkFingerprinter.fingerprint(context)
        val sensors = SensorCollector.collect(context)
        val simInfo = SimInfoProvider.getSimInfo(context)
        val virtFlags = VirtualizationDetector.detect(context)
        val hookFlags = RuntimeHookingDetector.check()
        val integrityReport = RuntimeIntegrityChecker.check()

        val installTime = try {
            context.packageManager.getPackageInfo(context.packageName, 0).firstInstallTime
        } catch (_: Exception) { 0L }

        val appVersion = try {
            context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "unknown"
        } catch (_: Exception) { "unknown" }

        KeystoreManager.generateKeyIfNeeded()
        val fpHash = FingerprintHasher.hashRaw(context)
        val signature = KeystoreManager.sign(fpHash)
        val pubKey = KeystoreManager.getPublicKeyBase64()

        return DeviceIntelligenceRequest(
            androidId = DeviceIdProvider.getAndroidId(context),
            uuid = LocalUuidStore.getOrCreate(context),
            fingerprintHash = fpHash,
            signature = signature,
            publicKey = pubKey ?: "",
            keyVersion = KeystoreManager.KEY_VERSION,

            buildFingerprint = Build.FINGERPRINT,
            buildHardware = Build.HARDWARE,
            buildProduct = Build.PRODUCT,
            buildManufacturer = Build.MANUFACTURER,
            buildDevice = Build.DEVICE,
            buildBootloader = Build.BOOTLOADER,
            buildBoard = Build.BOARD,
            buildBrand = Build.BRAND,
            buildModel = Build.MODEL,
            buildType = Build.TYPE,
            buildTags = Build.TAGS,
            buildDisplay = Build.DISPLAY,
            buildHost = Build.HOST,
            osVersion = Build.VERSION.RELEASE,
            sdkLevel = Build.VERSION.SDK_INT,
            securityPatch = Build.VERSION.SECURITY_PATCH,

            systemTime = timeCheck.systemTime,
            buildTime = timeCheck.buildTime,
            installTime = timeCheck.installTime,
            timeIssues = timeCheck.issues,

            emulatorConfidence = EmulatorDetector.getConfidence(),
            emulatorFlags = EmulatorDetector.getFlags(),

            rootConfidence = RootDetector.getConfidence(),
            rootFlags = RootDetector.getFlags(),

            virtualizationFlags = virtFlags,

            hookConfidence = RuntimeHookingDetector.getConfidence(),
            hookFlags = hookFlags,

            integrityScore = integrityReport.integrityScore,
            integrityFlags = mapOf(
                "is_debugger_attached" to integrityReport.isDebuggerAttached,
                "is_debuggable" to integrityReport.isDeviceDebuggable,
                "is_running_under_test" to integrityReport.isRunningUnderTest,
                "has_hook_framework" to integrityReport.hasHookFramework,
                "has_suspicious_maps" to integrityReport.hasSuspiciousMaps,
                "suspicious_process_count" to integrityReport.suspiciousProcessCount,
            ),

            networkType = network.networkType,
            isVpnActive = network.isVpnActive,

            sensorCount = sensors.sensorCount,
            missingCommonSensors = sensors.missingCommonSensors,

            simInfo = simInfo,

            carrier = simInfo["carrier"] ?: "unknown",
            simCountry = simInfo["country"] ?: "unknown",
            simOperator = simInfo["sim_operator"] ?: "unknown",
            appVersion = appVersion,
        )
    }
}
