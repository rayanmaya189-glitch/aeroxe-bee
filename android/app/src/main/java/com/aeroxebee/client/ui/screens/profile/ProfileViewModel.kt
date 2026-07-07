package com.aeroxebee.client.ui.screens.profile

import android.content.Context
import android.content.Intent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
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
    val isLoading: Boolean = false,
    val isLoggedOut: Boolean = false,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val tokenManager: TokenManager,
) : ViewModel() {

    private val _state = MutableStateFlow(
        ProfileState(
            email = tokenManager.getAccountEmail() ?: "",
            name = tokenManager.getAccountName() ?: "",
            accountId = tokenManager.getAccountId() ?: "",
        )
    )
    val state: StateFlow<ProfileState> = _state.asStateFlow()

    fun logout() {
        _state.value = _state.value.copy(isLoading = true)
        viewModelScope.launch {
            context.stopService(Intent(context, MqttService::class.java))
            tokenManager.clear()
            _state.value = _state.value.copy(isLoading = false, isLoggedOut = true)
        }
    }
}
