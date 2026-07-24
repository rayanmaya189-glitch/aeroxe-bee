package com.aeroxebee.client.ui.screens.templates

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import com.aeroxebee.client.data.remote.model.CreateTemplateRequest
import com.aeroxebee.client.data.remote.model.MemberTemplate
import com.aeroxebee.client.data.remote.model.errorMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class TemplatesState(
    val templates: List<MemberTemplate> = emptyList(),
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val error: String? = null,
    val showEditDialog: Boolean = false,
    val editingTemplate: MemberTemplate? = null,
    val deleteConfirmId: String? = null,
)

@HiltViewModel
class TemplatesViewModel @Inject constructor(
    private val api: AeroXeBeeApi,
) : ViewModel() {

    private val _state = MutableStateFlow(TemplatesState())
    val state: StateFlow<TemplatesState> = _state.asStateFlow()

    init {
        loadTemplates()
    }

    fun loadTemplates() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val response = api.getMemberTemplates()
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data?.data
                    _state.update { it.copy(templates = data ?: emptyList(), isLoading = false) }
                } else {
                    _state.update { it.copy(isLoading = false, error = response.errorMessage("Failed to load templates")) }
                }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.message ?: "Network error") }
            }
        }
    }

    fun showCreateDialog() {
        _state.update { it.copy(showEditDialog = true, editingTemplate = null, error = null) }
    }

    fun showEditDialog(template: MemberTemplate) {
        _state.update { it.copy(showEditDialog = true, editingTemplate = template, error = null) }
    }

    fun dismissDialog() {
        _state.update { it.copy(showEditDialog = false, editingTemplate = null, error = null) }
    }

    fun saveTemplate(name: String, body: String, variables: String) {
        val trimmedName = name.trim()
        val trimmedBody = body.trim()
        if (trimmedName.isBlank() || trimmedBody.isBlank()) {
            _state.update { it.copy(error = "Template name and message body are required") }
            return
        }
        val varList = if (variables.isBlank()) emptyList() else variables.split(",").map { it.trim() }.filter { it.isNotBlank() }
        val request = CreateTemplateRequest(name = trimmedName, body = trimmedBody, variables = varList)
        val existing = _state.value.editingTemplate

        viewModelScope.launch {
            _state.update { it.copy(isSaving = true) }
            try {
                val response = if (existing != null) {
                    api.updateMemberTemplate(existing.id, request)
                } else {
                    api.createMemberTemplate(request)
                }
                if (response.isSuccessful && response.body()?.success == true) {
                    _state.update { it.copy(isSaving = false, showEditDialog = false, editingTemplate = null) }
                    loadTemplates()
                } else {
                    val action = if (existing != null) "update" else "create"
                    _state.update { it.copy(isSaving = false, error = response.errorMessage("Failed to $action template")) }
                }
            } catch (e: Exception) {
                _state.update { it.copy(isSaving = false, error = e.message ?: "Network error") }
            }
        }
    }

    fun requestDelete(templateId: String) {
        _state.update { it.copy(deleteConfirmId = templateId) }
    }

    fun cancelDelete() {
        _state.update { it.copy(deleteConfirmId = null) }
    }

    fun confirmDelete() {
        val id = _state.value.deleteConfirmId ?: return
        viewModelScope.launch {
            _state.update { it.copy(deleteConfirmId = null) }
            try {
                val response = api.deleteMemberTemplate(id)
                if (response.isSuccessful && response.body()?.success == true) {
                    loadTemplates()
                } else {
                    _state.update { it.copy(error = response.errorMessage("Failed to delete template")) }
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
