package com.aeroxebee.client.data.remote.model

import com.google.gson.annotations.SerializedName

data class SimReportRequest(
    @SerializedName("device_id") val deviceId: String,
    @SerializedName("events") val events: List<SimReportEvent>,
    @SerializedName("sim_state") val simState: List<SimSnapshotReport>,
    @SerializedName("frequency") val frequency: String,
    @SerializedName("fingerprint_hash") val fingerprintHash: String,
)

data class SimReportEvent(
    @SerializedName("type") val type: String,
    @SerializedName("severity") val severity: Int,
    @SerializedName("details") val details: String,
)

data class SimSnapshotReport(
    @SerializedName("slot_index") val slotIndex: Int,
    @SerializedName("subscription_id") val subscriptionId: Int,
    @SerializedName("carrier_name") val carrierName: String?,
    @SerializedName("mcc_mnc") val mccMnc: String?,
    @SerializedName("country_iso") val countryIso: String?,
)
