package com.textbee.client.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.textbee.client.domain.model.SyncLog

@Entity(tableName = "sync_logs")
data class SyncLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val taskId: String,
    val event: String,
    val details: String? = null,
    val timestamp: Long = System.currentTimeMillis(),
)

fun SyncLogEntity.toDomain() = SyncLog(
    id = id,
    taskId = taskId,
    event = event,
    message = details,
    timestamp = timestamp,
)

fun SyncLog.toEntity() = SyncLogEntity(
    id = id,
    taskId = taskId,
    event = event,
    details = message,
    timestamp = timestamp,
)
