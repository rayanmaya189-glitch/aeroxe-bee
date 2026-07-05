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
import com.textbee.client.data.repository.SMSTaskRepository
import com.textbee.client.domain.model.SMSTask
import com.textbee.client.sms.SMSEngine
import com.textbee.client.util.DeviceStateClassifier
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
    @Inject lateinit var smsRepository: SMSTaskRepository
    @Inject lateinit var deviceStateClassifier: DeviceStateClassifier

    private val gson = Gson()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var deviceId: String = ""
    private var heartbeatJob: Job? = null
    private var connectionMonitorJob: Job? = null
    private var retryJob: Job? = null
    private var isReconnecting = false

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIFICATION_ID, createNotification("Connecting..."))

        deviceId = tokenManager.getDeviceId() ?: ""
        val brokerUrl = tokenManager.getMqttBrokerUrl()

        if (brokerUrl.isNullOrBlank() || deviceId.isBlank()) {
            stopSelf()
            return
        }

        connectAndSubscribe()

        scope.launch {
            mqttManager.messages.collect { payload ->
                processMqttMessage(payload)
            }
        }

        startConnectionMonitor()
        startHeartbeat()
        startRetryProcessor()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun connectAndSubscribe() {
        val brokerUrl = tokenManager.getMqttBrokerUrl() ?: return
        val username = tokenManager.getMqttUsername()
        val password = tokenManager.getMqttPassword()
        val clientId = "textbee_android_$deviceId"

        mqttManager.connect(brokerUrl, clientId, username, password)
        // Subscriptions are tracked by MqttManager and auto-resubscribed on reconnect
        mqttManager.subscribe("devices/$deviceId/commands")
        mqttManager.subscribe("devices/$deviceId/pong")

        isReconnecting = false
        updateNotification("Connected to broker")
    }

    private fun startConnectionMonitor() {
        connectionMonitorJob = scope.launch {
            mqttManager.connectionState.collect { connected ->
                if (!connected && !isReconnecting) {
                    isReconnecting = true
                    updateNotification("Reconnecting...")
                    android.util.Log.w(TAG, "MQTT disconnected, waiting for auto-reconnect...")
                } else if (connected) {
                    isReconnecting = false
                    updateNotification("Connected to broker")
                    android.util.Log.i(TAG, "MQTT reconnected")
                }
            }
        }
    }

    private fun updateNotification(text: String) {
        val pendingIntent = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(this, CHANNEL_MQTT)
            .setContentTitle("AeroXe Bee MQTT")
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
        startForeground(NOTIFICATION_ID, notification)
    }

    override fun onDestroy() {
        connectionMonitorJob?.cancel()
        heartbeatJob?.cancel()
        retryJob?.cancel()
        scope.cancel()
        mqttManager.destroy()
        super.onDestroy()
    }

    /**
     * Heartbeat now includes device_state classification (ACTIVE, DOZE_RISK, OEM_KILL_RISK)
     * so the backend can track device health and background execution risk.
     */
    private fun startHeartbeat() {
        heartbeatJob = scope.launch {
            while (isActive) {
                val deviceState = deviceStateClassifier.classify()
                val payload = gson.toJson(
                    mapOf(
                        "device_id" to deviceId,
                        "action" to "ping",
                        "timestamp" to System.currentTimeMillis(),
                        "device_state" to deviceState,
                    )
                )
                mqttManager.publish("devices/$deviceId/ping", payload)
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
                        val targetSimSlot = if (cmd.simSlot >= 0) cmd.simSlot else tokenManager.getSimSlot()
                        val task = SMSTask(
                            id = cmd.id,
                            accountId = cmd.accountId,
                            recipient = cmd.recipient,
                            message = cmd.message,
                            priority = try {
                                SMSTask.Priority.valueOf(cmd.priority)
                            } catch (_: Exception) { SMSTask.Priority.NORMAL },
                            status = SMSTask.Status.PENDING,
                            simSlot = targetSimSlot,
                        )
                        val result = smsEngine.send(task)
                        val isSuccess = result == SMSTask.Status.SENT || result == SMSTask.Status.DELIVERED
                        if (!isSuccess) {
                            android.util.Log.w(TAG, "SMS send failed for ${cmd.id}, will retry from queue")
                        }
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
                                    simSlot = targetSimSlot,
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

    /**
     * Periodically retry failed/pending SMS tasks from the Room DB queue.
     */
    private fun startRetryProcessor() {
        retryJob = scope.launch {
            while (isActive) {
                delay(RETRY_INTERVAL_MS)
                try {
                    val failedTasks = smsRepository.getRetryableTasks()
                    for (task in failedTasks) {
                        android.util.Log.i(TAG, "Retrying failed SMS: ${task.id} (attempt ${task.retryCount + 1}/${task.maxRetries})")
                        val result = smsEngine.send(task)
                        val isSuccess = result == SMSTask.Status.SENT || result == SMSTask.Status.DELIVERED
                        if (isSuccess) {
                            if (mqttManager.isConnected() && deviceId.isNotBlank()) {
                                mqttManager.publish(
                                    "devices/$deviceId/status",
                                    gson.toJson(
                                        StatusUpdateRequest(
                                            messageId = task.id,
                                            deviceId = deviceId,
                                            status = "SENT",
                                            deliveryStatus = "SENT",
                                            confidenceScore = 1.0,
                                            simSlot = task.simSlot,
                                            timestamp = System.currentTimeMillis(),
                                        )
                                    )
                                )
                            }
                        }
                    }
                } catch (e: Exception) {
                    android.util.Log.e(TAG, "Retry processor error", e)
                }
            }
        }
    }

    private fun createNotification(text: String = "Connected to message broker"): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL_MQTT)
            .setContentTitle("AeroXe Bee MQTT")
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val TAG = "MqttService"
        private const val NOTIFICATION_ID = 1002
        const val CHANNEL_MQTT = "textbee_mqtt_service"
        private const val HEARTBEAT_INTERVAL_MS = 30_000L
        private const val RETRY_INTERVAL_MS = 60_000L

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
