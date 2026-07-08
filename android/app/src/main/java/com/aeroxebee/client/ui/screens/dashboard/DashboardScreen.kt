package com.aeroxebee.client.ui.screens.dashboard

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.aeroxebee.client.data.remote.model.MemberMessage
import com.aeroxebee.client.ui.components.*
import com.aeroxebee.client.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel = hiltViewModel(),
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

        // ─── Loading / Content transition ─────────────────────
        AnimatedVisibility(
            visible = state.isLoading,
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            DashboardSkeleton()
        }

        AnimatedVisibility(
            visible = !state.isLoading,
            enter = fadeIn(animationSpec = tween(400, delayMillis = 100)),
            exit = fadeOut(),
        ) {
            Column {
                // ─── Connection Status Hero ─────────────────
                ConnectionStatusCard(
                    accountName = state.accountName,
                    isConnected = state.isNetworkConnected,
                    mqttConnected = state.mqttConnected,
                    onToggleMqtt = viewModel::toggleMqtt,
                )

                Spacer(Modifier.height(AppSpacing.XXXL))

                // ─── Stats Section ──────────────────────────
                Text(
                    text = "Message Activity",
                    style = AppTypography.Card,
                    color = AppColors.TextSecondary,
                )

                Spacer(Modifier.height(AppSpacing.MD))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.MD),
                ) {
                    StatCard(
                        icon = Icons.Filled.CheckCircle,
                        label = "Sent",
                        value = state.stats.sent.toString(),
                        accentColor = AppColors.Success,
                        bgColor = Color(0xFF064E3B),
                        modifier = Modifier.weight(1f),
                    )
                    StatCard(
                        icon = Icons.Filled.Schedule,
                        label = "Queued",
                        value = state.pendingCount.toString(),
                        accentColor = AppColors.Warning,
                        bgColor = Color(0xFF78350F),
                        modifier = Modifier.weight(1f),
                    )
                    StatCard(
                        icon = Icons.Filled.Error,
                        label = "Failed",
                        value = state.stats.failed.toString(),
                        accentColor = AppColors.Error,
                        bgColor = Color(0xFF7F1D1D),
                        modifier = Modifier.weight(1f),
                    )
                }

                Spacer(Modifier.height(AppSpacing.XXXL))

                // ─── Today's Statistics ──────────────────────
                TodayStatsCard(
                    sent = state.todaySent,
                    delivered = state.todayDelivered,
                    failed = state.todayFailed,
                    successRate = state.todaySuccessRate,
                    totalDevices = state.totalDevices,
                    onlineDevices = state.onlineDevices,
                )

                Spacer(Modifier.height(AppSpacing.XXL))

                // ─── Subscription / Plan ─────────────────────
                SubscriptionCard(
                    planName = state.planName,
                    accountStatus = state.accountStatus,
                    dailyUsage = state.dailyUsage,
                    monthlyUsage = state.monthlyUsage,
                    billingCycle = state.subscriptionBillingCycle,
                    subscriptionStatus = state.subscriptionStatus,
                    renewalDate = state.subscriptionRenewalDate,
                )

                Spacer(Modifier.height(AppSpacing.XXL))

                // ─── SIM Health ──────────────────────────────
                SIMHealthCard(
                    networkType = state.networkType,
                    isNetworkConnected = state.isNetworkConnected,
                    signalRssi = state.signalRssi,
                    signalLevel = state.signalLevel,
                    batteryLevel = state.batteryLevel,
                    isCharging = state.isCharging,
                )

                Spacer(Modifier.height(AppSpacing.XXL))

                // ─── Recent Messages ─────────────────────────
                RecentMessagesCard(messages = state.recentMessages)

                Spacer(Modifier.height(AppSpacing.XXL))

                // ─── Total Messages ─────────────────────────
                TotalMessagesCard(
                    total = state.stats.total.toInt(),
                    sent = state.stats.sent.toInt(),
                    failed = state.stats.failed.toInt(),
                )
            }
        }

        Spacer(Modifier.height(AppSpacing.XXXL))
    }
}

