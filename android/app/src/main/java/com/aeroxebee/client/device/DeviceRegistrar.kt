package com.aeroxebee.client.device

import android.content.Context
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import com.aeroxebee.client.data.remote.model.DeviceIdentityRequest
import com.aeroxebee.client.data.remote.model.DeviceIdentityResponse
import com.aeroxebee.client.util.TokenManager

class DeviceRegistrar(
    private val context: Context,
    private val api: AeroXeBeeApi,
    private val tokenManager: TokenManager,
    private val integrityManager: IntegrityManager,
) {
    suspend fun register(): Result<DeviceIdentityResponse> {
        return try {
            KeystoreManager.generateKeyIfNeeded()

            val fingerprint = FingerprintBuilder.build(context)
            val hash = FingerprintHasher.hash(fingerprint)
            val signature = KeystoreManager.sign(hash)
            val publicKey = KeystoreManager.getPublicKeyBase64()
            val integrityToken = integrityManager.requestIntegrityTokenSuspend(hash)

            val request = DeviceIdentityRequest(
                fingerprintHash = hash,
                signature = signature,
                publicKey = publicKey ?: "",
                integrityToken = integrityToken,
                androidId = fingerprint.androidId,
                uuid = fingerprint.uuid,
                model = fingerprint.model,
                brand = fingerprint.brand,
                manufacturer = fingerprint.manufacturer,
                osVersion = fingerprint.osVersion,
                sdkLevel = fingerprint.sdkLevel,
                carrier = fingerprint.sim["carrier"] ?: "unknown",
                simCountry = fingerprint.sim["country"] ?: "unknown",
                simOperator = fingerprint.sim["sim_operator"] ?: "unknown",
                installTime = fingerprint.installTime,
            )

            val response = api.registerDeviceIdentity(request)
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    tokenManager.saveDeviceFingerprint(hash)
                    tokenManager.saveDeviceIdentityRegistered(true)
                    Result.success(data)
                } else {
                    Result.failure(Exception("Empty response data"))
                }
            } else {
                val errorBody = response.errorBody()?.string() ?: response.message()
                Result.failure(Exception("Registration failed: $errorBody"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun isRegistered(): Boolean {
        return tokenManager.isDeviceIdentityRegistered()
    }

    fun getStoredFingerprint(): String? {
        return tokenManager.getDeviceFingerprint()
    }
}
