package com.textbee.client.sms

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.SmsManager
import com.textbee.client.data.repository.SMSTaskRepository
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class SMSDeliveryReceiver : BroadcastReceiver() {
    @Inject lateinit var repository: SMSTaskRepository

    override fun onReceive(context: Context, intent: Intent) {
        val taskId = intent.getStringExtra("task_id") ?: return
        val resultCode = resultCode

        CoroutineScope(Dispatchers.IO).launch {
            when (resultCode) {
                SmsManager.RESULT_ERROR_GENERIC_FAILURE -> {
                    repository.markFailed(taskId, 0, "Generic failure")
                    repository.updateRemoteStatus(taskId, "", "FAILED", "Generic failure")
                }
                SmsManager.RESULT_ERROR_NO_SERVICE -> {
                    repository.markFailed(taskId, 0, "No service")
                    repository.updateRemoteStatus(taskId, "", "FAILED", "No service")
                }
                SmsManager.RESULT_ERROR_NULL_PDU -> {
                    repository.markFailed(taskId, 0, "Null PDU")
                    repository.updateRemoteStatus(taskId, "", "FAILED", "Null PDU")
                }
                SmsManager.RESULT_ERROR_RADIO_OFF -> {
                    repository.markFailed(taskId, 0, "Radio off")
                    repository.updateRemoteStatus(taskId, "", "FAILED", "Radio off")
                }
                android.app.Activity.RESULT_OK -> {
                    repository.markSent(taskId)
                    repository.addLog(taskId, "SENT", "Delivery confirmed")
                    repository.updateRemoteStatus(taskId, "", "SENT")
                }
            }
        }
    }
}

object PendingIntentHolder {
    private const val REQUEST_CODE_SENT = 1000
    private const val REQUEST_CODE_DELIVERED = 2000

    fun createSentIntent(context: Context, taskId: String): PendingIntent {
        val intent = Intent(context, SMSDeliveryReceiver::class.java).apply {
            action = "com.textbee.client.SMS_SENT"
            putExtra("task_id", taskId)
        }
        return PendingIntent.getBroadcast(
            context, REQUEST_CODE_SENT + taskId.hashCode(),
            intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    fun createDeliveryIntent(context: Context, taskId: String): PendingIntent {
        val intent = Intent(context, SMSDeliveryReceiver::class.java).apply {
            action = "com.textbee.client.SMS_DELIVERED"
            putExtra("task_id", taskId)
        }
        return PendingIntent.getBroadcast(
            context, REQUEST_CODE_DELIVERED + taskId.hashCode(),
            intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
