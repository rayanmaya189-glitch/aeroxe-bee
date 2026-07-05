package com.aeroxebee.client.analytics

import android.os.Bundle
import com.google.firebase.analytics.FirebaseAnalytics
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Typed wrapper around Firebase Analytics for consistent event tracking.
 * All events use string constants so they appear in Firebase console as
 * named events rather than generic log_event calls.
 */
@Singleton
class AnalyticsHelper @Inject constructor(
    private val firebaseAnalytics: FirebaseAnalytics,
) {

    // ─── Screen Views ────────────────────────────────────────

    fun logScreenView(screenName: String, screenClass: String = screenName) {
        val params = Bundle().apply {
            putString(FirebaseAnalytics.Param.ITEM_NAME, screenName)
            putString(FirebaseAnalytics.Param.SCREEN_CLASS, screenClass)
        }
        firebaseAnalytics.logEvent(FirebaseAnalytics.Event.SCREEN_VIEW, params)
    }

    // ─── Authentication ──────────────────────────────────────

    fun logLogin(method: String) {
        val params = Bundle().apply {
            putString(FirebaseAnalytics.Param.METHOD, method)
        }
        firebaseAnalytics.logEvent(FirebaseAnalytics.Event.LOGIN, params)
    }

    fun logLoginFailed(method: String, error: String) {
        val params = Bundle().apply {
            putString(FirebaseAnalytics.Param.METHOD, method)
            putString("error", error)
        }
        firebaseAnalytics.logEvent("login_failed", params)
    }

    // ─── Device Events ───────────────────────────────────────

    fun logDeviceLogin(deviceId: String, simSlot: Int) {
        val params = Bundle().apply {
            putString("device_id", deviceId)
            putInt("sim_slot", simSlot)
        }
        firebaseAnalytics.logEvent("device_login", params)
    }

    fun logMqttConnected() {
        firebaseAnalytics.logEvent("mqtt_connected", Bundle.EMPTY)
    }

    fun logMqttDisconnected(reason: String) {
        val params = Bundle().apply {
            putString("reason", reason)
        }
        firebaseAnalytics.logEvent("mqtt_disconnected", params)
    }

    // ─── Messaging ───────────────────────────────────────────

    fun logMessageQueued(carrier: String?) {
        val params = Bundle().apply {
            putString("carrier", carrier ?: "unknown")
        }
        firebaseAnalytics.logEvent("message_queued", params)
    }

    fun logMessageSent(carrier: String?) {
        val params = Bundle().apply {
            putString("carrier", carrier ?: "unknown")
        }
        firebaseAnalytics.logEvent("message_sent", params)
    }

    fun logMessageFailed(carrier: String?, reason: String?) {
        val params = Bundle().apply {
            putString("carrier", carrier ?: "unknown")
            putString("reason", reason ?: "unknown")
        }
        firebaseAnalytics.logEvent("message_failed", params)
    }

    // ─── Feature Usage ───────────────────────────────────────

    fun logSettingsSaved() {
        firebaseAnalytics.logEvent("settings_saved", Bundle.EMPTY)
    }

    fun logFcmTokenRegistered() {
        firebaseAnalytics.logEvent("fcm_token_registered", Bundle.EMPTY)
    }

    fun logOnboardingCompleted() {
        firebaseAnalytics.logEvent("onboarding_completed", Bundle.EMPTY)
    }

    fun logRegistrationStep(step: String) {
        val params = Bundle().apply {
            putString("step", step)
        }
        firebaseAnalytics.logEvent("registration_step", params)
    }

    fun logPermissionRequested(permission: String) {
        val params = Bundle().apply {
            putString("permission", permission)
        }
        firebaseAnalytics.logEvent("permission_requested", params)
    }

    fun logBatteryOptimizationDisabled() {
        firebaseAnalytics.logEvent("battery_optimization_disabled", Bundle.EMPTY)
    }

    // ─── User Properties ─────────────────────────────────────

    fun setUserId(userId: String?) {
        firebaseAnalytics.setUserId(userId)
    }

    fun setUserProperty(key: String, value: String?) {
        firebaseAnalytics.setUserProperty(key, value)
    }
}
