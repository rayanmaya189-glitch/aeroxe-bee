package com.aeroxebee.client.device.imei

import android.content.Context
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import com.aeroxebee.client.data.remote.model.ImeiReportRequest
import com.aeroxebee.client.data.remote.model.ImeiReportResponse
import com.aeroxebee.client.device.DeviceIdProvider
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ImeiManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: AeroXeBeeApi,
) {
    suspend fun report(): Result<ImeiReportResponse> {
        return try {
            val info = ImeiProvider.collect(context)
            val request = ImeiReportRequest(
                androidId = DeviceIdProvider.getAndroidId(context),
                imei = info.imei ?: "",
                meid = info.meid ?: "",
                hardwareSerial = info.hardwareSerial ?: "",
            )
            val response = api.reportImei(request)
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    Result.success(data)
                } else {
                    Result.failure(Exception("empty response data"))
                }
            } else {
                val msg = response.errorBody()?.string() ?: response.message()
                Result.failure(Exception("imei report failed: $msg"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
