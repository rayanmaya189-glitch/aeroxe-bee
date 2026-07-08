package com.aeroxebee.client.device.intelligence

import android.app.ActivityManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.DisplayMetrics
import com.aeroxebee.client.BuildConfig
import com.aeroxebee.client.data.remote.model.DeviceIntelligenceRequest
import com.aeroxebee.client.device.DeviceIdProvider
import com.aeroxebee.client.device.FingerprintHasher
import com.aeroxebee.client.device.KeystoreManager
import com.aeroxebee.client.device.LocalUuidStore
import com.aeroxebee.client.device.SimInfoProvider
import com.aeroxebee.client.device.imei.ImeiProvider

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

        val imeiInfo = ImeiProvider.collect(context)

        // Display metrics
        val metrics = context.resources.displayMetrics
        val densityBucket = when (metrics.densityDpi) {
            DisplayMetrics.DENSITY_LOW -> "ldpi"
            DisplayMetrics.DENSITY_MEDIUM -> "mdpi"
            DisplayMetrics.DENSITY_HIGH -> "hdpi"
            DisplayMetrics.DENSITY_XHIGH -> "xhdpi"
            DisplayMetrics.DENSITY_XXHIGH -> "xxhdpi"
            DisplayMetrics.DENSITY_XXXHIGH -> "xxxhdpi"
            DisplayMetrics.DENSITY_TV -> "tvdpi"
            else -> "unknown"
        }
        val refreshRate = try {
            context.display?.refreshRate ?: 0f
        } catch (_: Exception) { 0f }

        // CPU / RAM
        val cpuAbis = Build.SUPPORTED_ABIS.toList()
        val cpu64Abis = Build.SUPPORTED_64_BIT_ABIS.toList()
        val cpuCores = Runtime.getRuntime().availableProcessors()
        val totalRamMb = try {
            val memInfo = ActivityManager.MemoryInfo()
            val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            am.getMemoryInfo(memInfo)
            memInfo.totalMem / (1024 * 1024)
        } catch (_: Exception) { 0L }

        // Feature class anomaly
        val featureFlags = FeatureClassDetector.getFlags(context)
        val featureAnomalyScore = FeatureClassDetector.getAnomalyScore(featureFlags)

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

            emulatorConfidence = EmulatorDetector.getConfidence(context),
            emulatorFlags = EmulatorDetector.getFlags(context),

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

            imei = imeiInfo.imei ?: "",
            meid = imeiInfo.meid ?: "",
            hardwareSerial = imeiInfo.hardwareSerial ?: "",

            screenWidth = metrics.widthPixels,
            screenHeight = metrics.heightPixels,
            screenDensityDpi = metrics.densityDpi,
            screenDensityBucket = densityBucket,
            screenRefreshRate = refreshRate,

            cpuAbis = cpuAbis,
            cpu64Abis = cpu64Abis,
            cpuCores = cpuCores,
            totalRamMb = totalRamMb,

            featureFlags = featureFlags,
            featureAnomalyScore = featureAnomalyScore,

            simInfo = simInfo,

            carrier = simInfo["carrier"] ?: "unknown",
            simCountry = simInfo["country"] ?: "unknown",
            simOperator = simInfo["sim_operator"] ?: "unknown",
            appVersion = appVersion,
        )
    }
}
