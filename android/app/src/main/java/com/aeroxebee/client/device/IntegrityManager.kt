package com.aeroxebee.client.device

import android.content.Context
import android.util.Log
import com.google.android.gms.tasks.Tasks
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.IntegrityTokenRequest
import java.util.concurrent.TimeUnit

class IntegrityManager(private val context: Context) {

    companion object {
        private const val TAG = "IntegrityManager"
        private const val TIMEOUT_SECONDS = 30L
    }

    fun requestIntegrityToken(nonce: String): String? {
        return try {
            val manager = IntegrityManagerFactory.create(context)
            val request = IntegrityTokenRequest.builder()
                .setNonce(nonce)
                .build()

            val task = manager.requestIntegrityToken(request)
            val response = Tasks.await(task, TIMEOUT_SECONDS, TimeUnit.SECONDS)
            response.token()
        } catch (e: Exception) {
            Log.w(TAG, "Play Integrity request failed: ${e.message}")
            null
        }
    }

    suspend fun requestIntegrityTokenSuspend(nonce: String): String? {
        return requestIntegrityToken(nonce)
    }
}
