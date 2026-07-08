package com.aeroxebee.client.device.behavior

import android.content.Context
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import com.aeroxebee.client.data.remote.model.BehaviorEventRequest
import com.aeroxebee.client.device.DeviceIdProvider
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BehaviorEventManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: AeroXeBeeApi,
) {
    suspend fun report(eventType: String, details: String = "", metadata: Map<String, Any> = emptyMap()) {
        try {
            val request = BehaviorEventRequest(
                physicalDeviceId = DeviceIdProvider.getAndroidId(context),
                eventType = eventType,
                details = details,
                metadata = metadata,
            )
            api.reportBehaviorEvent(request)
        } catch (_: Exception) { }
    }
}
