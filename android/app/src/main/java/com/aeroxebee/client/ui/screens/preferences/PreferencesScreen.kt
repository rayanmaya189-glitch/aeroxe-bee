package com.aeroxebee.client.ui.screens.preferences

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.aeroxebee.client.ui.components.*
import com.aeroxebee.client.ui.theme.*

@Composable
fun PreferencesScreen(
    onBack: () -> Unit = {},
    viewModel: PreferencesViewModel = hiltViewModel(),
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
            SectionHeader(icon = Icons.Outlined.Settings, title = "Preferences")
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
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.XXL)) {
                // ─── Notifications ────────────────────────────────
                SectionHeader(icon = Icons.Outlined.Notifications, title = "Notifications")
                GlassCard {
                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.LG)) {
                        PreferenceToggle(
                            icon = Icons.Outlined.Email,
                            title = "Email Notifications",
                            subtitle = "Receive updates and alerts via email",
                            checked = state.preferences.emailNotifications,
                            onCheckedChange = viewModel::setEmailNotifications,
                            enabled = !state.isSaving,
                        )
                        HorizontalDivider(color = AppColors.Border)
                        PreferenceToggle(
                            icon = Icons.Outlined.Sms,
                            title = "SMS Notifications",
                            subtitle = "Receive SMS delivery reports",
                            checked = state.preferences.smsNotifications,
                            onCheckedChange = viewModel::setSmsNotifications,
                            enabled = !state.isSaving,
                        )
                        HorizontalDivider(color = AppColors.Border)
                        PreferenceToggle(
                            icon = Icons.Outlined.Webhook,
                            title = "Webhook Notifications",
                            subtitle = "Trigger webhooks on message events",
                            checked = state.preferences.webhookNotifications,
                            onCheckedChange = viewModel::setWebhookNotifications,
                            enabled = !state.isSaving,
                        )
                    }
                }

                // ─── Alerts ───────────────────────────────────────
                SectionHeader(icon = Icons.Outlined.Warning, title = "Alerts")
                GlassCard {
                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.LG)) {
                        PreferenceToggle(
                            icon = Icons.Outlined.AccountBalanceWallet,
                            title = "Billing Alerts",
                            subtitle = "Get notified about billing and plan changes",
                            checked = state.preferences.billingAlerts,
                            onCheckedChange = viewModel::setBillingAlerts,
                            enabled = !state.isSaving,
                        )
                        HorizontalDivider(color = AppColors.Border)
                        PreferenceToggle(
                            icon = Icons.Outlined.Security,
                            title = "Security Alerts",
                            subtitle = "Receive alerts for security-related events",
                            checked = state.preferences.securityAlerts,
                            onCheckedChange = viewModel::setSecurityAlerts,
                            enabled = !state.isSaving,
                        )
                    }
                }

                // ─── Saved indicator ──────────────────────────────
                AnimatedVisibility(
                    visible = state.saved,
                    enter = expandVertically() + fadeIn(),
                    exit = shrinkVertically() + fadeOut(),
                ) {
                    Text(
                        text = "Preferences saved",
                        style = AppTypography.Body,
                        color = AppColors.Success,
                        modifier = Modifier.padding(top = AppSpacing.SM),
                    )
                }
            }
        }

        Spacer(Modifier.height(AppSpacing.XXXL))
    }
}

@Composable
private fun PreferenceToggle(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    enabled: Boolean,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppSpacing.MD),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = AppColors.TextMuted.copy(alpha = 0.6f),
            modifier = Modifier.size(20.dp),
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = AppTypography.Body,
                color = AppColors.TextPrimary,
            )
            Text(
                text = subtitle,
                style = AppTypography.Caption,
                color = AppColors.TextMuted,
            )
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            enabled = enabled,
            colors = SwitchDefaults.colors(
                checkedThumbColor = AppColors.Blue,
                checkedTrackColor = AppColors.Blue.copy(alpha = 0.3f),
                uncheckedThumbColor = AppColors.TextMuted,
                uncheckedTrackColor = AppColors.Glass,
            ),
        )
    }
}
