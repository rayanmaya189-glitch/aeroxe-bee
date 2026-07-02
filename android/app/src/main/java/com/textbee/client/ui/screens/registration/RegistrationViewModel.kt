package com.textbee.client.ui.screens.registration

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.textbee.client.data.repository.DeviceRepository
import com.textbee.client.util.TokenManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class RegistrationState(
    val serverUrl: String = "http://10.0.2.2:8080",
    val apiKey: String = "",
    val isLoading: Boolean = false,
    val isRegistered: Boolean = false,
    val error: String? = null,
    val serverUrlError: String? = null,
)

@HiltViewModel
class RegistrationViewModel @Inject constructor(
    private val tokenManager: TokenManager,
    private val deviceRepository: DeviceRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(RegistrationState())
    val state: StateFlow<RegistrationState> = _state.asStateFlow()

    fun onServerUrlChange(url: String) {
        _state.update { it.copy(serverUrl = url, serverUrlError = null, error = null) }
    }

    fun onApiKeyChange(key: String) {
        _state.update { it.copy(apiKey = key, error = null) }
    }

    fun register() {
        val s = _state.value

        if (s.serverUrl.isBlank()) {
            _state.update { it.copy(serverUrlError = "Server URL is required") }
            return
        }

        _state.update { it.copy(isLoading = true, error = null) }

        viewModelScope.launch {
            tokenManager.saveServerUrl(s.serverUrl.trimEnd('/'))
            tokenManager.saveApiKey(s.apiKey.trim())

            try {
                deviceRepository.registerDevice()
                _state.update { it.copy(isLoading = false, isRegistered = true) }
            } catch (e: Exception) {
                _state.update {
                    it.copy(
                        isLoading = false,
                        error = "Registration failed: ${e.message}",
                    )
                }
            }
        }
    }
}
