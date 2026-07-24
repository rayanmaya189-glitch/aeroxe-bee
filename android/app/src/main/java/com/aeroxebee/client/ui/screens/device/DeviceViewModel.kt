package com.aeroxebee.client.ui.screens.device

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aeroxebee.client.data.repository.DeviceRepository
import com.aeroxebee.client.domain.model.DeviceInfo
import com.aeroxebee.client.domain.model.DeviceState
import com.aeroxebee.client.util.DeviceStateClassifier
import com.aeroxebee.client.util.ExactAlarmHandler
import com.aeroxebee.client.util.OEMBatteryGuide
import com.aeroxebee.client.util.OEMBatteryGuideEntry
import com.aeroxebee.client.util.SimManager
import com.aeroxebee.client.util.TokenManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DeviceUiState(
    val deviceInfo: DeviceInfo = DeviceInfo(),
    val deviceState: DeviceState = DeviceState.ACTIVE,
    val isOnline: Boolean = false,
    val isLoading: Boolean = false,
    val error: String? = null,
    val batteryGuide: OEMBatteryGuideEntry? = null,
    val canScheduleExactAlarms: Boolean = true,
    val isBatteryOptimized: Boolean = false,
    val availableSimSlots: List<SimManager.SimSlot> = emptyList(),
    val selectedSimSlot: Int = 0,
    val isSimSwitching: Boolean = false,
    val simSwitchSuccess: Boolean = false,
)

@HiltViewModel
class DeviceViewModel @Inject constructor(
    private val deviceRepository: DeviceRepository,
    private val deviceStateClassifier: DeviceStateClassifier,
    private val exactAlarmHandler: ExactAlarmHandler,
    private val simManager: SimManager,
    private val tokenManager: TokenManager,
) : ViewModel() {

    private val _state = MutableStateFlow(DeviceUiState())
    val state: StateFlow<DeviceUiState> = _state.asStateFlow()

    init {
        loadDeviceInfo()
    }

    fun loadDeviceInfo() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val info = deviceRepository.getDeviceInfo()
                val deviceState = deviceStateClassifier.classify()
                val batteryGuide = OEMBatteryGuide.find(info.manufacturer)
                val canScheduleExactAlarms = exactAlarmHandler.canScheduleExactAlarms()
                val simSlots = simManager.getAvailableSlots()
                val storedSlot = tokenManager.getSimSlot().coerceAtLeast(0)
                val normalizedSelectedSlot = when {
                    simSlots.isEmpty() -> storedSlot
                    simSlots.any { it.slotId == storedSlot } -> storedSlot
                    else -> simSlots.first().slotId
                }

                if (normalizedSelectedSlot != storedSlot) {
                    tokenManager.saveSimSlot(normalizedSelectedSlot)
                }

                _state.update {
                    it.copy(
                        deviceInfo = info,
                        deviceState = deviceState,
                        isLoading = false,
                        error = null,
                        batteryGuide = batteryGuide,
                        canScheduleExactAlarms = canScheduleExactAlarms,
                        isBatteryOptimized = deviceStateClassifier.isIgnoringBatteryOptimizations(),
                        availableSimSlots = simSlots,
                        selectedSimSlot = normalizedSelectedSlot,
                    )
                }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.message ?: "Failed to load device info") }
            }
        }
    }

    fun switchSim(slotIndex: Int) {
        viewModelScope.launch {
            _state.update { it.copy(isSimSwitching = true, simSwitchSuccess = false, error = null) }
            try {
                val isValidSlot = _state.value.availableSimSlots.isEmpty() || _state.value.availableSimSlots.any { it.slotId == slotIndex }
                if (!isValidSlot) {
                    _state.update { it.copy(isSimSwitching = false, error = "Selected SIM is not available on this device") }
                    return@launch
                }

                tokenManager.saveSimSlot(slotIndex)
                _state.update {
                    it.copy(
                        selectedSimSlot = slotIndex,
                        isSimSwitching = false,
                        simSwitchSuccess = true,
                    )
                }
            } catch (e: Exception) {
                _state.update {
                    it.copy(
                        isSimSwitching = false,
                        error = "Failed to switch SIM: ${e.message}",
                    )
                }
            }
        }
    }

    fun requestBatteryOptimization() {
        deviceStateClassifier.openBatterySettings()
    }

    fun requestExactAlarmPermission() {
        deviceStateClassifier.openExactAlarmSettings()
    }

    fun refresh() {
        loadDeviceInfo()
    }
}
