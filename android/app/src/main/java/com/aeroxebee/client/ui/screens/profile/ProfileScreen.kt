package com.aeroxebee.client.ui.screens.profile

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
import com.aeroxebee.client.ui.components.*
import com.aeroxebee.client.ui.theme.*

@Composable
fun ProfileScreen() {
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.Background)
            .verticalScroll(scrollState)
            .padding(horizontal = AppSpacing.XL),
    ) {
        Spacer(Modifier.height(AppSpacing.XL))

        // Header
        SectionHeader(icon = Icons.Outlined.Person, title = "Profile")

        Spacer(Modifier.height(AppSpacing.XL))

        // Avatar + Name card
        GlassCard {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.LG),
            ) {
                // Avatar circle
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(CircleShape)
                        .background(AppColors.GradientBlue.first()),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = "A",
                        style = AppTypography.Title,
                        color = AppColors.TextPrimary,
                    )
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Account Owner",
                        style = AppTypography.Card,
                        fontWeight = FontWeight.Bold,
                        color = AppColors.TextPrimary,
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = "admin@aeroxe.com",
                        style = AppTypography.Body,
                        color = AppColors.TextMuted,
                    )
                }

                StatusBadge(text = "Active", color = AppColors.Success)
            }
        }

        Spacer(Modifier.height(AppSpacing.XXL))

        // Account Details
        SectionHeader(icon = Icons.Outlined.Info, title = "Account Details")

        Spacer(Modifier.height(AppSpacing.MD))

        GlassCard {
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.MD)) {
                InfoRow(icon = Icons.Outlined.Email, label = "Email", value = "admin@aeroxe.com")
                HorizontalDivider(color = AppColors.Border)
                InfoRow(icon = Icons.Outlined.Badge, label = "Role", value = "Admin")
                HorizontalDivider(color = AppColors.Border)
                InfoRow(icon = Icons.Outlined.CalendarToday, label = "Member Since", value = "July 2026")
                HorizontalDivider(color = AppColors.Border)
                InfoRow(icon = Icons.Outlined.Security, label = "2FA Status", value = "Enabled")
            }
        }

        Spacer(Modifier.height(AppSpacing.XXL))

        // Subscription
        SectionHeader(icon = Icons.Outlined.CardMembership, title = "Subscription")

        Spacer(Modifier.height(AppSpacing.MD))

        GlassCard {
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.MD)) {
                InfoRow(icon = Icons.Outlined.Work, label = "Plan", value = "Free")
                HorizontalDivider(color = AppColors.Border)
                InfoRow(icon = Icons.Outlined.Speed, label = "Daily Quota", value = "100 SMS")
                HorizontalDivider(color = AppColors.Border)
                InfoRow(icon = Icons.Outlined.DateRange, label = "Monthly Quota", value = "3,000 SMS")
                HorizontalDivider(color = AppColors.Border)
                InfoRow(icon = Icons.Outlined.Refresh, label = "Renewal", value = "N/A")
            }
        }

        Spacer(Modifier.height(AppSpacing.XXXL))
    }
}
