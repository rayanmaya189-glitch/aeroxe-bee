package com.textbee.client.fcm

import android.util.Log
import com.google.firebase.messaging.FirebaseMessaging
import com.textbee.client.data.remote.api.TextBeeApi
import com.textbee.client.data.remote.model.FCMTokenRequest
import com.textbee.client.util.TokenManager
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
    private val api: TextBeeApi,
    private val tokenManager: TokenManager,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    /**
     * Fetch the current FCM token and register it with the backend.
     */
    fun registerToken() {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful) {
                Log.w(TAG, "FCM token fetch failed", task.exception)
                return@addOnCompleteListener
            }

            val token = task.result
            if (token.isNullOrBlank()) {
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
                        Log.i(TAG, "FCM token registered with backend")
                    } else {
                        Log.w(TAG, "FCM token registration failed: ${response.code()}")
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "FCM token registration failed: ${e.message}")
                }
            }
        }
    }

    companion object {
        private const val TAG = "FCMRegistrar"
    }
}
