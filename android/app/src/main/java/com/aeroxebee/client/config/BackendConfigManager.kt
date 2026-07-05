package com.aeroxebee.client.config

import android.content.Context
import android.util.Log
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Fetches and caches Firebase Remote Config values from the backend's
 * /api/v1/firebase-config public endpoint. This allows admins to change
 * feature flags and settings via the web portal without going through
 * Firebase Console.
 *
 * Config is fetched on app startup and periodically refreshed.
 * Values are cached in SharedPreferences for offline fallback.
 */
@Singleton
class BackendConfigManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: AeroXeBeeApi,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val prefs = context.getSharedPreferences("backend_config", Context.MODE_PRIVATE)

    private val _isLoaded = MutableStateFlow(false)
    val isLoaded: StateFlow<Boolean> = _isLoaded.asStateFlow()

    private val config = ConcurrentHashMap<String, Any>()

    init {
        loadCachedConfig()
    }

    // ─── Feature Flags ───────────────────────────────────────

    /** Whether MQTT connection is enabled (backend kill switch). */
    val mqttEnabled: Boolean get() = getBoolean("mqtt_enabled", true)

    /** Whether SMS retry from Room queue is enabled. */
    val smsRetryEnabled: Boolean get() = getBoolean("sms_retry_enabled", true)

    /** Whether push notifications (FCM) are enabled. */
    val pushNotificationsEnabled: Boolean get() = getBoolean("push_notifications_enabled", true)

    /** Whether onboarding flow is required on first launch. */
    val onboardingRequired: Boolean get() = getBoolean("onboarding_required", true)

    /** Whether the app is in maintenance mode. */
    val maintenanceMode: Boolean get() = getBoolean("maintenance_mode", false)

    /** Whether the QR scanner is available for device pairing. */
    val qrScannerEnabled: Boolean get() = getBoolean("qr_scanner_enabled", true)

    // ─── Update Settings ─────────────────────────────────────

    /** Whether in-app updates are enabled. */
    val inAppUpdateEnabled: Boolean get() = getBoolean("in_app_update_enabled", true)

    /** Minimum app version code required for force updates. */
    val minAppVersionCode: Int get() = getInt("min_app_version_code", 0)

    /** Custom force-update message. */
    val forceUpdateMessage: String get() = getString("force_update_message", "")

    // ─── General Settings ────────────────────────────────────

    /** Support email shown in settings and error screens. */
    val supportEmail: String get() = getString("support_email", "support@aeroxe.com")

    /** Maximum number of SMS message parts allowed. */
    val maxSmsParts: Int get() = getInt("max_sms_parts", 10)

    /** Heartbeat ping interval in milliseconds. */
    val heartbeatIntervalMs: Long get() = getLong("heartbeat_interval_ms", 300_000L)

    /** SMS retry processor interval in milliseconds. */
    val retryIntervalMs: Long get() = getLong("retry_interval_ms", 60_000L)

    // ─── MQTT Settings ───────────────────────────────────────

    /** MQTT keep-alive interval in seconds. */
    val mqttKeepAliveSeconds: Int get() = getInt("mqtt_keep_alive_seconds", 60)

    /** MQTT reconnect delay in milliseconds. */
    val mqttReconnectDelayMs: Long get() = getLong("mqtt_reconnect_delay_ms", 5_000L)

    // ─── Fetch & Cache ───────────────────────────────────────

    /**
     * Fetch config from the backend API and cache locally.
     * Call on app startup. Falls back to cached values on failure.
     */
    fun fetchAndCache(onComplete: ((Boolean) -> Unit)? = null) {
        scope.launch {
            try {
                val response = api.getFirebaseConfig()
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data ?: emptyMap()
                    config.clear()
                    config.putAll(data)  // ConcurrentHashMap — concurrent reads are safe
                    saveCachedConfig(data)
                    _isLoaded.value = true
                    Log.i(TAG, "Backend config fetched: ${data.size} entries")
                    onComplete?.invoke(true)
                } else {
                    Log.w(TAG, "Backend config fetch failed: ${response.code()}")
                    onComplete?.invoke(false)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Backend config fetch error", e)
                onComplete?.invoke(false)
            }
        }
    }

    /**
     * Get a config value by key, with a fallback default.
     */
    fun getValue(key: String, default: Any? = null): Any? {
        return config[key] ?: default
    }

    /**
     * Get all config entries as a read-only map.
     */
    fun getAll(): Map<String, Any> = config.toMap()

    // ─── Helpers ──────────────────────────────────────────────

    private fun getBoolean(key: String, default: Boolean): Boolean {
        val value = config[key]
        return when (value) {
            is Boolean -> value
            is String -> value.equals("true", ignoreCase = true)
            is Number -> value.toInt() != 0
            else -> default
        }
    }

    private fun getInt(key: String, default: Int): Int {
        val value = config[key]
        return when (value) {
            is Number -> value.toInt()
            is String -> value.toIntOrNull() ?: default
            else -> default
        }
    }

    private fun getLong(key: String, default: Long): Long {
        val value = config[key]
        return when (value) {
            is Number -> value.toLong()
            is String -> value.toLongOrNull() ?: default
            else -> default
        }
    }

    private fun getString(key: String, default: String): String {
        val value = config[key]
        return when (value) {
            is String -> value
            is Number -> value.toString()
            is Boolean -> value.toString()
            else -> default
        }
    }

    // ─── Persistence ──────────────────────────────────────────

    private fun saveCachedConfig(data: Map<String, Any>) {
        val editor = prefs.edit()
        editor.clear()
        for ((key, value) in data) {
            when (value) {
                is Boolean -> editor.putBoolean(key, value)
                is Int -> editor.putInt(key, value)
                is Long -> editor.putLong(key, value)
                is Float -> editor.putFloat(key, value)
                is String -> editor.putString(key, value)
                else -> editor.putString(key, value.toString())
            }
        }
        editor.apply()
    }

    private fun loadCachedConfig() {
        config.clear()
        for ((key, value) in prefs.all) {
            config[key] = value ?: continue
        }
        if (config.isNotEmpty()) {
            Log.d(TAG, "Loaded ${config.size} cached config entries")
        }
    }

    companion object {
        private const val TAG = "BackendConfigManager"
    }
}
