package com.aeroxebee.client.ui.screens.profile

import android.content.Context
import android.content.Intent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import com.aeroxebee.client.data.remote.model.UpdateDeviceNameRequest
import com.aeroxebee.client.data.remote.model.Verify2FARequest
import com.aeroxebee.client.device.behavior.BehaviorEventManager
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
    // Account / Plan info
    val planName: String = "",
    val accountStatus: String = "",
    val dailyUsage: Long = 0,
    val monthlyUsage: Long = 0,
    // 2FA
    val twoFAEnabled: Boolean = false,
    val isLoading2FA: Boolean = false,
    val show2FASetup: Boolean = false,
    val twoFASetupSecret: String = "",
    val twoFASetupUrl: String = "",
    val verifyCode: String = "",
    val twoFAError: String? = null,
    val twoFASuccess: String? = null,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val tokenManager: TokenManager,
    private val api: AeroXeBeeApi,
    private val behaviorEventManager: BehaviorEventManager,
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

    init {
        loadAccountInfo()
        load2FAStatus()
    }

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

    // ─── Account & Plan Info ────────────────────────────────

    private fun loadAccountInfo() {
        viewModelScope.launch {
            try {
                val response = api.getMemberDashboard()
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data ?: return@launch
                    _state.update {
                        it.copy(
                            planName = data.account.plan,
                            accountStatus = data.account.status,
                            dailyUsage = data.usage.daily,
                            monthlyUsage = data.usage.monthly,
                        )
                    }
                }
            } catch (_: Exception) { }
        }
    }

    // ─── Two-Factor Authentication ──────────────────────────

    private fun load2FAStatus() {
        viewModelScope.launch {
            try {
                val response = api.get2FAStatus()
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data
                    _state.update { it.copy(twoFAEnabled = data?.enabled ?: false) }
                }
            } catch (_: Exception) { }
        }
    }

    fun setup2FA() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading2FA = true, twoFAError = null, twoFASuccess = null) }
            try {
                val response = api.setup2FA()
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data
                    _state.update {
                        it.copy(
                            isLoading2FA = false,
                            show2FASetup = true,
                            twoFASetupSecret = data?.secret ?: "",
                            twoFASetupUrl = data?.url ?: "",
                            verifyCode = "",
                        )
                    }
                } else {
                    _state.update { it.copy(isLoading2FA = false, twoFAError = "Failed to setup 2FA") }
                }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading2FA = false, twoFAError = e.message) }
            }
        }
    }

    fun updateVerifyCode(code: String) {
        _state.update { it.copy(verifyCode = code) }
    }

    fun verify2FA() {
        val code = _state.value.verifyCode.trim()
        if (code.isBlank()) return

        viewModelScope.launch {
            _state.update { it.copy(isLoading2FA = true, twoFAError = null, twoFASuccess = null) }
            try {
                val response = api.verify2FA(Verify2FARequest(code))
                if (response.isSuccessful && response.body()?.success == true) {
                    behaviorEventManager.report("twofa_verify", "2FA enabled")
                    _state.update {
                        it.copy(
                            isLoading2FA = false,
                            twoFAEnabled = true,
                            show2FASetup = false,
                            twoFASetupSecret = "",
                            twoFASetupUrl = "",
                            verifyCode = "",
                            twoFASuccess = "Two-factor authentication enabled",
                        )
                    }
                } else {
                    _state.update { it.copy(isLoading2FA = false, twoFAError = "Invalid code. Try again.") }
                }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading2FA = false, twoFAError = e.message) }
            }
        }
    }

    fun disable2FA() {
        val code = _state.value.verifyCode.trim()
        if (code.isBlank()) return

        viewModelScope.launch {
            _state.update { it.copy(isLoading2FA = true, twoFAError = null, twoFASuccess = null) }
            try {
                val response = api.disable2FA(Verify2FARequest(code))
                if (response.isSuccessful && response.body()?.success == true) {
                    behaviorEventManager.report("twofa_disable", "2FA disabled")
                    _state.update {
                        it.copy(
                            isLoading2FA = false,
                            twoFAEnabled = false,
                            show2FASetup = false,
                            twoFASetupSecret = "",
                            twoFASetupUrl = "",
                            verifyCode = "",
                            twoFASuccess = "Two-factor authentication disabled",
                        )
                    }
                } else {
                    _state.update { it.copy(isLoading2FA = false, twoFAError = "Invalid code. Try again.") }
                }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading2FA = false, twoFAError = e.message) }
            }
        }
    }

    fun cancel2FASetup() {
        _state.update { it.copy(show2FASetup = false, twoFASetupSecret = "", twoFASetupUrl = "", verifyCode = "", twoFAError = null) }
    }

    fun clearTwoFAMessages() {
        _state.update { it.copy(twoFAError = null, twoFASuccess = null) }
    }
}
