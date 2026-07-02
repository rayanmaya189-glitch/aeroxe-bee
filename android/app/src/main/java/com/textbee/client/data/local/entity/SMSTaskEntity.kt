package com.textbee.client.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.textbee.client.domain.model.SMSTask

@Entity(tableName = "sms_tasks")
data class SMSTaskEntity(
    @PrimaryKey val id: String,
    val accountId: String,
    val recipient: String,
    val message: String,
    val priority: String,
    val status: String,
    val simSlot: Int = 0,
    val retryCount: Int = 0,
    val maxRetries: Int = 3,
    val createdAt: Long,
    val sentAt: Long? = null,
    val deliveredAt: Long? = null,
    val errorMessage: String? = null,
)

fun SMSTaskEntity.toDomain() = SMSTask(
    id = id, accountId = accountId, recipient = recipient, message = message,
    priority = SMSTask.Priority.valueOf(priority), status = SMSTask.Status.valueOf(status),
    simSlot = simSlot, retryCount = retryCount, maxRetries = maxRetries,
    createdAt = createdAt, sentAt = sentAt, deliveredAt = deliveredAt,
    errorMessage = errorMessage,
)

fun SMSTask.toEntity() = SMSTaskEntity(
    id = id, accountId = accountId, recipient = recipient, message = message,
    priority = priority.name, status = status.name,
    simSlot = simSlot, retryCount = retryCount, maxRetries = maxRetries,
    createdAt = createdAt, sentAt = sentAt, deliveredAt = deliveredAt,
    errorMessage = errorMessage,
)
