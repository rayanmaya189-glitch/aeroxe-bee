package com.aeroxebee.client.ui.screens.preferences

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import com.aeroxebee.client.data.remote.model.MemberPreferences
import com.aeroxebee.client.data.remote.model.errorMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PreferencesState(
    val preferences: MemberPreferences = MemberPreferences(),
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val saved: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class PreferencesViewModel @Inject constructor(
    private val api: AeroXeBeeApi,
) : ViewModel() {

    private val _state = MutableStateFlow(PreferencesState())
    val state: StateFlow<PreferencesState> = _state.asStateFlow()

    init {
        loadPreferences()
    }

    fun loadPreferences() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val response = api.getMemberPreferences()
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data
                    _state.update { it.copy(preferences = data ?: MemberPreferences(), isLoading = false) }
                } else {
                    _state.update { it.copy(isLoading = false, error = response.errorMessage("Failed to load preferences")) }
                }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.message ?: "Network error") }
            }
        }
    }

    fun setEmailNotifications(enabled: Boolean) {
        _state.update { it.copy(preferences = it.preferences.copy(emailNotifications = enabled)) }
        save()
    }

    fun setSmsNotifications(enabled: Boolean) {
        _state.update { it.copy(preferences = it.preferences.copy(smsNotifications = enabled)) }
        save()
    }

    fun setWebhookNotifications(enabled: Boolean) {
        _state.update { it.copy(preferences = it.preferences.copy(webhookNotifications = enabled)) }
        save()
    }

    fun setBillingAlerts(enabled: Boolean) {
        _state.update { it.copy(preferences = it.preferences.copy(billingAlerts = enabled)) }
        save()
    }

    fun setSecurityAlerts(enabled: Boolean) {
        _state.update { it.copy(preferences = it.preferences.copy(securityAlerts = enabled)) }
        save()
    }

    private fun save() {
        viewModelScope.launch {
            _state.update { it.copy(isSaving = true, saved = false, error = null) }
            try {
                val response = api.updateMemberPreferences(_state.value.preferences)
                if (response.isSuccessful && response.body()?.success == true) {
                    _state.update { it.copy(isSaving = false, saved = true) }
                } else {
                    _state.update { it.copy(isSaving = false, error = response.errorMessage("Failed to save preferences")) }
                }
            } catch (e: Exception) {
                _state.update { it.copy(isSaving = false, error = e.message ?: "Network error") }
            }
        }
    }

    fun clearError() {
        _state.update { it.copy(error = null) }
    }

    fun clearSaved() {
        _state.update { it.copy(saved = false) }
    }
}
