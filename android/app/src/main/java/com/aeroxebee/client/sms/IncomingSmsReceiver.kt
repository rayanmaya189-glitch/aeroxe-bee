package com.aeroxebee.client.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import com.aeroxebee.client.data.remote.mqtt.MqttManager
import com.aeroxebee.client.util.TokenManager
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Captures inbound SMS and forwards them to the backend over the
 * devices/{deviceId}/inbox MQTT topic (two-way SMS). Multi-part messages that
 * arrive in the same broadcast are concatenated per originating address.
 */
@AndroidEntryPoint
class IncomingSmsReceiver : BroadcastReceiver() {
    @Inject lateinit var mqttManager: MqttManager
    @Inject lateinit var tokenManager: TokenManager

    private val gson = Gson()

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
        if (messages.isEmpty()) return

        // Concatenate multi-part message bodies, keyed by originating number.
        val bySender = LinkedHashMap<String, StringBuilder>()
        var recipient = ""
        for (sms in messages) {
            val from = sms.originatingAddress ?: continue
            bySender.getOrPut(from) { StringBuilder() }.append(sms.messageBody ?: "")
            if (recipient.isEmpty()) recipient = sms.serviceCenterAddress ?: ""
        }
        if (bySender.isEmpty()) return

        val deviceId = tokenManager.getDeviceId() ?: return
        if (deviceId.isBlank()) return
        val simSlot = tokenManager.getSimSlot()

        val pending = ArrayDeque<InboundSmsPayload>()
        for ((from, body) in bySender) {
            pending.add(
                InboundSmsPayload(
                    deviceId = deviceId,
                    sender = from,
                    recipient = recipient,
                    body = body.toString(),
                    simSlot = simSlot,
                    timestamp = System.currentTimeMillis(),
                )
            )
        }

        CoroutineScope(Dispatchers.IO).launch {
            for (payload in pending) {
                if (mqttManager.isConnected()) {
                    val ok = mqttManager.publish("devices/$deviceId/inbox", gson.toJson(payload))
                    if (!ok) {
                        Log.w(TAG, "inbound sms publish failed for ${payload.sender}")
                    }
                } else {
                    // MQTT offline: drop with a log. Inbound SMS is best-effort and
                    // the SmsProvider retains the message on-device regardless.
                    Log.w(TAG, "inbound sms dropped (mqtt offline) from ${payload.sender}")
                }
            }
        }
    }

    private data class InboundSmsPayload(
        @SerializedName("device_id") val deviceId: String,
        @SerializedName("sender") val sender: String,
        @SerializedName("recipient") val recipient: String,
        @SerializedName("body") val body: String,
        @SerializedName("sim_slot") val simSlot: Int,
        @SerializedName("timestamp") val timestamp: Long,
    )

    companion object {
        private const val TAG = "IncomingSmsReceiver"
    }
}
