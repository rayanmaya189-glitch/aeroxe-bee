package com.textbee.client.ui.screens.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.textbee.client.ui.components.*
import com.textbee.client.ui.theme.*

data class NotificationItem(
    val id: String,
    val title: String,
    val message: String,
    val time: String,
    val type: NotificationType,
    val read: Boolean = false,
)

enum class NotificationType { Success, Warning, Error, Info }

@Composable
fun NotificationsScreen() {
    val scrollState = rememberScrollState()

    val notifications = listOf(
        NotificationItem(
            id = "1",
            title = "Device Connected",
            message = "Your device Pixel 7 (SIM 1) has come online and is ready to send SMS.",
            time = "2 min ago",
            type = NotificationType.Success,
        ),
        NotificationItem(
            id = "2",
            title = "SMS Delivered",
            message = "OTP message to +1 555-0123 delivered with 98% confidence score.",
            time = "5 min ago",
            type = NotificationType.Success,
        ),
        NotificationItem(
            id = "3",
            title = "SIM Health Warning",
            message = "Device Galaxy S23 (SIM 2) showing degraded delivery rate (55%). Monitoring.",
            time = "1 hour ago",
            type = NotificationType.Warning,
        ),
        NotificationItem(
            id = "4",
            title = "Quota Alert",
            message = "You've used 80% of your daily SMS quota. Consider upgrading your plan.",
            time = "3 hours ago",
            type = NotificationType.Warning,
        ),
        NotificationItem(
            id = "5",
            title = "Circuit Breaker Opened",
            message = "Device OnePlus 11 circuit breaker opened after 5 consecutive failures. Cooling down.",
            time = "6 hours ago",
            type = NotificationType.Error,
        ),
        NotificationItem(
            id = "6",
            title = "System Update",
            message = "Platform maintenance scheduled for July 5, 2026 02:00-04:00 UTC.",
            time = "1 day ago",
            type = NotificationType.Info,
        ),
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.Background)
            .verticalScroll(scrollState)
            .padding(horizontal = AppSpacing.XL),
    ) {
        Spacer(Modifier.height(AppSpacing.XL))

        SectionHeader(icon = Icons.Outlined.Notifications, title = "Notifications")

        Spacer(Modifier.height(AppSpacing.MD))

        Text(
            text = "${notifications.count { !it.read }} unread",
            style = AppTypography.Caption,
            color = AppColors.TextMuted,
        )

        Spacer(Modifier.height(AppSpacing.LG))

        notifications.forEach { notification ->
            NotificationCard(notification)
            Spacer(Modifier.height(AppSpacing.MD))
        }

        Spacer(Modifier.height(AppSpacing.XXXL))
    }
}

@Composable
private fun NotificationCard(item: NotificationItem) {
    val (accentColor, icon) = when (item.type) {
        NotificationType.Success -> AppColors.Success to Icons.Outlined.CheckCircle
        NotificationType.Warning -> AppColors.Warning to Icons.Outlined.Warning
        NotificationType.Error -> AppColors.Error to Icons.Outlined.ErrorOutline
        NotificationType.Info -> AppColors.Blue to Icons.Outlined.Info
    }

    GlassCard {
        Row(
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.MD),
        ) {
            // Icon
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(AppShapes.Small))
                    .background(accentColor.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = accentColor,
                    modifier = Modifier.size(18.dp),
                )
            }

            // Content
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(AppSpacing.SM),
                ) {
                    Text(
                        text = item.title,
                        style = AppTypography.Card,
                        fontWeight = FontWeight.SemiBold,
                        color = AppColors.TextPrimary,
                        modifier = Modifier.weight(1f),
                    )
                    if (!item.read) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(AppColors.Blue),
                        )
                    }
                }

                Spacer(Modifier.height(AppSpacing.XS))

                Text(
                    text = item.message,
                    style = AppTypography.Body,
                    color = AppColors.TextSecondary,
                )

                Spacer(Modifier.height(AppSpacing.SM))

                Text(
                    text = item.time,
                    style = AppTypography.Caption,
                    color = AppColors.TextDisabled,
                )
            }
        }
    }
}
