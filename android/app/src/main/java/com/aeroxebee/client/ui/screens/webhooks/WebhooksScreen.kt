package com.aeroxebee.client.ui.screens.webhooks

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
import com.aeroxebee.client.data.remote.model.MemberWebhook
import com.aeroxebee.client.ui.components.*
import com.aeroxebee.client.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun WebhooksScreen(
    onBack: () -> Unit = {},
    viewModel: WebhooksViewModel = hiltViewModel(),
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
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.Outlined.ArrowBack, contentDescription = "Back", tint = AppColors.TextPrimary)
            }
            Spacer(Modifier.width(AppSpacing.SM))
            SectionHeader(icon = Icons.Outlined.Webhook, title = "Webhooks")
        }

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
            if (state.webhooks.isEmpty()) {
                EmptyWebhooks(onCreate = viewModel::showCreateDialog)
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.MD)) {
                    state.webhooks.forEach { webhook ->
                        WebhookCard(
                            webhook = webhook,
                            onEdit = { viewModel.showEditDialog(webhook) },
                            onDelete = { viewModel.requestDelete(webhook.id) },
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(AppSpacing.XXL))

        if (!state.isLoading && state.webhooks.isNotEmpty()) {
            AeroButton(
                text = "Create Webhook",
                onClick = viewModel::showCreateDialog,
                icon = Icons.Filled.Add,
            )
        }

        Spacer(Modifier.height(AppSpacing.XXXL))
    }

    if (state.showEditDialog) {
        WebhookEditDialog(
            url = state.editUrl,
            isActive = state.editActive,
            isSaving = state.isSaving,
            isEditing = state.editingWebhook != null,
            onUrlChange = viewModel::updateEditUrl,
            onActiveChange = viewModel::updateEditActive,
            onSave = viewModel::saveWebhook,
            onDismiss = viewModel::dismissDialog,
        )
    }

    if (state.deleteConfirmId != null) {
        AlertDialog(
            onDismissRequest = viewModel::cancelDelete,
            containerColor = AppColors.Glass,
            titleContentColor = AppColors.TextPrimary,
            textContentColor = AppColors.TextMuted,
            title = { Text("Delete Webhook?", fontWeight = FontWeight.Bold) },
            text = { Text("Webhook deliveries will stop immediately. This action cannot be undone.") },
            confirmButton = {
                AeroButton(
                    text = "Delete",
                    onClick = viewModel::confirmDelete,
                    variant = ButtonVariant.Danger,
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
private fun WebhookEditDialog(
    url: String,
    isActive: Boolean,
    isSaving: Boolean,
    isEditing: Boolean,
    onUrlChange: (String) -> Unit,
    onActiveChange: (Boolean) -> Unit,
    onSave: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = { if (!isSaving) onDismiss() },
        containerColor = AppColors.SecondaryBg,
        titleContentColor = AppColors.TextPrimary,
        textContentColor = AppColors.TextMuted,
        title = {
            Text(if (isEditing) "Edit Webhook" else "Create Webhook", style = AppTypography.Card)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.MD)) {
                AeroTextField(
                    value = url,
                    onValueChange = onUrlChange,
                    label = "Webhook URL",
                    leadingIcon = Icons.Outlined.Link,
                    placeholder = "https://example.com/webhook",
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text("Active", style = AppTypography.Body, color = AppColors.TextPrimary)
                    Switch(
                        checked = isActive,
                        onCheckedChange = onActiveChange,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = AppColors.Blue,
                            checkedTrackColor = AppColors.Blue.copy(alpha = 0.3f),
                            uncheckedThumbColor = AppColors.TextMuted,
                            uncheckedTrackColor = AppColors.Glass,
                        ),
                    )
                }
            }
        },
        confirmButton = {
            AeroButton(
                text = if (isSaving) "Saving..." else "Save",
                onClick = onSave,
                loading = isSaving,
                enabled = url.isNotBlank(),
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

@Composable
private fun EmptyWebhooks(onCreate: () -> Unit) {
    GlassCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(AppSpacing.LG))
            Icon(
                imageVector = Icons.Outlined.Webhook,
                contentDescription = null,
                tint = AppColors.TextDisabled,
                modifier = Modifier.size(40.dp),
            )
            Spacer(Modifier.height(AppSpacing.MD))
            Text(
                text = "No webhooks yet",
                style = AppTypography.Body,
                color = AppColors.TextMuted,
            )
            Spacer(Modifier.height(AppSpacing.XS))
            Text(
                text = "Forward message delivery events to your own server.",
                style = AppTypography.Caption,
                color = AppColors.TextDisabled,
            )
            Spacer(Modifier.height(AppSpacing.LG))
            AeroButton(
                text = "Create Webhook",
                onClick = onCreate,
                icon = Icons.Filled.Add,
            )
            Spacer(Modifier.height(AppSpacing.SM))
        }
    }
}

@Composable
private fun WebhookCard(
    webhook: MemberWebhook,
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
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.SM),
                    modifier = Modifier.weight(1f),
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(if (webhook.active) AppColors.Success else AppColors.TextMuted),
                    )
                    Text(
                        text = webhook.url,
                        style = AppTypography.Card,
                        fontWeight = FontWeight.SemiBold,
                        color = AppColors.TextPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                }
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

            Row(
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.SM),
            ) {
                webhook.events.forEach { event ->
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(AppShapes.Small))
                            .background(AppColors.Blue.copy(alpha = 0.12f))
                            .padding(horizontal = AppSpacing.SM, vertical = 2.dp),
                    ) {
                        Text(
                            text = event,
                            style = AppTypography.Small,
                            color = AppColors.Blue,
                        )
                    }
                }
            }

            Text(
                text = formatDate(webhook.createdAt),
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
