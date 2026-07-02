package com.textbee.client

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.os.Build
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.textbee.client.worker.JobSchedulerFallback
import com.textbee.client.worker.WatchdogScheduler
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class TextBeeApplication : Application(), Configuration.Provider {

    @Inject lateinit var workerFactory: HiltWorkerFactory
    @Inject lateinit var watchdogScheduler: WatchdogScheduler

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
        startWatchdog()
        startJobSchedulerFallback()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(NotificationManager::class.java)

            val smsChannel = NotificationChannel(
                CHANNEL_SMS,
                "SMS Service",
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = "Notifications for SMS sending service"
            }
            manager.createNotificationChannel(smsChannel)

            val revivalChannel = NotificationChannel(
                CHANNEL_FCM_REVIVAL,
                "Service Revival",
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Server-triggered app revival notifications"
            }
            manager.createNotificationChannel(revivalChannel)

            val mqttChannel = NotificationChannel(
                CHANNEL_MQTT,
                "MQTT Service",
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = "Notifications for MQTT message broker service"
            }
            manager.createNotificationChannel(mqttChannel)
        }
    }

    private fun startWatchdog() {
        watchdogScheduler.schedule()
    }

    private fun startJobSchedulerFallback() {
        JobSchedulerFallback.schedule(this)
    }

    companion object {
        const val CHANNEL_SMS = "textbee_sms_service"
        const val CHANNEL_FCM_REVIVAL = "textbee_fcm_revival"
        const val CHANNEL_MQTT = "textbee_mqtt_service"
    }
}
