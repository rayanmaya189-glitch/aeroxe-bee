package com.aeroxebee.client.ui.screens.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aeroxebee.client.analytics.AnalyticsHelper
import com.aeroxebee.client.data.repository.DeviceRepository
import com.aeroxebee.client.fcm.FCMRegistrar
import com.aeroxebee.client.util.TokenManager
import com.aeroxebee.client.worker.MqttService
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
    val email: String = "",
    val password: String = "",
    val isOnline: Boolean = false,
    val isLoading: Boolean = false,
    val saved: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    @ApplicationContext private val appContext: android.content.Context,
    private val tokenManager: TokenManager,
    private val deviceRepository: DeviceRepository,
    private val fcmRegistrar: FCMRegistrar,
    private val analytics: AnalyticsHelper,
) : ViewModel() {

    private val _state = MutableStateFlow(SettingsState())
    val state: StateFlow<SettingsState> = _state.asStateFlow()

    init {
        _state.update {
            it.copy(
                serverUrl = tokenManager.getServerUrl() ?: "",
                email = tokenManager.getAccountEmail() ?: "",
                password = tokenManager.getAccountPassword() ?: "",
            )
        }
    }

    fun save(serverUrl: String, email: String, password: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            tokenManager.saveServerUrl(serverUrl.trimEnd('/'))
            tokenManager.saveAccountEmail(email.trim())
            tokenManager.saveAccountPassword(password)
            try {
                deviceRepository.loginDevice(
                    email = email.trim(),
                    password = password,
                    simSlot = tokenManager.getSimSlot(),
                )
                MqttService.start(appContext)
                fcmRegistrar.registerToken()
                analytics.logSettingsSaved()
                _state.update { it.copy(isLoading = false, saved = true, error = null) }
            } catch (e: Exception) {
                analytics.logLoginFailed("settings_reconnect", e.message ?: "unknown")
                _state.update { it.copy(isLoading = false, saved = false, error = e.message ?: "Login failed") }
            }
        }
    }

    fun clearSaved() {
        _state.update { it.copy(saved = false) }
    }
}
