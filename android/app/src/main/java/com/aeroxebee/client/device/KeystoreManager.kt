package com.aeroxebee.client.device

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.PublicKey
import java.security.Signature

object KeystoreManager {
    private const val KEY_ALIAS = "aeroxe_device_key"
    private const val KEYSTORE_TYPE = "AndroidKeyStore"
    private const val SIGNATURE_ALGORITHM = "SHA256withRSA"

    fun generateKeyIfNeeded() {
        val keyStore = KeyStore.getInstance(KEYSTORE_TYPE).apply { load(null) }

        if (!keyStore.containsAlias(KEY_ALIAS)) {
            val keyGenerator = KeyPairGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_RSA,
                KEYSTORE_TYPE,
            )

            val spec = KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY,
            )
                .setDigests(KeyProperties.DIGEST_SHA256)
                .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1)
                .setKeySize(2048)
                .setUserAuthenticationRequired(false)
                .build()

            keyGenerator.initialize(spec)
            keyGenerator.generateKeyPair()
        }
    }

    fun sign(data: String): String {
        val keyStore = KeyStore.getInstance(KEYSTORE_TYPE).apply { load(null) }
        val privateKey = keyStore.getKey(KEY_ALIAS, null) as PrivateKey

        val signature = Signature.getInstance(SIGNATURE_ALGORITHM)
        signature.initSign(privateKey)
        signature.update(data.toByteArray())

        return Base64.encodeToString(signature.sign(), Base64.NO_WRAP)
    }

    fun getPublicKey(): PublicKey? {
        return try {
            val keyStore = KeyStore.getInstance(KEYSTORE_TYPE).apply { load(null) }
            keyStore.getCertificate(KEY_ALIAS)?.publicKey
        } catch (_: Exception) {
            null
        }
    }

    fun getPublicKeyBase64(): String? {
        return try {
            val pubKey = getPublicKey() ?: return null
            Base64.encodeToString(pubKey.encoded, Base64.NO_WRAP)
        } catch (_: Exception) {
            null
        }
    }

    fun hasKey(): Boolean {
        return try {
            val keyStore = KeyStore.getInstance(KEYSTORE_TYPE).apply { load(null) }
            keyStore.containsAlias(KEY_ALIAS)
        } catch (_: Exception) {
            false
        }
    }
}
