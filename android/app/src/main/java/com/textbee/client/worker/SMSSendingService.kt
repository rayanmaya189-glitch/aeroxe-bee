package com.textbee.client.worker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.textbee.client.R
import com.textbee.client.TextBeeApplication
import com.textbee.client.data.remote.mqtt.MqttManager
import com.textbee.client.data.remote.model.StatusUpdateRequest
import com.textbee.client.data.repository.SMSTaskRepository
import com.textbee.client.domain.model.SMSTask
import com.textbee.client.sms.SMSEngine
import com.textbee.client.util.TokenManager
import com.google.gson.Gson
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import javax.inject.Inject

@AndroidEntryPoint
class SMSSendingService : Service() {
    @Inject lateinit var repository: SMSTaskRepository
    @Inject lateinit var smsEngine: SMSEngine
    @Inject lateinit var mqttManager: MqttManager
    @Inject lateinit var tokenManager: TokenManager

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val gson = Gson()
    private var job: Job? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        job = scope.launch {
            processPendingTasks()
            stopSelf()
        }
        return START_STICKY
    }

    private suspend fun processPendingTasks() {
        val deviceId = tokenManager.getDeviceId() ?: ""
        while (true) {
            val task = repository.getNextPending() ?: break
            val result = smsEngine.send(task)
            if (deviceId.isNotBlank() && task.id.isNotBlank()) {
                val isSuccess = result == SMSTask.Status.SENT || result == SMSTask.Status.DELIVERED
                mqttManager.publish(
                    "devices/$deviceId/status",
                    gson.toJson(
                        StatusUpdateRequest(
                            messageId = task.id,
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
            delay(200)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        job?.cancel()
        scope.cancel()
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                TextBeeApplication.CHANNEL_SMS, "SMS Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply { description = "Background SMS sending" }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, TextBeeApplication.CHANNEL_SMS)
            .setContentTitle("AeroXe Bee")
            .setContentText("Sending SMS…")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    companion object {
        private const val NOTIFICATION_ID = 1001

        fun start(context: Context) {
            val intent = Intent(context, SMSSendingService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }
}
