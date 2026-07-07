package com.aeroxebee.client.ui.screens.dashboard

import android.annotation.SuppressLint
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.Build
import android.os.PowerManager
import android.telephony.SignalStrength
import android.telephony.TelephonyManager
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import com.aeroxebee.client.data.remote.model.MemberMessage
import com.aeroxebee.client.data.remote.mqtt.MqttManager
import com.aeroxebee.client.data.repository.SMSTaskRepository
import com.aeroxebee.client.domain.model.Stats
import com.aeroxebee.client.util.TokenManager
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DashboardState(
    val stats: Stats = Stats(),
    val pendingCount: Int = 0,
    val isLoading: Boolean = false,
    val error: String? = null,
    val simSlots: List<Int> = listOf(0, 1),
    // Recent messages from API
    val recentMessages: List<MemberMessage> = emptyList(),
    // Today's stats from API
    val todaySent: Long = 0,
    val todayDelivered: Long = 0,
    val todayFailed: Long = 0,
    val todaySuccessRate: Double = 0.0,
    // Device health (read from device)
    val batteryLevel: Int = 0,
    val isCharging: Boolean = false,
    val networkType: String = "Unknown",
    val isNetworkConnected: Boolean = false,
    val signalRssi: Int = 0,
    val signalLevel: Int = 0,
    // Connection status
    val accountName: String = "",
    val totalDevices: Int = 0,
    val onlineDevices: Int = 0,
    // MQTT connection
    val mqttConnected: Boolean = false,
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val repository: SMSTaskRepository,
    private val api: AeroXeBeeApi,
    private val tokenManager: TokenManager,
    private val mqttManager: MqttManager,
) : ViewModel() {

    private val _state = MutableStateFlow(DashboardState())
    val state: StateFlow<DashboardState> = _state.asStateFlow()

    init {
        loadAllData()
        observeMqttConnection()
    }

    private fun observeMqttConnection() {
        _state.update { it.copy(mqttConnected = mqttManager.isConnected()) }
        viewModelScope.launch {
            mqttManager.connectionState.collect { connected ->
                _state.update { it.copy(mqttConnected = connected) }
            }
        }
    }

    fun loadAllData() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                // Load local stats
                val pending = repository.countPending()
                val stats = repository.getStats()

                // Load device health from local sensors
                val batteryInfo = getBatteryInfo()
                val networkInfo = getNetworkInfo()
                val signalInfo = getSignalStrength()

                _state.update {
                    it.copy(
                        stats = stats,
                        pendingCount = pending,
                        batteryLevel = batteryInfo.first,
                        isCharging = batteryInfo.second,
                        networkType = networkInfo.first,
                        isNetworkConnected = networkInfo.second,
                        signalRssi = signalInfo.first,
                        signalLevel = signalInfo.second,
                    )
                }

                // Load from API in parallel (best-effort)
                coroutineScope {
                    async { loadDashboardFromApi() }
                    async { loadRecentMessages() }
                }
                _state.update { it.copy(isLoading = false) }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.message ?: "Failed to load data") }
            }
        }
    }

    private suspend fun loadDashboardFromApi() {
        try {
            val response = api.getMemberDashboard()
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data ?: return
                _state.update {
                    it.copy(
                        accountName = data.account.name,
                        totalDevices = data.devices.total,
                        onlineDevices = data.devices.online,
                        todaySent = data.messages.totalSent,
                        todayDelivered = data.messages.totalDelivered,
                        todayFailed = data.messages.totalFailed,
                        todaySuccessRate = data.messages.deliveryRate,
                    )
                }
            }
        } catch (e: Exception) {
            android.util.Log.w(TAG, "Failed to load dashboard: ${e.message}")
        }
    }

    private suspend fun loadRecentMessages() {
        try {
            val response = api.getMemberMessages(page = 1, pageSize = 5)
            if (response.isSuccessful && response.body()?.success == true) {
                val messages = response.body()?.data?.data ?: emptyList()
                _state.update { it.copy(recentMessages = messages) }
            }
        } catch (e: Exception) {
            android.util.Log.w(TAG, "Failed to load recent messages: ${e.message}")
        }
    }

    private fun getBatteryInfo(): Pair<Int, Boolean> {
        val filter = android.content.IntentFilter(android.content.Intent.ACTION_BATTERY_CHANGED)
        val intent = context.registerReceiver(null, filter)
        val level = intent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = intent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        val batteryLevel = if (level >= 0 && scale > 0) (level * 100) / scale else 0
        val status = intent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
        return batteryLevel to isCharging
    }

    @SuppressLint("MissingPermission")
    private fun getNetworkInfo(): Pair<String, Boolean> {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork
        if (network == null) return "None" to false
        val caps = cm.getNetworkCapabilities(network) ?: return "Unknown" to false
        val isConnected = caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
        val type = when {
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "WiFi"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "Ethernet"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> getCellularType()
            else -> "Other"
        }
        return type to isConnected
    }

    @SuppressLint("MissingPermission")
    private fun getCellularType(): String {
        val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        return when (tm.dataNetworkType) {
            TelephonyManager.NETWORK_TYPE_NR -> "5G"
            TelephonyManager.NETWORK_TYPE_LTE -> "LTE"
            TelephonyManager.NETWORK_TYPE_UMTS,
            TelephonyManager.NETWORK_TYPE_HSDPA,
            TelephonyManager.NETWORK_TYPE_HSUPA,
            TelephonyManager.NETWORK_TYPE_HSPAP -> "3G"
            TelephonyManager.NETWORK_TYPE_EDGE,
            TelephonyManager.NETWORK_TYPE_GPRS,
            TelephonyManager.NETWORK_TYPE_GSM -> "2G"
            else -> "Cellular"
        }
    }

    @Suppress("DEPRECATION")
    private fun getSignalStrength(): Pair<Int, Int> {
        val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        try {
            val ss: SignalStrength? = tm.signalStrength
            if (ss != null) {
                val dbm = ss.cellSignalStrengths.firstOrNull()?.dbm ?: 0
                val level = ss.cellSignalStrengths.firstOrNull()?.level ?: 0
                return dbm to level
            }
        } catch (_: Exception) { }
        return 0 to 0
    }

    fun toggleMqtt() {
        viewModelScope.launch {
            if (mqttManager.isConnected()) {
                mqttManager.disconnect()
            } else {
                val brokerUrl = tokenManager.getMqttBrokerUrl() ?: return@launch
                val deviceId = tokenManager.getDeviceId() ?: return@launch
                val username = tokenManager.getMqttUsername()
                val password = tokenManager.getMqttPassword()
                val clientId = "aeroxebee_android_$deviceId"
                mqttManager.connect(brokerUrl, clientId, username, password)
                mqttManager.subscribe("devices/$deviceId/commands")
                mqttManager.subscribe("devices/$deviceId/pong")
            }
        }
    }

    fun refresh() {
        loadAllData()
    }

    companion object {
        private const val TAG = "DashboardViewModel"
    }
}