@Composable
private fun ConnectionStatusCard(
    accountName: String,
    isConnected: Boolean,
    mqttConnected: Boolean,
    onToggleMqtt: () -> Unit,
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.6f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "pulseAlpha",
    )

    GradientCard(gradient = listOf(AppColors.Blue.copy(alpha = 0.9f), AppColors.Blue.copy(alpha = 0.6f))) {
        Column {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.SM),
            ) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(CircleShape)
                        .background(if (isConnected) AppColors.Success.copy(alpha = pulseAlpha) else AppColors.Error.copy(alpha = pulseAlpha))
                )
                Text(
                    text = if (isConnected) "Network Connected" else "Network Disconnected",
                    style = AppTypography.Label,
                    color = AppColors.TextPrimary.copy(alpha = 0.9f),
                )
            }

            Spacer(Modifier.height(AppSpacing.SM))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.SM),
                ) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(if (mqttConnected) AppColors.Success.copy(alpha = pulseAlpha) else AppColors.Error.copy(alpha = pulseAlpha))
                    )
                    Text(
                        text = if (mqttConnected) "MQTT Connected" else "MQTT Disconnected",
                        style = AppTypography.Label,
                        color = AppColors.TextPrimary.copy(alpha = 0.9f),
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.SM),
                ) {
                    Icon(
                        imageVector = if (mqttConnected) Icons.Filled.CloudQueue else Icons.Filled.CloudOff,
                        contentDescription = null,
                        tint = if (mqttConnected) AppColors.Success else AppColors.Error,
                        modifier = Modifier.size(18.dp),
                    )
                    Text(
                        text = if (mqttConnected) "Disconnect" else "Reconnect",
                        style = AppTypography.Small,
                        fontWeight = FontWeight.SemiBold,
                        color = if (mqttConnected) AppColors.Error else AppColors.Success,
                        modifier = Modifier.clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                            onClick = onToggleMqtt,
                        ),
                    )
                }
            }

            Spacer(Modifier.height(AppSpacing.MD))

            Text(
                text = "AeroXe Bee",
                style = AppTypography.Title,
                fontWeight = FontWeight.Black,
                color = AppColors.TextPrimary,
            )

            Spacer(Modifier.height(AppSpacing.XS))

            if (accountName.isNotBlank()) {
                Text(
                    text = "Welcome back, $accountName",
                    style = AppTypography.Body,
                    color = AppColors.TextPrimary.copy(alpha = 0.75f),
                    lineHeight = 20.sp,
                )
            }
        }
    }
}

@Composable
private fun TodayStatsCard(
    sent: Long,
    delivered: Long,
    failed: Long,
    successRate: Double,
    totalDevices: Int,
    onlineDevices: Int,
) {
    GlassCard {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Message Overview",
                    style = AppTypography.Card,
                    color = AppColors.TextSecondary,
                )
                val ratePercent = String.format("%.1f%%", successRate * 100)
                Text(
                    text = ratePercent,
                    style = AppTypography.Card,
                    fontWeight = FontWeight.Bold,
                    color = if (successRate >= 0.95) AppColors.Success else if (successRate >= 0.8) AppColors.Warning else AppColors.Error,
                )
            }

            Spacer(Modifier.height(AppSpacing.MD))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                TodayStatItem(label = "Sent", value = sent.toString(), color = AppColors.Blue)
                TodayStatItem(label = "Delivered", value = delivered.toString(), color = AppColors.Success)
                TodayStatItem(label = "Failed", value = failed.toString(), color = AppColors.Error)
            }

            Spacer(Modifier.height(AppSpacing.MD))

            // Devices info
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = "Devices",
                    style = AppTypography.Caption,
                    color = AppColors.TextMuted,
                )
                Text(
                    text = "$onlineDevices online / $totalDevices total",
                    style = AppTypography.Caption,
                    color = if (onlineDevices > 0) AppColors.Success else AppColors.Error,
                )
            }
        }
    }
}

