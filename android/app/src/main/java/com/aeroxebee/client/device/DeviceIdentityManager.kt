package com.aeroxebee.client.device

import android.content.Context
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import com.aeroxebee.client.util.TokenManager
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeviceIdentityManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: AeroXeBeeApi,
    private val tokenManager: TokenManager,
) {
    private val integrityManager: IntegrityManager by lazy { IntegrityManager(context) }
    private val registrar: DeviceRegistrar by lazy {
        DeviceRegistrar(context, api, tokenManager, integrityManager)
    }

    val fingerprintHash: String
        get() = FingerprintHasher.hashRaw(context)

    val fingerprint: DeviceFingerprint
        get() = FingerprintBuilder.build(context)

    val androidId: String
        get() = DeviceIdProvider.getAndroidId(context)

    val uuid: String
        get() = LocalUuidStore.getOrCreate(context)

    val hasKeystoreKey: Boolean
        get() = KeystoreManager.hasKey()

    val publicKey: String?
        get() = KeystoreManager.getPublicKeyBase64()

    fun ensureKeystoreKey() {
        KeystoreManager.generateKeyIfNeeded()
    }

    suspend fun registerIdentity(): Result<com.aeroxebee.client.data.remote.model.DeviceIdentityResponse> {
        return registrar.register()
    }

    fun isIdentityRegistered(): Boolean {
        return registrar.isRegistered()
    }

    fun getStoredFingerprint(): String? {
        return registrar.getStoredFingerprint()
    }

    fun signPayload(data: String): String {
        ensureKeystoreKey()
        return KeystoreManager.sign(data)
    }

    suspend fun requestIntegrityToken(nonce: String): String? {
        return integrityManager.requestIntegrityTokenSuspend(nonce)
    }
}
