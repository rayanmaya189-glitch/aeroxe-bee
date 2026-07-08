package com.aeroxebee.client.device.sim

data class SimSnapshot(
    val slotIndex: Int,
    val subscriptionId: Int,
    val carrierName: String?,
    val mccMnc: String?,
    val countryIso: String?,
    val isRoaming: Boolean,
    val timestamp: Long,
)
