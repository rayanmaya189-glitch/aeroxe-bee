package com.aeroxebee.client.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.aeroxebee.client.ui.components.*
import com.aeroxebee.client.ui.theme.*

@Composable
fun KycScreen(
    onBack: () -> Unit,
    viewModel: KycViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.Background)
            .verticalScroll(scrollState)
            .padding(horizontal = AppSpacing.XL),
    ) {
        Spacer(Modifier.height(AppSpacing.XL))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            SectionHeader(icon = Icons.Outlined.Verified, title = "KYC Verification")
            TextButton(onClick = onBack) {
                Text("Cancel", color = AppColors.TextMuted)
            }
        }

        Spacer(Modifier.height(AppSpacing.XL))

        when {
            state.status == "loading" -> {
                GlassCard {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(AppSpacing.XXL),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = AppColors.Blue,
                            strokeWidth = 2.dp,
                        )
                    }
                }
            }
            state.isSubmitted -> {
                val label = when (state.status) {
                    "pending" -> "Your KYC is pending review"
                    "approved" -> "Your KYC has been approved"
                    "rejected" -> "Your KYC was rejected"
                    else -> "KYC Submitted"
                }
                val color = when (state.status) {
                    "approved" -> AppColors.Success
                    "rejected" -> AppColors.Error
                    else -> AppColors.Warning
                }
                GlassCard {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(AppSpacing.MD),
                    ) {
                        Icon(
                            imageVector = when (state.status) {
                                "approved" -> Icons.Outlined.Verified
                                "rejected" -> Icons.Outlined.Cancel
                                else -> Icons.Outlined.HourglassEmpty
                            },
                            contentDescription = null,
                            tint = color,
                            modifier = Modifier.size(48.dp),
                        )
                        Text(
                            text = label,
                            style = AppTypography.Card,
                            fontWeight = FontWeight.Bold,
                            color = color,
                        )
                        if (state.fullName.isNotBlank()) {
                            Text(
                                text = state.fullName,
                                style = AppTypography.Body,
                                color = AppColors.TextMuted,
                            )
                        }
                    }
                }
            }
            else -> {
                GlassCard {
                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.LG)) {
                        Text(
                            text = "Verify your identity to unlock all features.",
                            style = AppTypography.Caption,
                            color = AppColors.TextMuted,
                        )

                        AeroTextField(
                            value = state.fullName,
                            onValueChange = viewModel::updateFullName,
                            label = "Full Name (as on ID)",
                            leadingIcon = Icons.Outlined.Person,
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                        )

                        DocumentTypeDropdown(
                            selected = state.documentType,
                            onSelected = viewModel::updateDocumentType,
                        )

                        AeroTextField(
                            value = state.documentNumber,
                            onValueChange = viewModel::updateDocumentNumber,
                            label = "Document Number",
                            leadingIcon = Icons.Outlined.Badge,
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                        )

                        AeroTextField(
                            value = state.documentUrl,
                            onValueChange = viewModel::updateDocumentUrl,
                            label = "Document Image URL (optional)",
                            leadingIcon = Icons.Outlined.Link,
                            placeholder = "https://...",
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        )

                        state.error?.let { error ->
                            Text(
                                text = error,
                                style = AppTypography.Caption,
                                color = AppColors.Error,
                            )
                        }

                        if (state.isSuccess) {
                            Text(
                                text = "KYC submitted successfully",
                                style = AppTypography.Body,
                                color = AppColors.Success,
                            )
                        }

                        AeroButton(
                            text = if (state.isLoading) "Submitting..." else "Submit KYC",
                            onClick = { viewModel.submit() },
                            loading = state.isLoading,
                            enabled = state.fullName.isNotBlank() && state.documentNumber.isNotBlank(),
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(AppSpacing.XXXL))
    }
}

@Composable
private fun DocumentTypeDropdown(
    selected: String,
    onSelected: (String) -> Unit,
) {
    val options = listOf(
        "national_id" to "National ID",
        "passport" to "Passport",
        "drivers_license" to "Driver's License",
    )
    var expanded by remember { mutableStateOf(false) }
    val label = options.find { it.first == selected }?.second ?: "Select document type"

    Column {
        OutlinedTextField(
            value = label,
            onValueChange = {},
            label = { Text("Document Type", style = AppTypography.Body) },
            leadingIcon = {
                Icon(Icons.Outlined.Description, contentDescription = null, tint = AppColors.TextMuted)
            },
            trailingIcon = {
                IconButton(onClick = { expanded = !expanded }) {
                    Icon(
                        imageVector = if (expanded) Icons.Outlined.ExpandLess else Icons.Outlined.ExpandMore,
                        contentDescription = null,
                        tint = AppColors.TextMuted,
                    )
                }
            },
            readOnly = true,
            enabled = true,
            modifier = Modifier.fillMaxWidth(),
            shape = androidx.compose.foundation.shape.RoundedCornerShape(AppShapes.Medium),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = AppColors.Border,
                focusedBorderColor = AppColors.Blue,
                unfocusedContainerColor = AppColors.Glass,
                focusedContainerColor = AppColors.Glass,
                unfocusedTextColor = AppColors.TextPrimary,
                focusedTextColor = AppColors.TextPrimary,
                cursorColor = AppColors.Blue,
                unfocusedLabelColor = AppColors.TextMuted,
                focusedLabelColor = AppColors.Blue,
            ),
            textStyle = AppTypography.Body,
        )

        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            options.forEach { (value, label) ->
                DropdownMenuItem(
                    text = { Text(label) },
                    onClick = {
                        onSelected(value)
                        expanded = false
                    },
                )
            }
        }
    }
}
