package com.aeroxebee.client.worker

import android.app.job.JobInfo
import android.app.job.JobParameters
import android.app.job.JobScheduler
import android.app.job.JobService
import android.content.ComponentName
import android.content.Context
import android.os.Build
import com.aeroxebee.client.util.ExactAlarmHandler
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class JobSchedulerFallback : JobService() {
    @Inject lateinit var exactAlarmHandler: ExactAlarmHandler

    override fun onStartJob(params: JobParameters?): Boolean {
        if (!isServiceRunning(SMSSendingService::class.java.name)) {
            SMSSendingService.start(this)
        }
        if (!isServiceRunning(MqttService::class.java.name)) {
            MqttService.start(this)
        }
        jobFinished(params, false)
        return false
    }

    override fun onStopJob(params: JobParameters?): Boolean = true

    @Suppress("DEPRECATION")
    private fun isServiceRunning(className: String): Boolean {
        val manager = getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
        for (service in manager.getRunningServices(Integer.MAX_VALUE)) {
            if (service.service.className == className && service.started) {
                return true
            }
        }
        return false
    }

    companion object {
        private const val JOB_ID = 4001
        private const val INTERVAL_MS = 15 * 60 * 1000L

        fun schedule(context: Context) {
            val scheduler = context.getSystemService(Context.JOB_SCHEDULER_SERVICE) as JobScheduler
            val component = ComponentName(context, JobSchedulerFallback::class.java)

            val builder = JobInfo.Builder(JOB_ID, component)
                .setPeriodic(INTERVAL_MS)
                .setPersisted(true)
                .setRequiresCharging(false)
                .setRequiresDeviceIdle(false)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                builder.setRequiresBatteryNotLow(false)
            }

            scheduler.schedule(builder.build())
        }

        fun cancel(context: Context) {
            val scheduler = context.getSystemService(Context.JOB_SCHEDULER_SERVICE) as JobScheduler
            scheduler.cancel(JOB_ID)
        }
    }
}
