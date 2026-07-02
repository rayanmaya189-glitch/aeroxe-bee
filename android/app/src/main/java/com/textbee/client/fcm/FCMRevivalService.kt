@file:Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
package com.textbee.client.fcm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.textbee.client.TextBeeApplication
import com.textbee.client.worker.SMSSendingService

class FCMRevivalService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        Log.d(TAG, "New FCM token: $token")
    }

    override fun onMessageReceived(message: RemoteMessage) {
        Log.d(TAG, "FCM message received: ${message.data}")

        when (message.data["action"]) {
            ACTION_REVIVE -> {
                showRevivalNotification()
                SMSSendingService.start(this)
            }
            ACTION_PING -> {
                SMSSendingService.start(this)
            }
            ACTION_SYNC -> {
                SMSSendingService.start(this)
            }
            else -> {
                if (message.data.isNotEmpty()) {
                    SMSSendingService.start(this)
                }
            }
        }
    }

    private fun showRevivalNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_FCM_REVIVAL, "Service Revival",
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Notifications from server-triggered app revival"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(this, CHANNEL_FCM_REVIVAL)
            .setContentTitle("AeroXe Bee")
            .setContentText("Server-triggered revival")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(NOTIFICATION_ID_REVIVAL, notification)
    }

    companion object {
        private const val TAG = "FCMRevivalService"
        private const val ACTION_REVIVE = "revive"
        private const val ACTION_PING = "ping"
        private const val ACTION_SYNC = "sync"
        private const val CHANNEL_FCM_REVIVAL = "textbee_fcm_revival"
        private const val NOTIFICATION_ID_REVIVAL = 2001
    }
}
