package com.textbee.client.ui.screens.registration

import android.app.Application
import android.os.Build
import android.os.PowerManager
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.textbee.client.data.repository.DeviceRepository
import com.textbee.client.util.ExactAlarmHandler
import com.textbee.client.util.OEMBatteryGuide
import com.textbee.client.util.OEMBatteryGuideEntry
import com.textbee.client.util.SimManager
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

data class RegistrationState(
    val serverUrl: String = "http://10.0.2.2:8080",
    val email: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val isRegistered: Boolean = false,
    val error: String? = null,
    val serverUrlError: String? = null,
    val emailError: String? = null,
    val passwordError: String? = null,

    val availableSlots: List<SimManager.SimSlot> = emptyList(),
    val selectedSlotIndex: Int = 0,
    val isBatteryOptimized: Boolean = true,
    val batteryGuide: OEMBatteryGuideEntry? = null,
    val step: RegistrationStep = RegistrationStep.CREDENTIALS,
)

enum class RegistrationStep {
    CREDENTIALS,
    SIM_SELECTION,
    BATTERY_OPT,
    CONFIRM,
}

@HiltViewModel
class RegistrationViewModel @Inject constructor(
    @ApplicationContext private val appContext: android.content.Context,
    private val tokenManager: TokenManager,
    private val deviceRepository: DeviceRepository,
    private val simManager: SimManager,
    private val exactAlarmHandler: ExactAlarmHandler,
) : ViewModel() {

    private val _state = MutableStateFlow(RegistrationState())
    val state: StateFlow<RegistrationState> = _state.asStateFlow()

    fun onServerUrlChange(url: String) {
        _state.update { it.copy(serverUrl = url, serverUrlError = null, error = null) }
    }

    fun onEmailChange(email: String) {
        _state.update { it.copy(email = email, emailError = null, error = null) }
    }

    fun onPasswordChange(password: String) {
        _state.update { it.copy(password = password, passwordError = null, error = null) }
    }

    fun onSlotSelected(index: Int) {
        _state.update { it.copy(selectedSlotIndex = index) }
    }

    fun nextStep() {
        val current = _state.value.step
        when (current) {
            RegistrationStep.CREDENTIALS -> {
                val s = _state.value
                var hasError = false
                if (s.serverUrl.isBlank()) {
                    _state.update { it.copy(serverUrlError = "Server URL is required") }
                    hasError = true
                }
                if (s.email.isBlank()) {
                    _state.update { it.copy(emailError = "Email is required") }
                    hasError = true
                }
                if (s.password.isBlank()) {
                    _state.update { it.copy(passwordError = "Password is required") }
                    hasError = true
                }
                if (hasError) return

                val slots = simManager.getAvailableSlots()
                _state.update {
                    it.copy(
                        step = RegistrationStep.SIM_SELECTION,
                        availableSlots = slots,
                        error = null,
                        serverUrlError = null,
                        emailError = null,
                        passwordError = null,
                    )
                }
            }
            RegistrationStep.SIM_SELECTION -> {
                val isOpt = isBatteryOptimizationExempted()
                val guide = OEMBatteryGuide.find(Build.MANUFACTURER)
                _state.update {
                    it.copy(
                        step = RegistrationStep.BATTERY_OPT,
                        isBatteryOptimized = isOpt,
                        batteryGuide = guide,
                    )
                }
            }
            RegistrationStep.BATTERY_OPT -> {
                _state.update {
                    it.copy(step = RegistrationStep.CONFIRM)
                }
            }
            RegistrationStep.CONFIRM -> register()
        }
    }

    fun previousStep() {
        _state.update {
            val prev = when (it.step) {
                RegistrationStep.CREDENTIALS -> RegistrationStep.CREDENTIALS
                RegistrationStep.SIM_SELECTION -> RegistrationStep.CREDENTIALS
                RegistrationStep.BATTERY_OPT -> RegistrationStep.SIM_SELECTION
                RegistrationStep.CONFIRM -> RegistrationStep.BATTERY_OPT
            }
            it.copy(step = prev)
        }
    }

    fun requestBatteryOptimization() {
        val context = simManager.context
        val intent = android.content.Intent(
            android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
        ).apply {
            data = android.net.Uri.parse("package:${context.packageName}")
            addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }

    fun refreshBatteryOptStatus() {
        _state.update { it.copy(isBatteryOptimized = isBatteryOptimizationExempted()) }
    }

    private fun isBatteryOptimizationExempted(): Boolean {
        val context = simManager.context
        val pm = context.getSystemService(android.content.Context.POWER_SERVICE) as PowerManager
        return pm.isIgnoringBatteryOptimizations(context.packageName)
    }

    fun register() {
        val s = _state.value

        _state.update { it.copy(isLoading = true, error = null) }

        viewModelScope.launch {
            tokenManager.saveServerUrl(s.serverUrl.trimEnd('/'))

            try {
                deviceRepository.loginDevice(
                    email = s.email.trim(),
                    password = s.password,
                    simSlot = s.selectedSlotIndex,
                )
                MqttService.start(appContext)
                _state.update { it.copy(isLoading = false, isRegistered = true) }
            } catch (e: Exception) {
                _state.update {
                    it.copy(
                        isLoading = false,
                        error = "Login failed: ${e.message}",
                    )
                }
            }
        }
    }
}
