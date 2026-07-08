package com.aeroxebee.client.device.intelligence

import android.content.Context
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import com.aeroxebee.client.data.remote.model.DeviceIntelligenceRequest
import com.aeroxebee.client.data.remote.model.DeviceIntelligenceResponse
import com.aeroxebee.client.util.TokenManager
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeviceIntelligenceManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: AeroXeBeeApi,
    private val tokenManager: TokenManager,
) {
    suspend fun report(): Result<DeviceIntelligenceResponse> {
        return try {
            val request = DeviceIntelligenceReportBuilder.build(context)
            val response = api.reportDeviceIntelligence(request)

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    tokenManager.saveDeviceFingerprint(request.fingerprintHash)
                    tokenManager.saveDeviceIdentityRegistered(true)
                    Result.success(data)
                } else {
                    Result.failure(Exception("empty response data"))
                }
            } else {
                val msg = response.errorBody()?.string() ?: response.message()
                Result.failure(Exception("intelligence report failed: $msg"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getRiskSummary(request: DeviceIntelligenceRequest): String {
        val risks = mutableListOf<String>()
        if (request.emulatorConfidence > 0.3f) risks.add("emulator")
        if (request.rootConfidence > 0.3f) risks.add("rooted")
        if (request.hookConfidence > 0.3f) risks.add("hooked")
        if (request.virtualizationFlags["virt_any_found"] == true) risks.add("virtualized")
        if (request.integrityScore < 0.5f) risks.add("low_integrity")
        if (request.isVpnActive) risks.add("vpn_active")
        if (request.missingCommonSensors) risks.add("missing_sensors")
        if (request.timeIssues.isNotEmpty()) risks.add("time_inconsistency")
        return risks.joinToString(", ")
    }
}
