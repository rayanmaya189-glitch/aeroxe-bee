package com.aeroxebee.client.worker

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import com.aeroxebee.client.util.ExactAlarmHandler
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WatchdogScheduler @Inject constructor(
    @ApplicationContext private val context: Context,
    private val exactAlarmHandler: ExactAlarmHandler,
) {
    private val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    fun schedule() {
        val intent = Intent(context, WatchdogReceiver::class.java).apply {
            action = WatchdogReceiver.ACTION_WATCHDOG_CHECK
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context, WatchdogReceiver.REQUEST_CODE, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val triggerAt = SystemClock.elapsedRealtime() + WatchdogReceiver.INTERVAL_MS

        if (exactAlarmHandler.canScheduleExactAlarms()) {
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                triggerAt,
                pendingIntent,
            )
        } else {
            alarmManager.setInexactRepeating(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                triggerAt,
                WatchdogReceiver.INTERVAL_MS,
                pendingIntent,
            )
        }
    }

    fun cancel() {
        val intent = Intent(context, WatchdogReceiver::class.java).apply {
            action = WatchdogReceiver.ACTION_WATCHDOG_CHECK
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context, WatchdogReceiver.REQUEST_CODE, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        alarmManager.cancel(pendingIntent)
    }
}
