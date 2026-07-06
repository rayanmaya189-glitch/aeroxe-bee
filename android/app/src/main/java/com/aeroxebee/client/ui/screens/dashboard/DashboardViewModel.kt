package com.aeroxebee.client.ui.screens.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aeroxebee.client.data.repository.SMSTaskRepository
import com.aeroxebee.client.domain.model.Stats
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DashboardState(
    val stats: Stats = Stats(),
    val pendingCount: Int = 0,
    val isLoading: Boolean = false,
    val error: String? = null,
    val simSlots: List<Int> = listOf(0, 1),
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val repository: SMSTaskRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(DashboardState())
    val state: StateFlow<DashboardState> = _state.asStateFlow()

    init {
        loadStats()
    }

    fun loadStats() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val pending = repository.countPending()
                val stats = repository.getStats()
                _state.update { it.copy(stats = stats, pendingCount = pending, isLoading = false) }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.message ?: "Failed to load stats") }
            }
        }
    }
}
