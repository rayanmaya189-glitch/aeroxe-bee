package com.aeroxebee.client.fcm

import android.util.Log
import com.google.firebase.messaging.FirebaseMessaging
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import com.aeroxebee.client.data.remote.model.FCMTokenRequest
import com.aeroxebee.client.analytics.AnalyticsHelper
import com.aeroxebee.client.performance.PerformanceTracer
import com.aeroxebee.client.util.TokenManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Registers the FCM token with the backend after login.
 * Called from SettingsViewModel after successful device login.
 * This is best-effort: failures are logged but don't block the login flow.
 */
@Singleton
class FCMRegistrar @Inject constructor(
    private val api: AeroXeBeeApi,
    private val tokenManager: TokenManager,
    private val analytics: AnalyticsHelper,
    private val tracer: PerformanceTracer,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    /**
     * Fetch the current FCM token and register it with the backend.
     */
    fun registerToken() {
        val trace = tracer.traceFcmRegistration()
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful) {
                trace.putAttribute("error", "token_fetch_failed")
                tracer.stopTrace(trace, TAG)
                Log.w(TAG, "FCM token fetch failed", task.exception)
                return@addOnCompleteListener
            }

            val token = task.result
            if (token.isNullOrBlank()) {
                trace.putAttribute("error", "token_empty")
                tracer.stopTrace(trace, TAG)
                Log.w(TAG, "FCM token is empty")
                return@addOnCompleteListener
            }

            // Save locally for later use
            tokenManager.saveFCMToken(token)

            // Report to backend (best-effort)
            scope.launch {
                try {
                    val deviceId = tokenManager.getDeviceId() ?: return@launch
                    val response = api.registerFCMToken(
                        FCMTokenRequest(
                            deviceId = deviceId,
                            fcmToken = token,
                            platform = "android",
                        )
                    )
                    if (response.isSuccessful) {
                        trace.putAttribute("result", "success")
                        Log.i(TAG, "FCM token registered with backend")
                        analytics.logFcmTokenRegistered()
                    } else {
                        trace.putAttribute("result", "failed")
                        trace.putAttribute("http_code", response.code().toString())
                        Log.w(TAG, "FCM token registration failed: ${response.code()}")
                    }
                } catch (e: Exception) {
                    trace.putAttribute("error", e.message?.take(100) ?: "unknown")
                    Log.w(TAG, "FCM token registration failed: ${e.message}")
                }
                tracer.stopTrace(trace, TAG)
            }
        }
    }

    companion object {
        private const val TAG = "FCMRegistrar"
    }
}
