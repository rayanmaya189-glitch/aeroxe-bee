package com.aeroxebee.client.device.intelligence

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.util.concurrent.TimeUnit

@HiltWorker
class DeviceIntelligenceWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val intelligenceManager: DeviceIntelligenceManager,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            Log.i(TAG, "Periodic device intelligence report starting")
            val result = intelligenceManager.report()
            if (result.isSuccess) {
                Log.i(TAG, "Device intelligence report sent successfully")
                Result.success()
            } else {
                Log.w(TAG, "Device intelligence report failed: ${result.exceptionOrNull()?.message}")
                if (runAttemptCount < 2) Result.retry() else Result.failure()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Device intelligence report failed: ${e.message}")
            if (runAttemptCount < 2) Result.retry() else Result.failure()
        }
    }

    companion object {
        private const val TAG = "DeviceIntelligenceWorker"
        private const val WORK_NAME = "device_intelligence_daily_report"

        private val REPORT_INTERVAL_HOURS = 24L

        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<DeviceIntelligenceWorker>(
                REPORT_INTERVAL_HOURS, TimeUnit.HOURS
            )
                .setInitialDelay(REPORT_INTERVAL_HOURS, TimeUnit.HOURS)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )

            Log.i(TAG, "Daily device intelligence report scheduled (interval: 24h)")
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
            Log.i(TAG, "Daily device intelligence report cancelled")
        }
    }
}
