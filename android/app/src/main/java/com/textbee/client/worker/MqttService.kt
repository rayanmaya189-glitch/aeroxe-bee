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
    private var deviceId: String = ""
    private var heartbeatJob: Job? = null

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIFICATION_ID, createNotification())

        deviceId = tokenManager.getDeviceId() ?: ""
        val brokerUrl = tokenManager.getMqttBrokerUrl()

        if (brokerUrl.isNullOrBlank() || deviceId.isBlank()) {
            stopSelf()
            return
        }

        val username = tokenManager.getMqttUsername()
        val password = tokenManager.getMqttPassword()
        val clientId = "textbee_android_$deviceId"
        mqttManager.connect(brokerUrl, clientId, username, password)

        mqttManager.subscribe("devices/$deviceId/commands")
        mqttManager.subscribe("devices/$deviceId/pong")

        scope.launch {
            mqttManager.messages.collect { payload ->
                processMqttMessage(payload)
            }
        }

        startHeartbeat()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        heartbeatJob?.cancel()
        scope.cancel()
        mqttManager.destroy()
        super.onDestroy()
    }

    private fun startHeartbeat() {
        heartbeatJob = scope.launch {
            while (isActive) {
                mqttManager.publish(
                    "devices/$deviceId/ping",
                    """{"device_id":"$deviceId","action":"ping","timestamp":${System.currentTimeMillis()}}"""
                )
                delay(HEARTBEAT_INTERVAL_MS)
            }
        }
    }

    private fun processMqttMessage(payload: String) {
        try {
            val json = gson.fromJson(payload, Map::class.java) as? Map<String, Any> ?: return
            val action = json["action"] as? String ?: return

            when (action) {
                "send_sms" -> {
                    val cmd = gson.fromJson(payload, SMSCommand::class.java)
                    if (cmd.id.isBlank()) return

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
                        val result = smsEngine.send(task)
                        val isSuccess = result == SMSTask.Status.SENT || result == SMSTask.Status.DELIVERED
                        mqttManager.publish(
                            "devices/$deviceId/status",
                            gson.toJson(
                                StatusUpdateRequest(
                                    messageId = cmd.id,
                                    deviceId = deviceId,
                                    status = if (isSuccess) "SENT" else "FAILED",
                                    deliveryStatus = if (isSuccess) "SENT" else "FAILED",
                                    confidenceScore = if (isSuccess) 1.0 else 0.0,
                                    error = if (isSuccess) null else "sms_send_failed",
                                    simSlot = 0,
                                    timestamp = System.currentTimeMillis(),
                                )
                            )
                        )
                    }
                }
                "pong" -> {
                    val deviceIdFromPayload = json["device_id"] as? String
                    if (deviceIdFromPayload == deviceId) {
                        mqttManager.publish(
                            "devices/$deviceId/ack",
                            """{"device_id":"$deviceId","action":"ack","timestamp":${System.currentTimeMillis()}}"""
                        )
                    }
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("MqttService", "Failed to process MQTT message", e)
        }
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
        private const val HEARTBEAT_INTERVAL_MS = 30_000L

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
