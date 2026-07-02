package com.textbee.client.worker

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.textbee.client.MainActivity
import com.textbee.client.R
import com.textbee.client.data.remote.mqtt.MqttManager
import com.textbee.client.data.remote.model.SMSCommand
import com.textbee.client.data.remote.model.StatusUpdateRequest
import com.textbee.client.domain.model.SMSTask
import com.textbee.client.sms.SMSEngine
import com.textbee.client.util.TokenManager
import com.google.gson.Gson
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import javax.inject.Inject

@AndroidEntryPoint
class MqttService : Service() {

    @Inject lateinit var mqttManager: MqttManager
    @Inject lateinit var tokenManager: TokenManager
    @Inject lateinit var smsEngine: SMSEngine

    private val gson = Gson()

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIFICATION_ID, createNotification())

        val brokerUrl = tokenManager.getMqttBrokerUrl()
        val username = tokenManager.getMqttUsername()
        val password = tokenManager.getMqttPassword()
        val deviceId = tokenManager.getDeviceId()

        if (brokerUrl == null || deviceId == null) {
            stopSelf()
            return
        }

        val clientId = "textbee_android_$deviceId"
        mqttManager.connect(brokerUrl, clientId, username, password)

        mqttManager.subscribe("devices/$deviceId/commands")
        mqttManager.subscribe("devices/$deviceId/ping")

        scope.launch {
            mqttManager.messages.collect { payload ->
                processMqttMessage(payload, deviceId)
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        scope.cancel()
        mqttManager.destroy()
        super.onDestroy()
    }

    private fun processMqttMessage(payload: String, deviceId: String) {
        try {
            val json = gson.fromJson(payload, Map::class.java) as Map<String, Any>
            val action = json["action"] as? String ?: return

            when (action) {
                "send_sms" -> {
                    val cmd = gson.fromJson(payload, SMSCommand::class.java)
                    scope.launch {
                        val task = SMSTask(
                            id = cmd.id,
                            accountId = cmd.accountId,
                            recipient = cmd.recipient,
                            message = cmd.message,
                            priority = try {
                                SMSTask.Priority.valueOf(cmd.priority)
                            } catch (_: Exception) { SMSTask.Priority.NORMAL },
                            status = SMSTask.Status.PENDING,
                        )
                        smsEngine.send(task)
                    }
                    mqttManager.publish(
                        "devices/$deviceId/status",
                        gson.toJson(StatusUpdateRequest(
                            messageId = cmd.id,
                            deviceId = deviceId,
                            status = "SENT",
                            deliveryStatus = "SENT",
                            confidenceScore = 1.0,
                        ))
                    )
                }
                "ping" -> {
                    mqttManager.publish(
                        "devices/$deviceId/pong",
                        """{"device_id":"$deviceId","timestamp":${System.currentTimeMillis()}}"""
                    )
                }
            }
        } catch (_: Exception) {}
    }

    private fun createNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL_MQTT)
            .setContentTitle("TextBee MQTT")
            .setContentText("Connected to message broker")
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val NOTIFICATION_ID = 1002
        const val CHANNEL_MQTT = "textbee_mqtt_service"

        fun start(context: Context) {
            val intent = Intent(context, MqttService::class.java)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }
}
