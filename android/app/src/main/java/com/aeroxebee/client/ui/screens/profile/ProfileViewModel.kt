package com.aeroxebee.client.ui.screens.profile

import android.content.Context
import android.content.Intent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import com.aeroxebee.client.data.remote.model.UpdateDeviceNameRequest
import com.aeroxebee.client.util.TokenManager
import com.aeroxebee.client.worker.MqttService
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileState(
    val email: String = "",
    val name: String = "",
    val accountId: String = "",
    val deviceName: String = "",
    val isLoading: Boolean = false,
    val isSavingName: Boolean = false,
    val isLoggedOut: Boolean = false,
    val nameSaved: Boolean = false,
    val nameError: String? = null,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val tokenManager: TokenManager,
    private val api: AeroXeBeeApi,
) : ViewModel() {

    private val _state = MutableStateFlow(
        ProfileState(
            email = tokenManager.getAccountEmail() ?: "",
            name = tokenManager.getAccountName() ?: "",
            accountId = tokenManager.getAccountId() ?: "",
            deviceName = tokenManager.getDeviceName() ?: android.os.Build.MODEL,
        )
    )
    val state: StateFlow<ProfileState> = _state.asStateFlow()

    fun updateDeviceName(name: String) {
        _state.value = _state.value.copy(deviceName = name)
    }

    fun saveDeviceName() {
        val name = _state.value.deviceName.trim()
        if (name.isBlank()) return

        viewModelScope.launch {
            _state.value = _state.value.copy(isSavingName = true, nameSaved = false, nameError = null)
            try {
                val deviceId = tokenManager.getDeviceId()
                if (deviceId != null) {
                    api.updateMemberDevice(deviceId, UpdateDeviceNameRequest(name))
                }
                tokenManager.saveDeviceName(name)
                _state.value = _state.value.copy(isSavingName = false, nameSaved = true, nameError = null)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    isSavingName = false,
                    nameSaved = false,
                    nameError = e.message ?: "Failed to save",
                )
            }
        }
    }

    fun logout() {
        _state.value = _state.value.copy(isLoading = true)
        viewModelScope.launch {
            context.stopService(Intent(context, MqttService::class.java))
            tokenManager.clear()
            _state.value = _state.value.copy(isLoading = false, isLoggedOut = true)
        }
    }
}
