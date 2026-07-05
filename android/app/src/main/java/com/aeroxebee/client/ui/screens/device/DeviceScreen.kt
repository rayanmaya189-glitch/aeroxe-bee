package com.aeroxebee.client.ui.screens.device

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.aeroxebee.client.domain.model.DeviceState
import com.aeroxebee.client.ui.components.*
import com.aeroxebee.client.ui.theme.*

@Composable
fun DeviceScreen(
    viewModel: DeviceViewModel = hiltViewModel(),
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

        AnimatedVisibility(
            visible = state.isLoading,
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            DeviceSkeleton()
        }

        AnimatedVisibility(
            visible = !state.isLoading,
            enter = fadeIn(animationSpec = tween(400, delayMillis = 100)),
            exit = fadeOut(),
        ) {
            Column {
                // ─── Device Health Hero ─────────────────────
                DeviceHealthCard(state)

                Spacer(Modifier.height(AppSpacing.XXL))

                // ─── Device Info ────────────────────────────
                SectionHeader(icon = Icons.Outlined.Info, title = "Device Info")

                Spacer(Modifier.height(AppSpacing.MD))

                GlassCard {
                    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.SM)) {
                        InfoRow(Icons.Outlined.PhoneAndroid, "Model", state.deviceInfo.model)
                        InfoRow(Icons.Outlined.Business, "Manufacturer", state.deviceInfo.manufacturer)
                        InfoRow(Icons.Outlined.SystemUpdate, "OS Version", state.deviceInfo.osVersion)
                        InfoRow(Icons.Outlined.Code, "SDK Level", state.deviceInfo.sdkLevel.toString())
                    }
                }

                Spacer(Modifier.height(AppSpacing.XXL))

                // ─── SIM Cards ──────────────────────────────
                SectionHeader(icon = Icons.Outlined.SimCard, title = "SIM Cards")

                Spacer(Modifier.height(AppSpacing.MD))

                if (state.deviceInfo.simSlots.isEmpty()) {
                    GlassCard {
                        Box(
                            modifier = Modifier.fillMaxWidth(),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = "No SIM slots detected",
                                style = AppTypography.Body,
                                color = AppColors.TextMuted,
                            )
                        }
                    }
                } else {
                    state.deviceInfo.simSlots.forEachIndexed { index, slot ->
                        SimSlotCard(
                            slotNumber = slot.slot + 1,
                            carrier = slot.carrier,
                            phoneNumber = slot.phoneNumber,
                        )
                        if (index < state.deviceInfo.simSlots.lastIndex) {
                            Spacer(Modifier.height(AppSpacing.SM))
                        }
                    }
                }

                Spacer(Modifier.height(AppSpacing.XXL))

                // ─── Permissions ────────────────────────────
                SectionHeader(icon = Icons.Outlined.Security, title = "Permissions")

                Spacer(Modifier.height(AppSpacing.MD))

                PermissionCard(
                    icon = Icons.Outlined.BatteryFull,
                    title = "Battery optimization",
                    isGranted = !state.isBatteryOptimized,
                    grantedLabel = "Disabled",
                    notGrantedLabel = "Enabled — background may be restricted",
                    actionLabel = "Disable",
                    onAction = { viewModel.requestBatteryOptimization() },
                )

                Spacer(Modifier.height(AppSpacing.SM))

                PermissionCard(
                    icon = Icons.Outlined.Alarm,
                    title = "Exact alarm permission",
                    isGranted = state.canScheduleExactAlarms,
                    grantedLabel = "Granted",
                    notGrantedLabel = "Not granted",
                    actionLabel = "Grant permission",
                    onAction = { viewModel.requestExactAlarmPermission() },
                    hideActionWhenGranted = true,
                )

                state.batteryGuide?.let { guide ->
                    Spacer(Modifier.height(AppSpacing.LG))
                    GlassCard {
                        Column {
                            Text(
                                text = "Guide for ${guide.displayName}",
                                style = AppTypography.Label,
                                color = AppColors.Blue,
                            )
                            Spacer(Modifier.height(AppSpacing.SM))
                            guide.instructions.forEachIndexed { index, instruction ->
                                Row(
                                    modifier = Modifier.padding(vertical = 3.dp),
                                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.SM),
                                ) {
                                    Text(
                                        text = "${index + 1}.",
                                        style = AppTypography.Caption,
                                        fontWeight = FontWeight.Bold,
                                        color = AppColors.Blue,
                                    )
                                    Text(
                                        text = instruction,
                                        style = AppTypography.Caption,
                                        color = AppColors.TextMuted,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(AppSpacing.XXXL))
    }
}

@Composable
private fun DeviceHealthCard(state: DeviceScreenState) {
    val (label, color, icon) = when (state.deviceState) {
        DeviceState.ACTIVE -> Triple("Healthy", AppColors.Success, Icons.Filled.CheckCircle)
        DeviceState.DOZE_RISK -> Triple("Doze Risk", AppColors.Warning, Icons.Filled.Warning)
        DeviceState.OEM_KILL_RISK -> Triple("OEM Kill Risk", AppColors.Error, Icons.Filled.Error)
    }

    GradientCard(gradient = listOf(color.copy(alpha = 0.2f), color.copy(alpha = 0.08f))) {
        Column {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.SM),
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = label,
                    tint = color,
                    modifier = Modifier.size(20.dp),
                )
                Text(
                    text = "Device Health",
                    style = AppTypography.Label,
                    color = color.copy(alpha = 0.8f),
                )
            }

            Spacer(Modifier.height(AppSpacing.MD))

            Text(
                text = label,
                style = AppTypography.Hero,
                fontWeight = FontWeight.Black,
                color = color,
            )

            Spacer(Modifier.height(AppSpacing.SM))

            Row(horizontalArrangement = Arrangement.spacedBy(AppSpacing.LG)) {
                Text(
                    text = state.deviceInfo.model,
                    style = AppTypography.Body,
                    color = AppColors.TextSecondary,
                )
                Text(
                    text = "${state.deviceInfo.osVersion} · SDK ${state.deviceInfo.sdkLevel}",
                    style = AppTypography.Caption,
                    color = AppColors.TextMuted,
                )
            }
        }
    }
}

