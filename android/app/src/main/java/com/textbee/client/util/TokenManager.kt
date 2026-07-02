package com.textbee.client.util

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenManager @Inject constructor(
    @ApplicationContext context: Context,
) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "textbee_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    fun saveToken(token: String) = prefs.edit().putString(KEY_TOKEN, token).apply()

    fun getToken(): String? = prefs.getString(KEY_TOKEN, null)

    fun saveRefreshToken(token: String) = prefs.edit().putString(KEY_REFRESH_TOKEN, token).apply()

    fun getRefreshToken(): String? = prefs.getString(KEY_REFRESH_TOKEN, null)

    fun saveDeviceId(deviceId: String) = prefs.edit().putString(KEY_DEVICE_ID, deviceId).apply()

    fun getDeviceId(): String? = prefs.getString(KEY_DEVICE_ID, null)

    fun saveRegistered(registered: Boolean) = prefs.edit().putBoolean(KEY_REGISTERED, registered).apply()

    fun isRegistered(): Boolean = prefs.getBoolean(KEY_REGISTERED, false)

    fun saveServerUrl(url: String) = prefs.edit().putString(KEY_SERVER_URL, url).apply()

    fun getServerUrl(): String? = prefs.getString(KEY_SERVER_URL, null)

    fun saveApiKey(key: String) = prefs.edit().putString(KEY_API_KEY, key).apply()

    fun getApiKey(): String? = prefs.getString(KEY_API_KEY, null)

    fun saveMqttBrokerUrl(url: String) = prefs.edit().putString(KEY_MQTT_BROKER_URL, url).apply()
    fun getMqttBrokerUrl(): String? = prefs.getString(KEY_MQTT_BROKER_URL, null)

    fun saveMqttUsername(username: String) = prefs.edit().putString(KEY_MQTT_USERNAME, username).apply()
    fun getMqttUsername(): String? = prefs.getString(KEY_MQTT_USERNAME, null)

    fun saveMqttPassword(password: String) = prefs.edit().putString(KEY_MQTT_PASSWORD, password).apply()
    fun getMqttPassword(): String? = prefs.getString(KEY_MQTT_PASSWORD, null)

    fun saveMqttCredentialId(id: String) = prefs.edit().putString(KEY_MQTT_CREDENTIAL_ID, id).apply()
    fun getMqttCredentialId(): String? = prefs.getString(KEY_MQTT_CREDENTIAL_ID, null)

    fun clear() = prefs.edit().clear().apply()

    companion object {
        private const val KEY_TOKEN = "auth_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_API_KEY = "api_key"
        private const val KEY_REGISTERED = "registered"
        private const val KEY_MQTT_BROKER_URL = "mqtt_broker_url"
        private const val KEY_MQTT_USERNAME = "mqtt_username"
        private const val KEY_MQTT_PASSWORD = "mqtt_password"
        private const val KEY_MQTT_CREDENTIAL_ID = "mqtt_credential_id"
    }
}
