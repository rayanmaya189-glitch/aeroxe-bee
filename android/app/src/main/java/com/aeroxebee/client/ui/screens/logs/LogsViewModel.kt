package com.aeroxebee.client.ui.screens.logs

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aeroxebee.client.data.repository.SMSTaskRepository
import com.aeroxebee.client.domain.model.SyncLog
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LogsUiState(
    val logs: List<SyncLog> = emptyList(),
    val isLoading: Boolean = true,
)

@HiltViewModel
class LogsViewModel @Inject constructor(
    private val repository: SMSTaskRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(LogsUiState())
    val state: StateFlow<LogsUiState> = _state.asStateFlow()

    init {
        loadLogs()
    }

    fun loadLogs() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            val logs = repository.getAllLogs()
            _state.value = LogsUiState(logs = logs, isLoading = false)
        }
    }
}