@Composable
private fun SimSlotCard(slotNumber: Int, carrier: String, phoneNumber: String) {
    GlassCard {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.LG),
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(AppShapes.Medium))
                    .background(AppColors.Blue.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Outlined.SimCard,
                    contentDescription = "SIM",
                    tint = AppColors.Blue,
                    modifier = Modifier.size(22.dp),
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "SIM $slotNumber",
                    style = AppTypography.Card,
                    fontWeight = FontWeight.SemiBold,
                    color = AppColors.TextPrimary,
                )
                Text(
                    text = carrier.ifBlank { "Unknown carrier" },
                    style = AppTypography.Caption,
                    color = AppColors.TextMuted,
                )
            }

            Text(
                text = phoneNumber.ifBlank { "N/A" },
                style = AppTypography.Caption,
                color = AppColors.TextMuted,
            )
        }
    }
}

@Composable
private fun PermissionCard(
    icon: ImageVector,
    title: String,
    isGranted: Boolean,
    grantedLabel: String,
    notGrantedLabel: String,
    actionLabel: String,
    onAction: () -> Unit,
    hideActionWhenGranted: Boolean = false,
) {
    GlassCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.MD),
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(
                        if (isGranted) AppColors.Success.copy(alpha = 0.15f)
                        else AppColors.Error.copy(alpha = 0.15f)
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = if (isGranted) AppColors.Success else AppColors.Error,
                    modifier = Modifier.size(18.dp),
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = AppTypography.Card,
                    fontWeight = FontWeight.SemiBold,
                    color = AppColors.TextPrimary,
                )
                Text(
                    text = if (isGranted) grantedLabel else notGrantedLabel,
                    style = AppTypography.Caption,
                    color = if (isGranted) AppColors.Success else AppColors.Error,
                )
            }

            if (!isGranted && !hideActionWhenGranted) {
                TextButton(onClick = onAction) {
                    Text(actionLabel, color = AppColors.Blue)
                }
            }
        }
    }
}
