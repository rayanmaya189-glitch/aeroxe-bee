package com.aeroxebee.client.device.sim

import android.content.Context
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import com.aeroxebee.client.data.remote.model.SimReportEvent
import com.aeroxebee.client.data.remote.model.SimReportRequest
import com.aeroxebee.client.device.DeviceIdentityManager

class SimMonitor(
    private val context: Context,
    private val api: AeroXeBeeApi,
    private val identityManager: DeviceIdentityManager,
) {
    fun check(): List<SimChangeEvent> {
        val current = SimCollector.collect(context)
        val old = SimHistoryStore.get(context)
        val events = SimRotationDetector.detect(old, current)

        if (events.isNotEmpty()) {
            val hasRealChange = events.any { it.type != "FIRST_SEEN" }
            if (hasRealChange) {
                val timestamps = SimHistoryStore.getEventTimestamps(context).toMutableList()
                timestamps.add(System.currentTimeMillis())
                SimHistoryStore.saveEventTimestamps(context, timestamps)
            }
            SimHistoryStore.save(context, current)
        }

        return events
    }

    suspend fun checkAndReport(): Result<SimReportResult> {
        val events = check()
        if (events.isEmpty()) {
            return Result.success(SimReportResult(emptyList(), "NO_CHANGE", identityManager.androidId))
        }

        val sims = SimCollector.collect(context)
        val timestamps = SimHistoryStore.getEventTimestamps(context)
        val frequency = SimRotationFrequency.classify(timestamps)

        val reportEvents = events.map { event ->
            SimReportEvent(
                type = event.type,
                severity = event.severity,
                details = event.details,
            )
        }

        val snapshot = sims.map { sim ->
            com.aeroxebee.client.data.remote.model.SimSnapshotReport(
                slotIndex = sim.slotIndex,
                subscriptionId = sim.subscriptionId,
                carrierName = sim.carrierName,
                mccMnc = sim.mccMnc,
                countryIso = sim.countryIso,
            )
        }

        val request = SimReportRequest(
            deviceId = identityManager.androidId,
            events = reportEvents,
            simState = snapshot,
            frequency = frequency,
            fingerprintHash = identityManager.fingerprintHash,
        )

        return try {
            val response = api.reportSimEvent(request)
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(
                    SimReportResult(
                        events = events,
                        frequency = frequency,
                        deviceId = identityManager.androidId,
                    ),
                )
            } else {
                Result.failure(Exception("SIM report rejected: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

data class SimReportResult(
    val events: List<SimChangeEvent>,
    val frequency: String,
    val deviceId: String,
) {
    val isHighRisk: Boolean
        get() = events.any { it.severity >= 80 } || frequency in listOf("HIGH", "CRITICAL")

    val summary: String
        get() = when {
            frequency == "CRITICAL" -> "Rapid SIM rotation detected — device may be blocked"
            frequency == "HIGH" -> "Multiple SIM changes in short window"
            events.any { it.type == "SIM_SWAPPED" } -> "SIM card swapped"
            events.any { it.type == "COUNTRY_CHANGED" } -> "SIM country changed"
            events.any { it.type == "CARRIER_CHANGED" } -> "SIM carrier changed"
            events.any { it.type == "SIM_REMOVED" } -> "SIM card removed"
            events.any { it.type == "NEW_SIM_INSERTED" } -> "New SIM detected"
            else -> "SIM state changed"
        }
}
