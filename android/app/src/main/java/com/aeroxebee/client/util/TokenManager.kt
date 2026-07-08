@file:Suppress("DEPRECATION")
package com.aeroxebee.client.util

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
        "aeroxebee_secure_prefs",
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

    // Account credentials for device login
    fun saveAccountEmail(email: String) = prefs.edit().putString(KEY_ACCOUNT_EMAIL, email).apply()
    fun getAccountEmail(): String? = prefs.getString(KEY_ACCOUNT_EMAIL, null)

    fun saveAccountPassword(password: String) = prefs.edit().putString(KEY_ACCOUNT_PASSWORD, password).apply()
    fun getAccountPassword(): String? = prefs.getString(KEY_ACCOUNT_PASSWORD, null)

    fun saveAccountName(name: String) = prefs.edit().putString(KEY_ACCOUNT_NAME, name).apply()
    fun getAccountName(): String? = prefs.getString(KEY_ACCOUNT_NAME, null)

    fun saveAccountId(id: String) = prefs.edit().putString(KEY_ACCOUNT_ID, id).apply()
    fun getAccountId(): String? = prefs.getString(KEY_ACCOUNT_ID, null)

    // MQTT connection details
    fun saveMqttBrokerUrl(url: String) = prefs.edit().putString(KEY_MQTT_BROKER_URL, url).apply()
    fun getMqttBrokerUrl(): String? = prefs.getString(KEY_MQTT_BROKER_URL, null)

    fun saveMqttUsername(username: String) = prefs.edit().putString(KEY_MQTT_USERNAME, username).apply()
    fun getMqttUsername(): String? = prefs.getString(KEY_MQTT_USERNAME, null)

    fun saveMqttPassword(password: String) = prefs.edit().putString(KEY_MQTT_PASSWORD, password).apply()
    fun getMqttPassword(): String? = prefs.getString(KEY_MQTT_PASSWORD, null)

//    fun saveMqttCredentialId(id: String) = prefs.edit().putString(KEY_MQTT_CREDENTIAL_ID, id).apply()
//    fun getMqttCredentialId(): String? = prefs.getString(KEY_MQTT_CREDENTIAL_ID, null)

    fun clear() = prefs.edit().clear().apply()

    fun saveSimSlot(slot: Int) = prefs.edit().putInt(KEY_SIM_SLOT, slot).apply()
    fun getSimSlot(): Int = prefs.getInt(KEY_SIM_SLOT, 0)

    // FCM token for push notifications
    fun saveFCMToken(token: String) = prefs.edit().putString(KEY_FCM_TOKEN, token).apply()
    fun getFCMToken(): String? = prefs.getString(KEY_FCM_TOKEN, null)

    fun saveDeviceName(name: String) = prefs.edit().putString(KEY_DEVICE_NAME, name).apply()
    fun getDeviceName(): String? = prefs.getString(KEY_DEVICE_NAME, null)

    // Device identity (fingerprint) stored after successful registration
    fun saveDeviceFingerprint(hash: String) = prefs.edit().putString(KEY_DEVICE_FINGERPRINT, hash).apply()
    fun getDeviceFingerprint(): String? = prefs.getString(KEY_DEVICE_FINGERPRINT, null)

    fun saveDeviceIdentityRegistered(registered: Boolean) = prefs.edit().putBoolean(KEY_DEVICE_IDENTITY_REGISTERED, registered).apply()
    fun isDeviceIdentityRegistered(): Boolean = prefs.getBoolean(KEY_DEVICE_IDENTITY_REGISTERED, false)

    companion object {
        private const val KEY_TOKEN = "auth_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_API_KEY = "api_key"
        private const val KEY_REGISTERED = "registered"
        private const val KEY_SIM_SLOT = "sim_slot"
        private const val KEY_MQTT_BROKER_URL = "mqtt_broker_url"
        private const val KEY_MQTT_USERNAME = "mqtt_username"
        private const val KEY_MQTT_PASSWORD = "mqtt_password"
        private const val KEY_MQTT_CREDENTIAL_ID = "mqtt_credential_id"
        private const val KEY_ACCOUNT_EMAIL = "account_email"
        private const val KEY_ACCOUNT_PASSWORD = "account_password"
        private const val KEY_ACCOUNT_NAME = "account_name"
        private const val KEY_ACCOUNT_ID = "account_id"
        private const val KEY_FCM_TOKEN = "fcm_token"
        private const val KEY_DEVICE_NAME = "device_name"
        private const val KEY_DEVICE_FINGERPRINT = "device_fingerprint"
        private const val KEY_DEVICE_IDENTITY_REGISTERED = "device_identity_registered"
    }
}
