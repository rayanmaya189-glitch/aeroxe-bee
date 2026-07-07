package com.aeroxebee.client.ui.screens.qrscanner

import android.app.Application
import android.os.Build
import android.provider.Settings
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aeroxebee.client.BuildConfig
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import com.aeroxebee.client.data.remote.model.QRLoginRequest
import com.aeroxebee.client.data.repository.DeviceRepository
import com.aeroxebee.client.fcm.FCMRegistrar
import com.aeroxebee.client.util.TokenManager
import com.aeroxebee.client.worker.MqttService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class QrScannerState(
    val isScanning: Boolean = true,
    val isLoading: Boolean = false,
    val isPaired: Boolean = false,
    val error: String? = null,
    val scannedToken: String? = null,
)

@HiltViewModel
class QrScannerViewModel @Inject constructor(
    private val app: Application,
    private val api: AeroXeBeeApi,
    private val tokenManager: TokenManager,
    private val deviceRepository: DeviceRepository,
    private val fcmRegistrar: FCMRegistrar,
) : ViewModel() {

    private val _state = MutableStateFlow(QrScannerState())
    val state: StateFlow<QrScannerState> = _state.asStateFlow()

    fun onQrCodeScanned(rawValue: String) {
        // Parse the QR data: {"token":"...","type":"aeroxe_pair","server":"..."}
        if (_state.value.isLoading || _state.value.isPaired) return

        try {
            val json = org.json.JSONObject(rawValue)
            val token = json.getString("token")
            val type = json.optString("type", "")
            val server = json.optString("server", "")

            if (type != "aeroxe_pair" || token.isBlank()) {
                _state.update { it.copy(error = "Invalid QR code. Please scan an AeroXe Bee device pairing code.") }
                return
            }

            // Update server URL from QR code if provided
            if (server.isNotBlank()) {
                val baseUrl = if (server.endsWith("/")) "${server}api/v1/" else "$server/api/v1/"
                tokenManager.saveServerUrl(baseUrl.trimEnd('/'))
            }

            _state.update { it.copy(scannedToken = token, isScanning = false, isLoading = true, error = null) }
            loginWithQrToken(token)
        } catch (e: Exception) {
            _state.update { it.copy(error = "Failed to read QR code: ${e.message}") }
        }
    }

    fun onQrScanError(error: String) {
        _state.update { it.copy(error = error) }
    }

    fun retryScan() {
        _state.update { QrScannerState() }
    }

    private fun loginWithQrToken(pairingToken: String) {
        viewModelScope.launch {
            try {
                val androidId = Settings.Secure.getString(
                    app.contentResolver, Settings.Secure.ANDROID_ID
                ) ?: throw Exception("Unable to get device ID")

                val request = QRLoginRequest(
                    pairingToken = pairingToken,
                    deviceId = androidId,
                    model = Build.MODEL,
                    osVersion = "${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})",
                    appVersion = getAppVersion(),
                )

                val response = api.qrLogin(request)
                val body = response.body()

                if (response.isSuccessful && body?.success == true && body.data != null) {
                    val data = body.data

                    tokenManager.saveToken(data.token)
                    tokenManager.saveDeviceId(data.deviceId)
                    tokenManager.saveSimSlot(0)
                    tokenManager.saveAccountEmail(data.account?.email ?: "")
                    tokenManager.saveAccountName(data.account?.name ?: "")
                    tokenManager.saveAccountId(data.account?.id ?: "")

                    // Broker URL from BuildConfig, credentials from login response
                    tokenManager.saveMqttBrokerUrl(BuildConfig.MQTT_BROKER_URL)
                    data.mqtt?.let { mqtt ->
                        tokenManager.saveMqttUsername(mqtt.username)
                        tokenManager.saveMqttPassword(mqtt.password)
                    }

                    tokenManager.saveRegistered(true)
                    MqttService.start(app)
                    fcmRegistrar.registerToken()

                    _state.update { it.copy(isLoading = false, isPaired = true) }
                } else {
                    _state.update {
                        it.copy(
                            isLoading = false,
                            error = body?.error ?: "QR login failed"
                        )
                    }
                }
            } catch (e: Exception) {
                _state.update {
                    it.copy(isLoading = false, error = "QR login failed: ${e.message}")
                }
            }
        }
    }

    private fun getAppVersion(): String {
        return try {
            val pInfo = app.packageManager.getPackageInfo(app.packageName, 0)
            pInfo.versionName ?: "1.0.0"
        } catch (_: Exception) { "1.0.0" }
    }
}
