package com.textbee.client.worker

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import com.textbee.client.util.ExactAlarmHandler
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class WatchdogReceiver : BroadcastReceiver() {
    @Inject lateinit var exactAlarmHandler: ExactAlarmHandler

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_WATCHDOG_CHECK) return
        if (!isServiceRunning(context, SMSSendingService::class.java.name)) {
            SMSSendingService.start(context)
        }
        if (!isServiceRunning(context, MqttService::class.java.name)) {
            MqttService.start(context)
        }
    }

    private fun isServiceRunning(context: Context, className: String): Boolean {
        val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
        for (service in manager.getRunningServices(Integer.MAX_VALUE)) {
            if (service.service.className == className) {
                return service.started
            }
        }
        return false
    }

    companion object {
        const val ACTION_WATCHDOG_CHECK = "com.textbee.client.WATCHDOG_CHECK"
        const val REQUEST_CODE = 3001
        const val INTERVAL_MS = 10 * 60 * 1000L
    }
}
