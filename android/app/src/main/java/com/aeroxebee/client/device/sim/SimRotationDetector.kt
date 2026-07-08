package com.aeroxebee.client.device.sim

data class SimChangeEvent(
    val type: String,
    val severity: Int,
    val details: String,
)

object SimRotationDetector {

    fun detect(
        old: List<SimSnapshot>?,
        current: List<SimSnapshot>,
    ): List<SimChangeEvent> {
        val events = mutableListOf<SimChangeEvent>()

        if (old == null) {
            events.add(SimChangeEvent("FIRST_SEEN", 0, "Initial SIM snapshot"))
            return events
        }

        val oldMap = old.associateBy { it.slotIndex }
        val newMap = current.associateBy { it.slotIndex }

        for (slot in newMap.keys) {
            val oldSim = oldMap[slot]
            val newSim = newMap[slot]

            if (oldSim == null) {
                events.add(SimChangeEvent("NEW_SIM_INSERTED", 70, "Slot $slot"))
                continue
            }

            if (oldSim.subscriptionId != newSim?.subscriptionId) {
                events.add(SimChangeEvent("SIM_SWAPPED", 90, "Slot $slot"))
            }

            if (oldSim.mccMnc != newSim?.mccMnc) {
                events.add(SimChangeEvent("CARRIER_CHANGED", 80, "Slot $slot"))
            }

            if (oldSim.countryIso != newSim?.countryIso) {
                events.add(SimChangeEvent("COUNTRY_CHANGED", 85, "Slot $slot"))
            }
        }

        for (slot in oldMap.keys) {
            if (!newMap.containsKey(slot)) {
                events.add(SimChangeEvent("SIM_REMOVED", 75, "Slot $slot"))
            }
        }

        return events
    }
}
