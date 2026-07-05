package com.aeroxebee.client.sms

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import androidx.core.content.ContextCompat
import com.aeroxebee.client.data.local.entity.toEntity
import com.aeroxebee.client.data.repository.SMSTaskRepository
import com.aeroxebee.client.domain.model.SMSTask
import com.aeroxebee.client.util.RateLimiter
import com.aeroxebee.client.util.SimManager
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SMSEngine @Inject constructor(
    @ApplicationContext private val context: Context,
    private val repository: SMSTaskRepository,
    private val rateLimiter: RateLimiter,
    private val simManager: SimManager,
) {
    companion object {
        const val MAX_PARTS = 5
        const val ACTION_SENT = "com.aeroxebee.client.SMS_SENT"
        const val ACTION_DELIVERED = "com.aeroxebee.client.SMS_DELIVERED"
    }

    suspend fun send(task: SMSTask): SMSTask.Status {
        if (!hasSmsPermission()) return SMSTask.Status.FAILED

        val slot = task.simSlot
        if (!rateLimiter.canSend(slot)) {
            repository.addLog(task.id, "RATE_LIMITED", "SIM slot $slot rate limit exceeded")
            return SMSTask.Status.FAILED
        }

        return withContext(Dispatchers.IO) {
            try {
                val smsManager = getSmsManager(slot)
                val message = task.message
                val parts = smsManager.divideMessage(message)

                if (parts.size > MAX_PARTS) {
                    repository.addLog(task.id, "TOO_LONG", "Message exceeds ${MAX_PARTS} parts")
                    return@withContext SMSTask.Status.FAILED
                }

                val sentIntent = PendingIntentHolder.createSentIntent(context, task.id)
                val deliveryIntent = PendingIntentHolder.createDeliveryIntent(context, task.id)

                if (parts.size > 1) {
                    val sentIntents = parts.map { PendingIntentHolder.createSentIntent(context, task.id) }
                    val deliveryIntents = parts.map { PendingIntentHolder.createDeliveryIntent(context, task.id) }
                    smsManager.sendMultipartTextMessage(task.recipient, null, parts, ArrayList(sentIntents), ArrayList(deliveryIntents))
                } else {
                    smsManager.sendTextMessage(task.recipient, null, message, sentIntent, deliveryIntent)
                }

                rateLimiter.recordSend(slot)
                repository.markSent(task.id)
                repository.addLog(task.id, "SENT", "SIM slot $slot")

                SMSTask.Status.SENT
            } catch (e: Exception) {
                val newRetry = task.retryCount + 1
                repository.markFailed(task.id, newRetry, e.message)
                repository.addLog(task.id, "FAILED", e.message)
                SMSTask.Status.FAILED
            }
        }
    }

    private fun getSmsManager(slot: Int): SmsManager {
        val subId = simManager.getDefaultSubscriptionId(slot)
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            context.getSystemService(SmsManager::class.java).createForSubscriptionId(subId)
        } else {
            @Suppress("DEPRECATION")
            SmsManager.getSmsManagerForSubscriptionId(subId)
        }
    }

    private fun hasSmsPermission(): Boolean {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) ==
                PackageManager.PERMISSION_GRANTED
    }
}
