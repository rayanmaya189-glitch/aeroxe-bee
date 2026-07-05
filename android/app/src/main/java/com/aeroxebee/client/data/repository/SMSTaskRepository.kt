package com.aeroxebee.client.data.repository

import com.aeroxebee.client.data.local.dao.SMSTaskDao
import com.aeroxebee.client.data.local.dao.SyncLogDao
import com.aeroxebee.client.data.local.entity.SyncLogEntity
import com.aeroxebee.client.data.local.entity.toDomain
import com.aeroxebee.client.data.local.entity.toEntity
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import com.aeroxebee.client.data.remote.model.*
import com.aeroxebee.client.domain.model.SMSTask
import com.aeroxebee.client.domain.model.Stats
import com.aeroxebee.client.domain.model.SyncLog
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SMSTaskRepository @Inject constructor(
    private val smsTaskDao: SMSTaskDao,
    private val syncLogDao: SyncLogDao,
    private val api: AeroXeBeeApi,
) {
    fun getAllTasks(): Flow<List<SMSTask>> = smsTaskDao.getAllTasks().map { entities ->
        entities.map { it.toDomain() }
    }

    fun getFailedTasks(): Flow<List<SMSTask>> = smsTaskDao.getFailedTasks().map { entities ->
        entities.map { it.toDomain() }
    }

    fun getTasksByStatus(status: SMSTask.Status): Flow<List<SMSTask>> =
        smsTaskDao.getTasksByStatus(status.name).map { entities ->
            entities.map { it.toDomain() }
        }

    fun countByStatus(status: SMSTask.Status): Flow<Long> = smsTaskDao.countByStatus(status.name)

    fun countSentToday(since: Long): Flow<Long> = smsTaskDao.countSentToday(since)

    suspend fun getNextPending(): SMSTask? = smsTaskDao.getNextQueued()?.toDomain()

    suspend fun getRetryableTasks(): List<SMSTask> = smsTaskDao.getRetryableTasks().map { it.toDomain() }

    suspend fun saveTask(task: SMSTask) = smsTaskDao.upsert(task.toEntity())

    suspend fun saveTasks(tasks: List<SMSTask>) = smsTaskDao.upsertAll(tasks.map { it.toEntity() })

    suspend fun markSent(id: String) = smsTaskDao.markSent(id, SMSTask.Status.SENT.name, System.currentTimeMillis())

    suspend fun markDelivered(id: String) =
        smsTaskDao.markDelivered(id, SMSTask.Status.DELIVERED.name, System.currentTimeMillis())

    suspend fun markFailed(id: String, retryCount: Int, error: String?) {
        val status = if (retryCount >= 3) SMSTask.Status.DEAD_LETTER.name else SMSTask.Status.FAILED.name
        smsTaskDao.markFailed(id, status, retryCount, error)
    }

    suspend fun updateRemoteStatus(
        messageId: String, deviceId: String, status: String, error: String? = null, simSlot: Int = 0,
    ) {
        val request = StatusUpdateRequest(
            messageId = messageId,
            deviceId = deviceId,
            status = status,
            deliveryStatus = if (status == "FAILED") "FAILED" else "SENT",
            error = error,
            simSlot = simSlot,
        )
        try {
            api.updateStatus(request)
        } catch (_: Exception) {}
    }

    suspend fun addLog(taskId: String, event: String, details: String? = null) {
        syncLogDao.insert(SyncLogEntity(taskId = taskId, event = event, details = details))
    }

    fun getLogsForTask(taskId: String) = syncLogDao.getLogsForTask(taskId)

    fun getRecentLogs() = syncLogDao.getRecentLogs()

    suspend fun countPending(): Int {
        return smsTaskDao.countByStatus(SMSTask.Status.PENDING.name).first().toInt()
    }

    suspend fun getStats(): Stats {
        val sent = smsTaskDao.countByStatus(SMSTask.Status.SENT.name).first()
        val delivered = smsTaskDao.countByStatus(SMSTask.Status.DELIVERED.name).first()
        val failed = smsTaskDao.countByStatus(SMSTask.Status.FAILED.name).first()
        val deadLetter = smsTaskDao.countByStatus(SMSTask.Status.DEAD_LETTER.name).first()
        val totalFailed = failed + deadLetter
        val total = sent + delivered + totalFailed
        val today = smsTaskDao.countSentToday(System.currentTimeMillis() - 86400000L).first()
        return Stats(
            totalSent = sent + delivered,
            totalFailed = totalFailed,
            messagesToday = today,
            successRate = if (total > 0) (sent + delivered).toDouble() / total else 0.0,
            totalDelivered = delivered,
            isConnected = false,
            total = total,
            failed = totalFailed,
            sent = sent + delivered,
        )
    }

    suspend fun getAllLogs(): List<SyncLog> {
        return syncLogDao.getRecentLogs().first().map { it.toDomain() }
    }

    suspend fun cleanup() {
        val weekAgo = System.currentTimeMillis() - 7 * 24 * 60 * 60 * 1000
        smsTaskDao.deleteOldDelivered(weekAgo)
        syncLogDao.deleteOld(weekAgo)
    }
}
