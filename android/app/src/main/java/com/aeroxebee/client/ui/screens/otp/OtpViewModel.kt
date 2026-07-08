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
    val recipient: String = "",
    val sender: String = "",
    val message: String = "",
    val simSlot: Int? = null,
    val isSending: Boolean = false,
    val sentOtpId: String? = null,
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

    fun updateRecipient(value: String) {
        _state.update { it.copy(recipient = value, error = null) }
    }

    fun updateSender(value: String) {
        _state.update { it.copy(sender = value, error = null) }
    }

    fun updateMessage(value: String) {
        _state.update { it.copy(message = value, error = null) }
    }

    fun updateSimSlot(value: Int?) {
        _state.update { it.copy(simSlot = value, error = null) }
    }

    fun updateVerifyCode(value: String) {
        _state.update { it.copy(verifyCode = value, error = null) }
    }

    private val defaultMessage = "Your verification code is: {{OTP}}"

    fun sendOtp() {
        val s = _state.value
        if (s.recipient.isBlank()) {
            _state.update { it.copy(error = "Recipient phone number is required") }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isSending = true, error = null) }
            try {
                val msg = s.message.ifBlank { defaultMessage }
                val response = api.sendOtp(
                    OtpSendRequest(
                        recipient = s.recipient,
                        sender = s.sender.ifBlank { "OTP" },
                        message = msg,
                        simSlot = s.simSlot,
                    )
                )
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data
                    behaviorEventManager.report("otp_request", "OTP sent to ${s.recipient}")
                    _state.update {
                        it.copy(
                            isSending = false,
                            sentOtpId = data?.otpId ?: "",
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
                        otpId = s.sentOtpId ?: "",
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
