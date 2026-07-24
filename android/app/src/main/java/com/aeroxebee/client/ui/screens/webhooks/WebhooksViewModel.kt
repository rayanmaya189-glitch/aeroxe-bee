package com.aeroxebee.client.ui.screens.webhooks

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import com.aeroxebee.client.data.remote.model.CreateWebhookRequest
import com.aeroxebee.client.data.remote.model.MemberWebhook
import com.aeroxebee.client.data.remote.model.errorMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WebhooksState(
    val webhooks: List<MemberWebhook> = emptyList(),
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val error: String? = null,
    val showEditDialog: Boolean = false,
    val editingWebhook: MemberWebhook? = null,
    val editUrl: String = "",
    val editActive: Boolean = true,
    val deleteConfirmId: String? = null,
)

@HiltViewModel
class WebhooksViewModel @Inject constructor(
    private val api: AeroXeBeeApi,
) : ViewModel() {

    private val _state = MutableStateFlow(WebhooksState())
    val state: StateFlow<WebhooksState> = _state.asStateFlow()

    init {
        loadWebhooks()
    }

    fun loadWebhooks() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val response = api.getMemberWebhooks()
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data?.data
                    _state.update { it.copy(webhooks = data ?: emptyList(), isLoading = false) }
                } else {
                    _state.update { it.copy(isLoading = false, error = response.errorMessage("Failed to load webhooks")) }
                }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.message ?: "Network error") }
            }
        }
    }

    fun showCreateDialog() {
        _state.update { it.copy(
            showEditDialog = true,
            editingWebhook = null,
            editUrl = "",
            editActive = true,
            error = null,
        ) }
    }

    fun showEditDialog(webhook: MemberWebhook) {
        _state.update { it.copy(
            showEditDialog = true,
            editingWebhook = webhook,
            editUrl = webhook.url,
            editActive = webhook.active,
            error = null,
        ) }
    }

    fun dismissDialog() {
        _state.update { it.copy(showEditDialog = false, editingWebhook = null, editUrl = "", editActive = true, error = null) }
    }

    fun updateEditUrl(url: String) {
        _state.update { it.copy(editUrl = url) }
    }

    fun updateEditActive(active: Boolean) {
        _state.update { it.copy(editActive = active) }
    }

    fun saveWebhook() {
        val url = _state.value.editUrl.trim()
        if (url.isBlank()) return

        // Validate URL format
        val urlError = validateWebhookUrl(url)
        if (urlError != null) {
            _state.update { it.copy(error = urlError) }
            return
        }

        val request = CreateWebhookRequest(url = url, events = listOf("message.delivered"), active = _state.value.editActive)
        val existing = _state.value.editingWebhook

        viewModelScope.launch {
            _state.update { it.copy(isSaving = true, error = null) }
            try {
                val response = if (existing != null) {
                    api.updateMemberWebhook(existing.id, request)
                } else {
                    api.createMemberWebhook(request)
                }
                if (response.isSuccessful && response.body()?.success == true) {
                    _state.update { it.copy(isSaving = false, showEditDialog = false, editingWebhook = null) }
                    loadWebhooks()
                } else {
                    val action = if (existing != null) "update" else "create"
                    _state.update { it.copy(isSaving = false, error = response.errorMessage("Failed to $action webhook")) }
                }
            } catch (e: Exception) {
                _state.update { it.copy(isSaving = false, error = e.message ?: "Network error") }
            }
        }
    }

    private fun validateWebhookUrl(url: String): String? {
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            return "URL must start with http:// or https://"
        }
        return try {
            java.net.URL(url)
            null
        } catch (_: Exception) {
            "Invalid URL format"
        }
    }

    fun requestDelete(webhookId: String) {
        _state.update { it.copy(deleteConfirmId = webhookId) }
    }

    fun cancelDelete() {
        _state.update { it.copy(deleteConfirmId = null) }
    }

    fun confirmDelete() {
        val id = _state.value.deleteConfirmId ?: return
        viewModelScope.launch {
            _state.update { it.copy(deleteConfirmId = null) }
            try {
                val response = api.deleteMemberWebhook(id)
                if (response.isSuccessful && response.body()?.success == true) {
                    loadWebhooks()
                } else {
                    _state.update { it.copy(error = response.errorMessage("Failed to delete webhook")) }
                }
            } catch (e: Exception) {
                _state.update { it.copy(error = e.message ?: "Network error") }
            }
        }
    }

    fun clearError() {
        _state.update { it.copy(error = null) }
    }
}
