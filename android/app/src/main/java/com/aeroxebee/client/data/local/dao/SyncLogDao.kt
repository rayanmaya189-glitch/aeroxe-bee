package com.aeroxebee.client.data.local.dao

import androidx.room.*
import com.aeroxebee.client.data.local.entity.SyncLogEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SyncLogDao {
    @Query("SELECT * FROM sync_logs ORDER BY timestamp DESC LIMIT 100")
    fun getRecentLogs(): Flow<List<SyncLogEntity>>

    @Query("SELECT * FROM sync_logs WHERE taskId = :taskId ORDER BY timestamp DESC")
    fun getLogsForTask(taskId: String): Flow<List<SyncLogEntity>>

    @Insert
    suspend fun insert(log: SyncLogEntity)

    @Query("DELETE FROM sync_logs WHERE timestamp < :before")
    suspend fun deleteOld(before: Long)
}
