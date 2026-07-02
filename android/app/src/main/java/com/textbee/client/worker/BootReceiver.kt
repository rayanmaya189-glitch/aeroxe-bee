package com.textbee.client.worker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.textbee.client.util.ExactAlarmHandler
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class BootReceiver : BroadcastReceiver() {
    @Inject lateinit var exactAlarmHandler: ExactAlarmHandler
    @Inject lateinit var watchdogScheduler: WatchdogScheduler

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            TaskPollingWorker.schedule(context)
            JobSchedulerFallback.schedule(context)
            watchdogScheduler.schedule()
        }
    }
}