@Composable
private fun TodayStatItem(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            style = AppTypography.Title,
            fontWeight = FontWeight.Bold,
            color = color,
        )
        Spacer(Modifier.height(2.dp))
        Text(
            text = label,
            style = AppTypography.Caption,
            color = AppColors.TextMuted,
        )
    }
}

@Composable
private fun SIMHealthCard(
    networkType: String,
    isNetworkConnected: Boolean,
    signalRssi: Int,
    signalLevel: Int,
    batteryLevel: Int,
    isCharging: Boolean,
) {
    GlassCard {
        Column {
            Text(
                text = "SIM Health",
                style = AppTypography.Card,
                color = AppColors.TextSecondary,
            )

            Spacer(Modifier.height(AppSpacing.MD))

            // Network status row
            InfoRow(
                icon = Icons.Outlined.SignalCellularAlt,
                label = "Network",
                value = if (isNetworkConnected) networkType else "Disconnected",
            )

            Spacer(Modifier.height(AppSpacing.SM))

            // Signal strength row (only show when on cellular)
            if (networkType != "WiFi" && networkType != "Ethernet" && networkType != "Other" && networkType != "None") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.SM),
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.SignalCellularAlt,
                            contentDescription = null,
                            tint = AppColors.TextMuted,
                            modifier = Modifier.size(20.dp),
                        )
                        Text(
                            text = "Signal",
                            style = AppTypography.Caption,
                            color = AppColors.TextMuted,
                        )
                    }
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        for (i in 1..4) {
                            Box(
                                modifier = Modifier
                                    .width(4.dp)
                                    .height((8 + i * 4).dp)
                                    .clip(RoundedCornerShape(2.dp))
                                    .background(
                                        if (i <= signalLevel) AppColors.Success
                                        else AppColors.TextMuted.copy(alpha = 0.3f)
                                    )
                            )
                        }
                        if (signalRssi != 0) {
                            Text(
                                text = "${signalRssi}dBm",
                                style = AppTypography.Caption,
                                color = AppColors.TextMuted,
                                modifier = Modifier.padding(start = 4.dp),
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(AppSpacing.SM))

            // Battery row
            InfoRow(
                icon = Icons.Outlined.BatteryStd,
                label = "Battery",
                value = if (isCharging) "$batteryLevel% ⚡" else "$batteryLevel%",
            )
        }
    }
}

@Composable
private fun RecentMessagesCard(messages: List<MemberMessage>) {
    GlassCard {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Recent Messages",
                    style = AppTypography.Card,
                    color = AppColors.TextSecondary,
                )
                if (messages.isNotEmpty()) {
                    Text(
                        text = "${messages.size} latest",
                        style = AppTypography.Caption,
                        color = AppColors.TextMuted,
                    )
                }
            }

            Spacer(Modifier.height(AppSpacing.MD))

            if (messages.isEmpty()) {
                Text(
                    text = "No messages yet",
                    style = AppTypography.Body,
                    color = AppColors.TextMuted,
                    modifier = Modifier.padding(vertical = AppSpacing.MD),
                )
            } else {
                messages.take(5).forEachIndexed { index, message ->
                    MessageRow(message = message)
                    if (index < messages.lastIndex) {
                        HorizontalDivider(
                            modifier = Modifier.padding(vertical = 4.dp),
                            color = AppColors.Border,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MessageRow(message: MemberMessage) {
    val isSuccess = message.deliveryStatus == "SENT" || message.deliveryStatus == "CARRIER_ACCEPTED" ||
            message.deliveryStatus == "PROBABLE_DELIVERED"
    val iconColor = if (isSuccess) AppColors.Success else AppColors.Error
    val icon = if (isSuccess) Icons.Filled.CheckCircle else Icons.Filled.Error
    val statusText = if (isSuccess) "✔️" else "✖️"

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppSpacing.SM),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = iconColor,
            modifier = Modifier.size(16.dp),
        )

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "$statusText → ${message.recipient}",
                style = AppTypography.Caption,
                color = AppColors.TextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }

        Text(
            text = formatMessageTime(message.createdAt),
            style = AppTypography.Caption,
            color = AppColors.TextMuted,
        )
    }
}

