package com.textbee.client.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.textbee.client.data.repository.SMSTaskRepository
import com.textbee.client.sms.SMSEngine
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

@HiltWorker
class TaskPollingWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val repository: SMSTaskRepository,
    private val smsEngine: SMSEngine,
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        return try {
            val deviceId = runCatching {
                com.textbee.client.util.TokenManager(applicationContext).getDeviceId() ?: return Result.retry()
            }.getOrNull() ?: return Result.retry()

            val tasks = repository.fetchRemoteTasks(deviceId)
            for (task in tasks) {
                smsEngine.send(task)
            }

            Result.success()
        } catch (e: Exception) {
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }

    companion object {
        private const val WORK_NAME = "task_polling"

        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = PeriodicWorkRequestBuilder<TaskPollingWorker>(15, java.util.concurrent.TimeUnit.MINUTES)
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, java.util.concurrent.TimeUnit.MINUTES)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME, ExistingPeriodicWorkPolicy.KEEP, request,
            )
        }
    }
}
