package com.textbee.client.data.local.dao

import androidx.room.*
import com.textbee.client.data.local.entity.SMSTaskEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SMSTaskDao {
    @Query("SELECT * FROM sms_tasks ORDER BY createdAt DESC")
    fun getAllTasks(): Flow<List<SMSTaskEntity>>

    @Query("SELECT * FROM sms_tasks WHERE id = :id")
    suspend fun getTaskById(id: String): SMSTaskEntity?

    @Query("SELECT * FROM sms_tasks WHERE status = :status ORDER BY createdAt ASC LIMIT 1")
    suspend fun getNextPendingTask(status: String): SMSTaskEntity?

    @Query("SELECT * FROM sms_tasks WHERE status = :status ORDER BY createdAt ASC")
    fun getTasksByStatus(status: String): Flow<List<SMSTaskEntity>>

    @Query("SELECT COUNT(*) FROM sms_tasks WHERE status = :status")
    fun countByStatus(status: String): Flow<Long>

    @Query("SELECT COUNT(*) FROM sms_tasks WHERE createdAt >= :since AND status = 'SENT'")
    fun countSentToday(since: Long): Flow<Long>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(task: SMSTaskEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(tasks: List<SMSTaskEntity>)

    @Query("UPDATE sms_tasks SET status = :status, sentAt = :sentAt WHERE id = :id")
    suspend fun markSent(id: String, status: String, sentAt: Long)

    @Query("UPDATE sms_tasks SET status = :status, deliveredAt = :deliveredAt WHERE id = :id")
    suspend fun markDelivered(id: String, status: String, deliveredAt: Long)

    @Query("UPDATE sms_tasks SET status = :status, retryCount = :retryCount, errorMessage = :errorMessage WHERE id = :id")
    suspend fun markFailed(id: String, status: String, retryCount: Int, errorMessage: String?)

    @Query("DELETE FROM sms_tasks WHERE id = :id")
    suspend fun delete(id: String)

    @Query("DELETE FROM sms_tasks WHERE status = 'DELIVERED' AND createdAt < :before")
    suspend fun deleteOldDelivered(before: Long)

    @Query("SELECT * FROM sms_tasks WHERE status IN ('FAILED', 'DEAD_LETTER') ORDER BY createdAt DESC")
    fun getFailedTasks(): Flow<List<SMSTaskEntity>>

    @Query("SELECT * FROM sms_tasks WHERE status = 'PENDING' ORDER BY CASE priority WHEN 'HIGH' THEN 0 WHEN 'NORMAL' THEN 1 ELSE 2 END, createdAt ASC")
    suspend fun getNextQueued(): SMSTaskEntity?

    @Query("SELECT * FROM sms_tasks WHERE status = 'FAILED' AND retryCount < maxRetries ORDER BY createdAt ASC LIMIT 5")
    suspend fun getRetryableTasks(): List<SMSTaskEntity>
}
