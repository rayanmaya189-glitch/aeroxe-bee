package com.aeroxebee.client.data.remote.model

import com.google.gson.annotations.SerializedName

data class DeviceIdentityRequest(
    @SerializedName("fingerprint_hash") val fingerprintHash: String,
    @SerializedName("signature") val signature: String,
    @SerializedName("public_key") val publicKey: String,
    @SerializedName("integrity_token") val integrityToken: String?,
    @SerializedName("android_id") val androidId: String,
    @SerializedName("uuid") val uuid: String,
    @SerializedName("model") val model: String,
    @SerializedName("brand") val brand: String,
    @SerializedName("manufacturer") val manufacturer: String,
    @SerializedName("os_version") val osVersion: String,
    @SerializedName("sdk_level") val sdkLevel: Int,
    @SerializedName("carrier") val carrier: String,
    @SerializedName("sim_country") val simCountry: String,
    @SerializedName("sim_operator") val simOperator: String,
    @SerializedName("install_time") val installTime: Long,
)

data class DeviceIdentityResponse(
    @SerializedName("device_id") val deviceId: String,
    @SerializedName("trust_score") val trustScore: Double,
    @SerializedName("fingerprint_hash") val fingerprintHash: String,
    @SerializedName("is_verified") val isVerified: Boolean,
)
