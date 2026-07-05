package com.aeroxebee.client.config

import android.util.Log
import com.google.firebase.remoteconfig.FirebaseRemoteConfig
import com.google.firebase.remoteconfig.ktx.remoteConfigSettings
import com.google.firebase.remoteconfig.FirebaseRemoteConfigValue
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Typed wrapper around Firebase Remote Config for feature flags, A/B testing,
 * and dynamic server-side configuration.
 *
 * All config values are accessed via typed properties that read from the
 * in-memory cache (fast, synchronous). Config is fetched and activated
 * asynchronously on app startup.
 *
 * To update values: change them in the Firebase Console → Remote Config.
 * Values are fetched at most every [MIN_FETCH_INTERVAL] seconds.
 */
@Singleton
class RemoteConfigManager @Inject constructor(
    private val remoteConfig: FirebaseRemoteConfig,
) {

    init {
        val configSettings = remoteConfigSettings {
            minimumFetchIntervalInSeconds = MIN_FETCH_INTERVAL
        }
        remoteConfig.setConfigSettingsAsync(configSettings)
        remoteConfig.setDefaultsAsync(com.aeroxebee.client.R.xml.remote_config_defaults)
    }

    // ─── Feature Flags ───────────────────────────────────────

    /** Whether MQTT connection is enabled (kill switch for MQTT). */
    val mqttEnabled: Boolean
        get() = getBoolean("mqtt_enabled")

    /** Whether SMS retry from Room queue is enabled. */
    val smsRetryEnabled: Boolean
        get() = getBoolean("sms_retry_enabled")

    /** Whether push notifications (FCM) are enabled. */
    val pushNotificationsEnabled: Boolean
        get() = getBoolean("push_notifications_enabled")

    /** Whether onboarding flow is required on first launch. */
    val onboardingRequired: Boolean
        get() = getBoolean("onboarding_required")

    /** Whether the app is in maintenance mode (shows maintenance screen). */
    val maintenanceMode: Boolean
        get() = getBoolean("maintenance_mode")

    // ─── A/B Testing ─────────────────────────────────────────

    /** Maximum number of SMS message parts allowed. */
    val maxSmsParts: Int
        get() = getLong("max_sms_parts").toInt()

    /** Heartbeat ping interval in milliseconds. */
    val heartbeatIntervalMs: Long
        get() = getLong("heartbeat_interval_ms")

    /** SMS retry processor interval in milliseconds. */
    val retryIntervalMs: Long
        get() = getLong("retry_interval_ms")

    // ─── Dynamic Configuration ────────────────────────────────

    /** Minimum app version code required. If current < this, force update. */
    val minAppVersionCode: Long
        get() = getLong("min_app_version_code")

    /** Custom force-update message shown to users on old versions. */
    val forceUpdateMessage: String
        get() = getString("force_update_message")

    /** Support email shown in settings and error screens. */
    val supportEmail: String
        get() = getString("support_email")

    // ─── Fetch & Activate ─────────────────────────────────────

    /**
     * Fetch and activate Remote Config values.
     * Call once on app startup. Values are cached in memory after activation.
     * On failure, falls back to defaults (already loaded via setDefaultsAsync).
     */
    fun fetchAndActivate(onComplete: ((Boolean) -> Unit)? = null) {
        remoteConfig.fetchAndActivate()
            .addOnCompleteListener { task ->
                val updated = task.isSuccessful
                if (updated) {
                    Log.i(TAG, "Remote Config fetched and activated")
                } else {
                    Log.w(TAG, "Remote Config fetch failed, using defaults/cached values")
                }
                onComplete?.invoke(updated)
            }
    }

    // ─── Helpers ──────────────────────────────────────────────

    private fun getBoolean(key: String): Boolean {
        return try {
            remoteConfig.getBoolean(key)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to read boolean config: $key", e)
            false
        }
    }

    private fun getLong(key: String): Long {
        return try {
            remoteConfig.getLong(key)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to read long config: $key", e)
            0L
        }
    }

    private fun getString(key: String): String {
        return try {
            remoteConfig.getString(key)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to read string config: $key", e)
            ""
        }
    }

    companion object {
        private const val TAG = "RemoteConfigManager"
        private const val MIN_FETCH_INTERVAL = 3600L // 1 hour
    }
}
