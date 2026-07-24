package com.aeroxebee.client.ui.screens.templates

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.aeroxebee.client.data.remote.model.MemberTemplate
import com.aeroxebee.client.ui.components.AeroButton
import com.aeroxebee.client.ui.components.AeroTextField
import com.aeroxebee.client.ui.theme.*

@Composable
fun TemplateEditDialog(
    existing: MemberTemplate?,
    isSaving: Boolean,
    error: String? = null,
    onSave: (name: String, body: String, variables: String) -> Unit,
    onDismiss: () -> Unit,
) {
    var name by remember { mutableStateOf(existing?.name ?: "") }
    var body by remember { mutableStateOf(existing?.body ?: "") }
    var variables by remember { mutableStateOf(existing?.variables?.joinToString(", ") ?: "") }

    val isEditing = existing != null

    AlertDialog(
        onDismissRequest = { if (!isSaving) onDismiss() },
        containerColor = AppColors.SecondaryBg,
        titleContentColor = AppColors.TextPrimary,
        textContentColor = AppColors.TextMuted,
        title = {
            Text(
                text = if (isEditing) "Edit Template" else "New Template",
                style = AppTypography.Card,
            )
        },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(AppSpacing.MD),
                modifier = Modifier.fillMaxWidth(),
            ) {
                AeroTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = "Template Name",
                    leadingIcon = Icons.Outlined.Label,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                )

                AeroTextField(
                    value = body,
                    onValueChange = { body = it },
                    label = "Message Body",
                    leadingIcon = Icons.Outlined.Message,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                    placeholder = "Use {{variable}} for dynamic values",
                )

                AeroTextField(
                    value = variables,
                    onValueChange = { variables = it },
                    label = "Variables (comma-separated)",
                    leadingIcon = Icons.Outlined.Code,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    placeholder = "e.g. name, otp, amount",
                )

                error?.let { err ->
                    Text(
                        text = err,
                        style = AppTypography.Caption,
                        color = AppColors.Error,
                    )
                }
            }
        },
        confirmButton = {
            AeroButton(
                text = if (isSaving) "Saving..." else (if (isEditing) "Update" else "Create"),
                onClick = { onSave(name, body, variables) },
                loading = isSaving,
                enabled = name.isNotBlank() && body.isNotBlank() && !isSaving,
            )
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                enabled = !isSaving,
            ) {
                Text("Cancel", color = AppColors.TextMuted)
            }
        },
    )
}
