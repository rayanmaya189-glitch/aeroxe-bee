package com.textbee.client.ui.screens.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.textbee.client.data.repository.DeviceRepository
import com.textbee.client.util.TokenManager
import com.textbee.client.worker.MqttService
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SettingsState(
    val serverUrl: String = "",
    val apiKey: String = "",
    val isOnline: Boolean = false,
    val isLoading: Boolean = false,
    val saved: Boolean = false,
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    @ApplicationContext private val appContext: android.content.Context,
    private val tokenManager: TokenManager,
    private val deviceRepository: DeviceRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(SettingsState())
    val state: StateFlow<SettingsState> = _state.asStateFlow()

    init {
        _state.update {
            it.copy(
                serverUrl = tokenManager.getServerUrl() ?: "",
                apiKey = tokenManager.getApiKey() ?: "",
            )
        }
    }

    fun save(serverUrl: String, apiKey: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            tokenManager.saveServerUrl(serverUrl.trimEnd('/'))
            tokenManager.saveApiKey(apiKey.trim())
            try {
                deviceRepository.registerDevice(apiKey.trim())
                MqttService.start(appContext)
                _state.update { it.copy(isLoading = false, saved = true) }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, saved = false) }
            }
        }
    }

    fun clearSaved() {
        _state.update { it.copy(saved = false) }
    }
}
