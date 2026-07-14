package com.aeroxebee.client.sms

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.SmsManager
import com.aeroxebee.client.data.remote.mqtt.MqttManager
import com.aeroxebee.client.data.remote.model.StatusUpdateRequest
import com.aeroxebee.client.data.repository.SMSTaskRepository
import com.aeroxebee.client.util.TokenManager
import com.google.gson.Gson
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class SMSDeliveryReceiver : BroadcastReceiver() {
    @Inject lateinit var repository: SMSTaskRepository
    @Inject lateinit var mqttManager: MqttManager
    @Inject lateinit var tokenManager: TokenManager

    private val gson = Gson()

    override fun onReceive(context: Context, intent: Intent) {
        val taskId = intent.getStringExtra("task_id") ?: return
        val simSlot = intent.getIntExtra("sim_slot", 0)
        val resultCode = resultCode
        val action = intent.action

        CoroutineScope(Dispatchers.IO).launch {
            val deviceId = tokenManager.getDeviceId() ?: ""

            when {
                resultCode != android.app.Activity.RESULT_OK -> {
                    val errorMsg = when (resultCode) {
                        SmsManager.RESULT_ERROR_GENERIC_FAILURE -> "Generic failure"
                        SmsManager.RESULT_ERROR_NO_SERVICE -> "No service"
                        SmsManager.RESULT_ERROR_NULL_PDU -> "Null PDU"
                        SmsManager.RESULT_ERROR_RADIO_OFF -> "Radio off"
                        else -> "Unknown error"
                    }
                    repository.markFailed(taskId, 0, errorMsg)
                    repository.updateRemoteStatus(taskId, "", "FAILED", errorMsg)
                }
                action == "com.aeroxebee.client.SMS_DELIVERED" -> {
                    repository.markDelivered(taskId)
                    repository.addLog(taskId, "DELIVERED", "Carrier delivery confirmed")
                    if (deviceId.isNotBlank()) {
                        mqttManager.publish(
                            "devices/$deviceId/status",
                            gson.toJson(
                        StatusUpdateRequest(
                            messageId = taskId,
                            deviceId = deviceId,
                            status = "DELIVERED",
                            deliveryStatus = "DELIVERED",
                            confidenceScore = 1.0,
                            simSlot = simSlot,
                            timestamp = System.currentTimeMillis(),
                        )
                            )
                        )
                    }
                }
                else -> {
                    repository.markSent(taskId)
                    repository.addLog(taskId, "SENT", "Sent to carrier")
                }
            }
        }
    }
}

object PendingIntentHolder {
    private const val REQUEST_CODE_SENT = 1000
    private const val REQUEST_CODE_DELIVERED = 2000

    fun createSentIntent(context: Context, taskId: String, simSlot: Int = 0): PendingIntent {
        val intent = Intent(context, SMSDeliveryReceiver::class.java).apply {
            action = "com.aeroxebee.client.SMS_SENT"
            putExtra("task_id", taskId)
            putExtra("sim_slot", simSlot)
        }
        return PendingIntent.getBroadcast(
            context, REQUEST_CODE_SENT + taskId.hashCode(),
            intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    fun createDeliveryIntent(context: Context, taskId: String, simSlot: Int = 0): PendingIntent {
        val intent = Intent(context, SMSDeliveryReceiver::class.java).apply {
            action = "com.aeroxebee.client.SMS_DELIVERED"
            putExtra("task_id", taskId)
            putExtra("sim_slot", simSlot)
        }
        return PendingIntent.getBroadcast(
            context, REQUEST_CODE_DELIVERED + taskId.hashCode(),
            intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
