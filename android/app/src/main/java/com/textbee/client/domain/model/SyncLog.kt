package com.textbee.client.domain.model

data class SyncLog(
    val id: Long = 0,
    val taskId: String,
    val event: String,
    val message: String? = null,
    val timestamp: Long = System.currentTimeMillis(),
)
