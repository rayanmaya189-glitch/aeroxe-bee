package com.aeroxebee.client.ui.screens.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import com.aeroxebee.client.data.remote.model.SubmitKycRequest
import com.aeroxebee.client.data.remote.model.errorMessage
import com.aeroxebee.client.device.behavior.BehaviorEventManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class KycState(
    val status: String = "loading",
    val fullName: String = "",
    val documentType: String = "national_id",
    val documentNumber: String = "",
    val documentUrl: String = "",
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val isSubmitted: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class KycViewModel @Inject constructor(
    private val api: AeroXeBeeApi,
    private val behaviorEventManager: BehaviorEventManager,
) : ViewModel() {

    private val _state = MutableStateFlow(KycState())
    val state: StateFlow<KycState> = _state.asStateFlow()

    init {
        loadStatus()
    }

    private fun loadStatus() {
        viewModelScope.launch {
            try {
                val response = api.getMemberKyc()
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data
                    if (data != null && data.status != "not_submitted") {
                        _state.update {
                            it.copy(
                                status = data.status,
                                fullName = data.fullName ?: "",
                                documentType = data.documentType ?: "national_id",
                                isSubmitted = data.status == "pending"
                                    || data.status == "approved"
                                    || data.status == "rejected",
                            )
                        }
                    } else {
                        _state.update { it.copy(status = "not_submitted") }
                    }
                } else {
                    _state.update { it.copy(status = "not_submitted", error = response.errorMessage("Failed to load KYC status")) }
                }
            } catch (_: Exception) {
                _state.update { it.copy(status = "not_submitted") }
            }
        }
    }

    fun updateFullName(value: String) {
        _state.update { it.copy(fullName = value, error = null) }
    }

    fun updateDocumentType(value: String) {
        _state.update { it.copy(documentType = value, error = null) }
    }

    fun updateDocumentNumber(value: String) {
        _state.update { it.copy(documentNumber = value, error = null) }
    }

    fun updateDocumentUrl(value: String) {
        _state.update { it.copy(documentUrl = value, error = null) }
    }

    fun submit() {
        val s = _state.value
        if (s.fullName.isBlank()) {
            _state.update { it.copy(error = "Full name is required") }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val response = api.submitMemberKyc(
                    SubmitKycRequest(
                        fullName = s.fullName,
                        documentType = s.documentType,
                        documentNumber = s.documentNumber,
                        documentUrl = s.documentUrl,
                    )
                )
                if (response.isSuccessful && response.body()?.success == true) {
                    behaviorEventManager.report("kyc_update", "KYC submitted")
                    _state.update {
                        it.copy(isLoading = false, isSuccess = true, status = "pending", isSubmitted = true)
                    }
                } else {
                    _state.update { it.copy(isLoading = false, error = response.errorMessage("Failed to submit KYC")) }
                }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.message ?: "Network error") }
            }
        }
    }
}
