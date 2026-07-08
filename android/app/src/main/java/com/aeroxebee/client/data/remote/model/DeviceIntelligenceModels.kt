package com.aeroxebee.client.data.remote.model

import com.google.gson.annotations.SerializedName

data class DeviceIntelligenceRequest(
    @SerializedName("android_id") val androidId: String,
    @SerializedName("uuid") val uuid: String,
    @SerializedName("fingerprint_hash") val fingerprintHash: String,
    @SerializedName("signature") val signature: String,
    @SerializedName("public_key") val publicKey: String,
    @SerializedName("key_version") val keyVersion: Int,

    // Enriched Build fields (P0 entropy)
    @SerializedName("build_fingerprint") val buildFingerprint: String,
    @SerializedName("build_hardware") val buildHardware: String,
    @SerializedName("build_product") val buildProduct: String,
    @SerializedName("build_manufacturer") val buildManufacturer: String,
    @SerializedName("build_device") val buildDevice: String,
    @SerializedName("build_bootloader") val buildBootloader: String,
    @SerializedName("build_board") val buildBoard: String,
    @SerializedName("build_brand") val buildBrand: String,
    @SerializedName("build_model") val buildModel: String,
    @SerializedName("build_type") val buildType: String,
    @SerializedName("build_tags") val buildTags: String,
    @SerializedName("build_display") val buildDisplay: String,
    @SerializedName("build_host") val buildHost: String,
    @SerializedName("os_version") val osVersion: String,
    @SerializedName("sdk_level") val sdkLevel: Int,
    @SerializedName("security_patch") val securityPatch: String,

    // Time integrity (P1)
    @SerializedName("system_time") val systemTime: Long,
    @SerializedName("build_time") val buildTime: Long,
    @SerializedName("install_time") val installTime: Long,
    @SerializedName("time_issues") val timeIssues: List<String>,

    // Emulator flags (P0)
    @SerializedName("emulator_confidence") val emulatorConfidence: Float,
    @SerializedName("emulator_flags") val emulatorFlags: Map<String, Boolean>,

    // Root flags (P1)
    @SerializedName("root_confidence") val rootConfidence: Float,
    @SerializedName("root_flags") val rootFlags: Map<String, Boolean>,

    // Virtualization flags (P1)
    @SerializedName("virtualization_flags") val virtualizationFlags: Map<String, Boolean>,

    // Runtime hooking flags (P2)
    @SerializedName("hook_confidence") val hookConfidence: Float,
    @SerializedName("hook_flags") val hookFlags: Map<String, Boolean>,

    // Integrity report (P2)
    @SerializedName("integrity_score") val integrityScore: Float,
    @SerializedName("integrity_flags") val integrityFlags: Map<String, Any>,

    // Network fingerprint (P2)
    @SerializedName("network_type") val networkType: String,
    @SerializedName("is_vpn_active") val isVpnActive: Boolean,

    // Sensor report (P2)
    @SerializedName("sensor_count") val sensorCount: Int,
    @SerializedName("missing_common_sensors") val missingCommonSensors: Boolean,

    // SIM context
    @SerializedName("sim_info") val simInfo: Map<String, String>,

    // Carrier + install metadata
    @SerializedName("carrier") val carrier: String,
    @SerializedName("sim_country") val simCountry: String,
    @SerializedName("sim_operator") val simOperator: String,
    @SerializedName("app_version") val appVersion: String,
)

data class DeviceIntelligenceResponse(
    @SerializedName("device_id") val deviceId: String,
    @SerializedName("confidence_score") val confidenceScore: Double,
    @SerializedName("trust_score") val trustScore: Double,
    @SerializedName("action") val action: String,
    @SerializedName("risk_factors") val riskFactors: List<String>,
    @SerializedName("drift_detected") val driftDetected: Boolean,
    @SerializedName("drift_details") val driftDetails: String?,
)
