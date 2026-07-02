package com.textbee.client.domain.model

data class SMSTask(
    val id: String,
    val accountId: String,
    val recipient: String,
    val message: String,
    val priority: Priority,
    val status: Status,
    val simSlot: Int = 0,
    val retryCount: Int = 0,
    val maxRetries: Int = 3,
    val createdAt: Long = System.currentTimeMillis(),
    val sentAt: Long? = null,
    val deliveredAt: Long? = null,
    val errorMessage: String? = null,
) {
    enum class Priority { HIGH, NORMAL, LOW }
    enum class Status {
        PENDING, SENDING, SENT, DELIVERED, FAILED, EXPIRED, DEAD_LETTER
    }
}
