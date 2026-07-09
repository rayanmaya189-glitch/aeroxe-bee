package com.aeroxebee.client.ui.screens.otp

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import com.aeroxebee.client.data.remote.model.OtpSendRequest
import com.aeroxebee.client.data.remote.model.OtpVerifyRequest
import com.aeroxebee.client.device.behavior.BehaviorEventManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OtpState(
    val phone: String = "",
    val isSending: Boolean = false,
    val messageId: String? = null,
    val code: String? = null,
    val expiresIn: Int = 0,
    val verifyCode: String = "",
    val isVerifying: Boolean = false,
    val isVerified: Boolean = false,
    val error: String? = null,
    val step: OtpStep = OtpStep.SEND,
)

enum class OtpStep { SEND, VERIFY }

@HiltViewModel
class OtpViewModel @Inject constructor(
    private val api: AeroXeBeeApi,
    private val behaviorEventManager: BehaviorEventManager,
) : ViewModel() {

    private val _state = MutableStateFlow(OtpState())
    val state: StateFlow<OtpState> = _state.asStateFlow()

    fun updatePhone(value: String) {
        _state.update { it.copy(phone = value, error = null) }
    }

    fun updateVerifyCode(value: String) {
        _state.update { it.copy(verifyCode = value, error = null) }
    }

    fun sendOtp() {
        val s = _state.value
        if (s.phone.isBlank()) {
            _state.update { it.copy(error = "Phone number is required") }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isSending = true, error = null) }
            try {
                val response = api.sendOtp(
                    OtpSendRequest(
                        phone = s.phone,
                    )
                )
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data
                    behaviorEventManager.report("otp_request", "OTP sent to ${s.phone}")
                    _state.update {
                        it.copy(
                            isSending = false,
                            messageId = data?.messageId ?: "",
                            code = data?.code,
                            expiresIn = data?.expiresIn ?: 0,
                            step = OtpStep.VERIFY,
                        )
                    }
                } else {
                    val msg = response.body()?.error ?: "Failed to send OTP"
                    _state.update { it.copy(isSending = false, error = msg) }
                }
            } catch (e: Exception) {
                _state.update { it.copy(isSending = false, error = e.message ?: "Network error") }
            }
        }
    }

    fun verifyOtp() {
        val s = _state.value
        if (s.verifyCode.isBlank()) {
            _state.update { it.copy(error = "Verification code is required") }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isVerifying = true, error = null) }
            try {
                val response = api.verifyOtp(
                    OtpVerifyRequest(
                        phone = s.phone,
                        code = s.verifyCode,
                    )
                )
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data
                    val verified = data?.verified == true
                    if (verified) {
                        behaviorEventManager.report("otp_verify", "OTP verified successfully")
                    }
                    _state.update { it.copy(isVerifying = false, isVerified = verified) }
                } else {
                    val msg = response.body()?.error ?: "Invalid code"
                    _state.update { it.copy(isVerifying = false, error = msg) }
                }
            } catch (e: Exception) {
                _state.update { it.copy(isVerifying = false, error = e.message ?: "Network error") }
            }
        }
    }

    fun reset() {
        _state.value = OtpState()
    }
}
