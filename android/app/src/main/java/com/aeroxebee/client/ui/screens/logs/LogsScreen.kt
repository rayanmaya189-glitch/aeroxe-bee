package com.aeroxebee.client.ui.screens.logs

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
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.aeroxebee.client.domain.model.SyncLog
import com.aeroxebee.client.ui.components.GlassCard
import com.aeroxebee.client.ui.components.SectionHeader
import com.aeroxebee.client.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun LogsScreen(
    viewModel: LogsViewModel = hiltViewModel(),
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

        SectionHeader(icon = Icons.Outlined.SwapVert, title = "SMS Logs")

        Spacer(Modifier.height(AppSpacing.MD))

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
            if (state.logs.isEmpty()) {
                EmptyLogs()
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.MD)) {
                    state.logs.forEach { log ->
                        LogCard(log = log)
                    }
                }
            }
        }

        Spacer(Modifier.height(AppSpacing.XXXL))
    }
}

@Composable
private fun EmptyLogs() {
    GlassCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(AppSpacing.LG))
            Icon(
                imageVector = Icons.Outlined.Inbox,
                contentDescription = null,
                tint = AppColors.TextDisabled,
                modifier = Modifier.size(40.dp),
            )
            Spacer(Modifier.height(AppSpacing.MD))
            Text(
                text = "No SMS logs yet",
                style = AppTypography.Body,
                color = AppColors.TextMuted,
            )
            Spacer(Modifier.height(AppSpacing.XS))
            Text(
                text = "Logs will appear here when SMS messages are processed.",
                style = AppTypography.Caption,
                color = AppColors.TextDisabled,
            )
            Spacer(Modifier.height(AppSpacing.LG))
        }
    }
}

@Composable
private fun LogCard(log: SyncLog) {
    val (icon, accentColor, eventLabel) = when (log.event) {
        "SENT", "DELIVERED" -> Triple(Icons.Outlined.CheckCircle, AppColors.Success, log.event)
        "FAILED" -> Triple(Icons.Outlined.ErrorOutline, AppColors.Error, log.event)
        "RATE_LIMITED", "TOO_LONG" -> Triple(Icons.Outlined.Warning, AppColors.Warning, log.event)
        else -> Triple(Icons.Outlined.Info, AppColors.Blue, log.event)
    }

    GlassCard {
        Row(
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(AppSpacing.MD),
        ) {
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

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = eventLabel,
                        style = AppTypography.Label,
                        fontWeight = FontWeight.SemiBold,
                        color = accentColor,
                    )
                    Text(
                        text = formatLogTimestamp(log.timestamp),
                        style = AppTypography.Caption,
                        color = AppColors.TextDisabled,
                    )
                }

                log.message?.let { msg ->
                    if (msg.isNotBlank()) {
                        Spacer(Modifier.height(AppSpacing.XS))
                        Text(
                            text = msg,
                            style = AppTypography.Caption,
                            color = AppColors.TextSecondary,
                        )
                    }
                }

                if (log.taskId.isNotBlank()) {
                    Spacer(Modifier.height(AppSpacing.XS))
                    Text(
                        text = "Task: ${log.taskId.take(12)}...",
                        style = AppTypography.Caption,
                        color = AppColors.TextDisabled,
                    )
                }
            }
        }
    }
}

private fun formatLogTimestamp(timestamp: Long): String {
    return try {
        val sdf = SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault())
        sdf.format(Date(timestamp))
    } catch (_: Exception) {
        ""
    }
}
