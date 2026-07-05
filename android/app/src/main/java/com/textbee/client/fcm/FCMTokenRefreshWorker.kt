package com.textbee.client.fcm

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

/**
 * Periodic worker that refreshes the FCM registration token monthly.
 *
 * Per Firebase best practices for legacy registration tokens:
 * "Add app logic to retrieve the current token using the appropriate API call
 * and then send the current token to your app server for storage (with a timestamp).
 * This could be a monthly job configured to cover all clients or tokens."
 *
 * This worker calls FCMRegistrar.registerToken() which:
 * 1. Fetches the current FCM token from Firebase
 * 2. Saves it locally in TokenManager
 * 3. Sends it to the backend via POST /api/v1/auth/fcm-token
 *
 * The backend updates last_seen_at on every registration, keeping the token
 * fresh and preventing stale token accumulation (tokens inactive >30 days
 * are pruned by the backend background job).
 */
@HiltWorker
class FCMTokenRefreshWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val fcmRegistrar: FCMRegistrar,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            Log.i(TAG, "Monthly FCM token refresh starting")
            // RegisterToken handles everything: fetches current token, saves locally,
            // and sends to backend. It's best-effort so failures don't block the worker.
            fcmRegistrar.registerToken()
            Log.i(TAG, "Monthly FCM token refresh completed")
            Result.success()
        } catch (e: Exception) {
            Log.w(TAG, "Monthly FCM token refresh failed: ${e.message}")
            // Retry once on failure, then give up (periodic will try again next month)
            if (runAttemptCount < 2) Result.retry() else Result.failure()
        }
    }

    companion object {
        private const val TAG = "FCMTokenRefreshWorker"
        private const val WORK_NAME = "fcm_token_monthly_refresh"

        // 30 days in milliseconds — matches Firebase's staleness threshold
        private val REFRESH_INTERVAL_MS = 30L * 24 * 60 * 60 * 1000

        /**
         * Schedule the monthly FCM token refresh.
         * Safe to call multiple times — uses ExistingPeriodicWorkPolicy.KEEP
         * to avoid duplicate workers.
         *
         * Should be called from:
         * - TextBeeApplication.onCreate() to ensure it's always scheduled
         * - After successful device login to start the refresh cycle
         */
        fun schedule(context: Context) {
            val refreshRequest = PeriodicWorkRequestBuilder<FCMTokenRefreshWorker>(
                REFRESH_INTERVAL_MS, TimeUnit.MILLISECONDS
            )
                .setInitialDelay(REFRESH_INTERVAL_MS, TimeUnit.MILLISECONDS) // First refresh in 30 days
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP, // Don't replace if already scheduled
                refreshRequest,
            )

            Log.i(TAG, "Monthly FCM token refresh scheduled (interval: 30 days)")
        }

        /**
         * Cancel the scheduled monthly refresh.
         * Useful when the user logs out.
         */
        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
            Log.i(TAG, "Monthly FCM token refresh cancelled")
        }
    }
}
