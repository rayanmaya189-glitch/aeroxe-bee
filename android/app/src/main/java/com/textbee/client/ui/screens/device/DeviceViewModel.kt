package com.textbee.client.ui.screens.device

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.textbee.client.data.repository.DeviceRepository
import com.textbee.client.domain.model.DeviceInfo
import com.textbee.client.domain.model.DeviceState
import com.textbee.client.util.DeviceStateClassifier
import com.textbee.client.util.ExactAlarmHandler
import com.textbee.client.util.OEMBatteryGuide
import com.textbee.client.util.OEMBatteryGuideEntry
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
    val batteryGuide: OEMBatteryGuideEntry? = null,
    val canScheduleExactAlarms: Boolean = true,
)

@HiltViewModel
class DeviceViewModel @Inject constructor(
    private val deviceRepository: DeviceRepository,
    private val deviceStateClassifier: DeviceStateClassifier,
    private val exactAlarmHandler: ExactAlarmHandler,
) : ViewModel() {

    private val _state = MutableStateFlow(DeviceUiState())
    val state: StateFlow<DeviceUiState> = _state.asStateFlow()

    init {
        loadDeviceInfo()
    }

    fun loadDeviceInfo() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            val info = deviceRepository.getDeviceInfo()
            val deviceState = deviceStateClassifier.classify()
            val batteryGuide = OEMBatteryGuide.find(info.manufacturer)
            val canScheduleExactAlarms = exactAlarmHandler.canScheduleExactAlarms()
            _state.update {
                it.copy(
                    deviceInfo = info,
                    deviceState = deviceState,
                    isLoading = false,
                    batteryGuide = batteryGuide,
                    canScheduleExactAlarms = canScheduleExactAlarms,
                )
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
