package com.textbee.client.ui.screens.dashboard

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.textbee.client.ui.components.*
import com.textbee.client.ui.theme.*

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
                    sentCount = state.stats.sent,
                    totalMessages = state.stats.total,
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

                // ─── Total Messages ─────────────────────────
                TotalMessagesCard(
                    total = state.stats.total,
                    sent = state.stats.sent,
                    failed = state.stats.failed,
                )
            }
        }

        Spacer(Modifier.height(AppSpacing.XXXL))
    }
}

@Composable
private fun ConnectionStatusCard(
    sentCount: Int,
    totalMessages: Int,
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
                        .background(AppColors.Success.copy(alpha = pulseAlpha))
                )
                Text(
                    text = "Connected",
                    style = AppTypography.Label,
                    color = AppColors.TextPrimary.copy(alpha = 0.9f),
                )
            }

            Spacer(Modifier.height(AppSpacing.MD))

            Text(
                text = "AeroXe Bee",
                style = AppTypography.Title,
                fontWeight = FontWeight.Black,
                color = AppColors.TextPrimary,
            )

            Spacer(Modifier.height(AppSpacing.XS))

            Text(
                text = "SMS gateway is running. Messages are being routed through your device.",
                style = AppTypography.Body,
                color = AppColors.TextPrimary.copy(alpha = 0.75f),
                lineHeight = 20.sp,
            )
        }
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
