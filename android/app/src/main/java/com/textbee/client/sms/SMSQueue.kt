package com.textbee.client.sms

import com.textbee.client.domain.model.SMSTask
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SMSQueue @Inject constructor(
    private val smsEngine: SMSEngine,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO + Job())
    private val _isProcessing = MutableStateFlow(false)
    val isProcessing: StateFlow<Boolean> = _isProcessing

    private val _processedCount = MutableStateFlow(0)
    val processedCount: StateFlow<Int> = _processedCount

    private val _failedCount = MutableStateFlow(0)
    val failedCount: StateFlow<Int> = _failedCount

    private var pendingTasks = mutableListOf<SMSTask>()
    private var isRunning = false

    fun enqueue(task: SMSTask) {
        pendingTasks.add(task)
        if (!isRunning) processQueue()
    }

    fun enqueueAll(tasks: List<SMSTask>) {
        pendingTasks.addAll(tasks)
        if (!isRunning) processQueue()
    }

    private fun processQueue() {
        isRunning = true
        _isProcessing.value = true

        scope.launch {
            while (pendingTasks.isNotEmpty()) {
                val task = pendingTasks.removeAt(0)

                val result = smsEngine.send(task)
                if (result == SMSTask.Status.SENT) {
                    _processedCount.value = _processedCount.value + 1
                } else {
                    _failedCount.value = _failedCount.value + 1
                }

                delay(100)
            }

            isRunning = false
            _isProcessing.value = false
        }
    }

    fun destroy() {
        scope.cancel()
    }
}
