package com.aeroxebee.client.ui.screens.templates

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.aeroxebee.client.data.remote.model.MemberTemplate
import com.aeroxebee.client.ui.components.AeroButton
import com.aeroxebee.client.ui.components.GlassCard
import com.aeroxebee.client.ui.components.SectionHeader
import com.aeroxebee.client.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun TemplatesScreen(
    viewModel: TemplatesViewModel = hiltViewModel(),
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

        SectionHeader(icon = Icons.Outlined.Description, title = "SMS Templates")

        Spacer(Modifier.height(AppSpacing.MD))

        state.error?.let { error ->
            Text(
                text = error,
                style = AppTypography.Caption,
                color = AppColors.Error,
                modifier = Modifier.padding(bottom = AppSpacing.MD),
            )
            Spacer(Modifier.height(AppSpacing.SM))
        }

        AnimatedVisibility(
            visible = state.isLoading,
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = AppSpacing.XXXL),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(
                    color = AppColors.Blue,
                    strokeWidth = 2.dp,
                    modifier = Modifier.size(24.dp),
                )
            }
        }

        AnimatedVisibility(
            visible = !state.isLoading,
            enter = fadeIn(animationSpec = tween(400, delayMillis = 100)),
            exit = fadeOut(),
        ) {
            if (state.templates.isEmpty()) {
                EmptyTemplates(onCreate = viewModel::showCreateDialog)
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.MD)) {
                    state.templates.forEach { template ->
                        TemplateCard(
                            template = template,
                            onEdit = { viewModel.showEditDialog(template) },
                            onDelete = { viewModel.requestDelete(template.id) },
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(AppSpacing.XXL))

        if (!state.isLoading && state.templates.isNotEmpty()) {
            AeroButton(
                text = "Create Template",
                onClick = viewModel::showCreateDialog,
                icon = Icons.Filled.Add,
            )
        }

        Spacer(Modifier.height(AppSpacing.XXXL))
    }

    if (state.showEditDialog) {
        TemplateEditDialog(
            existing = state.editingTemplate,
            isSaving = state.isSaving,
            onSave = { name, body, variables ->
                viewModel.saveTemplate(name, body, variables)
            },
            onDismiss = viewModel::dismissDialog,
        )
    }

    if (state.deleteConfirmId != null) {
        AlertDialog(
            onDismissRequest = viewModel::cancelDelete,
            containerColor = AppColors.Glass,
            titleContentColor = AppColors.TextPrimary,
            textContentColor = AppColors.TextMuted,
            title = { Text("Delete Template?", fontWeight = FontWeight.Bold) },
            text = { Text("This action cannot be undone.") },
            confirmButton = {
                AeroButton(
                    text = "Delete",
                    onClick = viewModel::confirmDelete,
                    variant = com.aeroxebee.client.ui.components.ButtonVariant.Danger,
                )
            },
            dismissButton = {
                TextButton(onClick = viewModel::cancelDelete) {
                    Text("Cancel", color = AppColors.TextMuted)
                }
            },
        )
    }
}

@Composable
private fun EmptyTemplates(onCreate: () -> Unit) {
    GlassCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(AppSpacing.LG))
            Icon(
                imageVector = Icons.Outlined.Description,
                contentDescription = null,
                tint = AppColors.TextDisabled,
                modifier = Modifier.size(40.dp),
            )
            Spacer(Modifier.height(AppSpacing.MD))
            Text(
                text = "No templates yet",
                style = AppTypography.Body,
                color = AppColors.TextMuted,
            )
            Spacer(Modifier.height(AppSpacing.XS))
            Text(
                text = "Create reusable SMS templates with variables.",
                style = AppTypography.Caption,
                color = AppColors.TextDisabled,
            )
            Spacer(Modifier.height(AppSpacing.LG))
            AeroButton(
                text = "Create Template",
                onClick = onCreate,
                icon = Icons.Filled.Add,
            )
            Spacer(Modifier.height(AppSpacing.SM))
        }
    }
}

@Composable
private fun TemplateCard(
    template: MemberTemplate,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    GlassCard(onClick = onEdit) {
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.SM)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = template.name,
                    style = AppTypography.Card,
                    fontWeight = FontWeight.SemiBold,
                    color = AppColors.TextPrimary,
                    modifier = Modifier.weight(1f),
                )
                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(32.dp),
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Delete,
                        contentDescription = "Delete",
                        tint = AppColors.Error.copy(alpha = 0.7f),
                        modifier = Modifier.size(18.dp),
                    )
                }
            }

            Text(
                text = template.body,
                style = AppTypography.Caption,
                color = AppColors.TextSecondary,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis,
            )

            if (template.variables.isNotEmpty()) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.SM),
                ) {
                    template.variables.forEach { variable ->
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(AppShapes.Small))
                                .background(AppColors.Blue.copy(alpha = 0.12f))
                                .padding(horizontal = AppSpacing.SM, vertical = 2.dp),
                        ) {
                            Text(
                                text = "{{$variable}}",
                                style = AppTypography.Small,
                                color = AppColors.Blue,
                            )
                        }
                    }
                }
            }

            Text(
                text = formatDate(template.createdAt),
                style = AppTypography.Caption,
                color = AppColors.TextDisabled,
            )
        }
    }
}

private fun formatDate(dateStr: String): String {
    return try {
        val input = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val output = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
        val date = input.parse(dateStr)
        if (date != null) "Created ${output.format(date)}" else ""
    } catch (_: Exception) {
        ""
    }
}
