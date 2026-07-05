package com.aeroxebee.client

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.util.Log
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.aeroxebee.client.fcm.FCMTokenRefreshWorker
import com.aeroxebee.client.worker.JobSchedulerFallback
import com.aeroxebee.client.worker.WatchdogScheduler
import com.google.firebase.crashlytics.ktx.crashlytics
import com.google.firebase.ktx.Firebase
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class AeroXeBeeApplication : Application(), Configuration.Provider {

    @Inject lateinit var workerFactory: HiltWorkerFactory
    @Inject lateinit var watchdogScheduler: WatchdogScheduler

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    override fun onCreate() {
        super.onCreate()
        setupCrashlytics()
        createNotificationChannels()
        startWatchdog()
        startJobSchedulerFallback()
        scheduleFCMTokenRefresh()
    }

    private fun setupCrashlytics() {
        // Disable crash collection in debug builds to avoid noise from dev testing
        Firebase.crashlytics.setCrashlyticsCollectionEnabled(!BuildConfig.DEBUG)
        Log.i(TAG, "Firebase Crashlytics enabled: ${!BuildConfig.DEBUG}")
    }

    private fun createNotificationChannels() {
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

    private fun startWatchdog() {
        watchdogScheduler.schedule()
    }

    private fun startJobSchedulerFallback() {
        JobSchedulerFallback.schedule(this)
    }

    private fun scheduleFCMTokenRefresh() {
        FCMTokenRefreshWorker.schedule(this)
    }

    companion object {
        private const val TAG = "AeroXeBeeApplication"
        const val CHANNEL_SMS = "aeroxebee_sms_service"
        const val CHANNEL_FCM_REVIVAL = "aeroxebee_fcm_revival"
        const val CHANNEL_MQTT = "aeroxebee_mqtt_service"
    }
}
