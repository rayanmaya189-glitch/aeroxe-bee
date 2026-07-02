package com.textbee.client

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class TextBeeApplication : Application(), Configuration.Provider {

    @Inject lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
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
        }
    }

    companion object {
        const val CHANNEL_SMS = "textbee_sms_service"
    }
}
