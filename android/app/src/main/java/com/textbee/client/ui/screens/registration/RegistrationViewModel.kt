package com.textbee.client.ui.screens.registration

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

    fun onApiKeyChange(key: String) {
        _state.update { it.copy(apiKey = key, error = null) }
    }

    fun onSlotSelected(index: Int) {
        _state.update { it.copy(selectedSlotIndex = index) }
    }

    fun nextStep() {
        val current = _state.value.step
        when (current) {
            RegistrationStep.CREDENTIALS -> {
                val s = _state.value
                if (s.serverUrl.isBlank()) {
                    _state.update { it.copy(serverUrlError = "Server URL is required") }
                    return
                }
                val slots = simManager.getAvailableSlots()
                _state.update {
                    it.copy(
                        step = RegistrationStep.SIM_SELECTION,
                        availableSlots = slots,
                        error = null,
                        serverUrlError = null,
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
            tokenManager.saveApiKey(s.apiKey.trim())

            try {
                deviceRepository.registerDevice(s.apiKey)
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