@Composable
private fun TotalMessagesCard(
    total: Int,
    sent: Int,
    failed: Int,
) {
    GlassCard {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Total Messages",
                    style = AppTypography.Card,
                    color = AppColors.TextSecondary,
                )
                Text(
                    text = total.toString(),
                    style = AppTypography.Title,
                    fontWeight = FontWeight.Black,
                    color = AppColors.Blue,
                )
            }

            Spacer(Modifier.height(AppSpacing.MD))

            val progress = if (total > 0) sent.toFloat() / total else 0f
            AeroProgressBar(progress = progress)

            Spacer(Modifier.height(AppSpacing.SM))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = "$sent delivered",
                    style = AppTypography.Caption,
                    color = AppColors.Success,
                )
                if (failed > 0) {
                    Text(
                        text = "$failed failed",
                        style = AppTypography.Caption,
                        color = AppColors.Error,
                    )
                }
            }
        }
    }
}

@Composable
private fun SubscriptionCard(
    planName: String,
    accountStatus: String,
    dailyUsage: Long,
    monthlyUsage: Long,
    billingCycle: String,
    subscriptionStatus: String,
    renewalDate: String,
) {
    GlassCard {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Plan & Usage",
                    style = AppTypography.Card,
                    color = AppColors.TextSecondary,
                )
                if (planName.isNotBlank()) {
                    StatusBadge(
                        text = planName.replaceFirstChar { it.uppercase() },
                        color = AppColors.Blue,
                    )
                }
            }

            Spacer(Modifier.height(AppSpacing.MD))

            InfoRow(
                icon = Icons.Outlined.Verified,
                label = "Status",
                value = when {
                    accountStatus.isNotBlank() -> accountStatus.replaceFirstChar { it.uppercase() }
                    else -> "Active"
                },
            )

            Spacer(Modifier.height(AppSpacing.SM))

            Text(
                text = "Daily Usage",
                style = AppTypography.Caption,
                color = AppColors.TextMuted,
            )
            Spacer(Modifier.height(AppSpacing.XS))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.SM),
            ) {
                AeroProgressBar(
                    progress = if (dailyUsage > 0) (dailyUsage.toFloat() / 500).coerceAtMost(1f) else 0f,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = "$dailyUsage",
                    style = AppTypography.Caption,
                    fontWeight = FontWeight.Medium,
                    color = AppColors.TextPrimary,
                )
            }

            Spacer(Modifier.height(AppSpacing.SM))

            Text(
                text = "Monthly Usage",
                style = AppTypography.Caption,
                color = AppColors.TextMuted,
            )
            Spacer(Modifier.height(AppSpacing.XS))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.SM),
            ) {
                AeroProgressBar(
                    progress = if (monthlyUsage > 0) (monthlyUsage.toFloat() / 10000).coerceAtMost(1f) else 0f,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = "$monthlyUsage",
                    style = AppTypography.Caption,
                    fontWeight = FontWeight.Medium,
                    color = AppColors.TextPrimary,
                )
            }

            if (billingCycle.isNotBlank()) {
                Spacer(Modifier.height(AppSpacing.SM))
                InfoRow(
                    icon = Icons.Outlined.DateRange,
                    label = "Billing",
                    value = when {
                        subscriptionStatus == "active" && renewalDate.isNotBlank() -> "$billingCycle (renews $renewalDate)"
                        else -> billingCycle.replaceFirstChar { it.uppercase() }
                    },
                )
            }
        }
    }
}

private fun formatMessageTime(createdAt: String): String {
    return try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val outputFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
        val date = inputFormat.parse(createdAt)
        if (date != null) outputFormat.format(date) else ""
    } catch (_: Exception) {
        ""
    }
}
