package com.aeroxebee.client.ui.screens.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import com.aeroxebee.client.data.remote.model.ChangePasswordRequest
import com.aeroxebee.client.data.remote.model.errorMessage
import com.aeroxebee.client.device.behavior.BehaviorEventManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChangePasswordState(
    val oldPassword: String = "",
    val newPassword: String = "",
    val confirmPassword: String = "",
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class ChangePasswordViewModel @Inject constructor(
    private val api: AeroXeBeeApi,
    private val behaviorEventManager: BehaviorEventManager,
) : ViewModel() {

    private val _state = MutableStateFlow(ChangePasswordState())
    val state: StateFlow<ChangePasswordState> = _state.asStateFlow()

    fun updateOldPassword(value: String) {
        _state.update { it.copy(oldPassword = value, error = null) }
    }

    fun updateNewPassword(value: String) {
        _state.update { it.copy(newPassword = value, error = null) }
    }

    fun updateConfirmPassword(value: String) {
        _state.update { it.copy(confirmPassword = value, error = null) }
    }

    fun changePassword() {
        val s = _state.value
        if (s.oldPassword.isBlank() || s.newPassword.isBlank()) {
            _state.update { it.copy(error = "All fields are required") }
            return
        }
        if (s.newPassword != s.confirmPassword) {
            _state.update { it.copy(error = "New passwords do not match") }
            return
        }
        if (s.newPassword.length < 8) {
            _state.update { it.copy(error = "New password must be at least 8 characters") }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val response = api.changePassword(ChangePasswordRequest(s.oldPassword, s.newPassword))
                if (response.isSuccessful && response.body()?.success == true) {
                    behaviorEventManager.report("password_reset", "Password changed")
                    _state.update { it.copy(isLoading = false, isSuccess = true) }
                } else {
                    _state.update { it.copy(isLoading = false, error = response.errorMessage("Failed to change password")) }
                }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.message ?: "Network error") }
            }
        }
    }

    fun reset() {
        _state.value = ChangePasswordState()
    }
}
