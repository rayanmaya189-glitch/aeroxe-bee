package com.aeroxebee.client.ui.screens.profile

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.aeroxebee.client.ui.components.*
import com.aeroxebee.client.ui.theme.*

@Composable
fun ProfileScreen(
    onLoggedOut: () -> Unit = {},
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val scrollState = rememberScrollState()

    LaunchedEffect(state.isLoggedOut) {
        if (state.isLoggedOut) onLoggedOut()
    }

    var showLogoutDialog by remember { mutableStateOf(false) }
    val displayName = state.name.ifBlank { state.email.substringBefore("@") }
    val initials = displayName.take(1).uppercase()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.Background)
            .verticalScroll(scrollState)
            .padding(horizontal = AppSpacing.XL),
    ) {
        Spacer(Modifier.height(AppSpacing.XL))

        SectionHeader(icon = Icons.Outlined.Person, title = "Profile")

        Spacer(Modifier.height(AppSpacing.XL))

        GlassCard {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.LG),
            ) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(CircleShape)
                        .background(AppColors.GradientBlue.first()),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = initials,
                        style = AppTypography.Title,
                        color = AppColors.TextPrimary,
                    )
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = displayName,
                        style = AppTypography.Card,
                        fontWeight = FontWeight.Bold,
                        color = AppColors.TextPrimary,
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = state.email,
                        style = AppTypography.Body,
                        color = AppColors.TextMuted,
                    )
                }

                StatusBadge(text = "Active", color = AppColors.Success)
            }
        }

        Spacer(Modifier.height(AppSpacing.XXL))

        SectionHeader(icon = Icons.Outlined.Info, title = "Account Details")

        Spacer(Modifier.height(AppSpacing.MD))

        GlassCard {
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.MD)) {
                InfoRow(icon = Icons.Outlined.Email, label = "Email", value = state.email)
                if (state.accountId.isNotBlank()) {
                    HorizontalDivider(color = AppColors.Border)
                    InfoRow(icon = Icons.Outlined.Badge, label = "Account ID", value = state.accountId)
                }
            }
        }

        Spacer(Modifier.height(AppSpacing.XXL))

        SectionHeader(icon = Icons.Outlined.PhoneAndroid, title = "Device")

        Spacer(Modifier.height(AppSpacing.MD))

        GlassCard {
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.LG)) {
                AeroTextField(
                    value = state.deviceName,
                    onValueChange = viewModel::updateDeviceName,
                    label = "Device Name",
                    leadingIcon = Icons.Outlined.Label,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { viewModel.saveDeviceName() }),
                )

                AeroButton(
                    text = if (state.isSavingName) "Saving..." else "Save Name",
                    onClick = { viewModel.saveDeviceName() },
                    loading = state.isSavingName,
                    enabled = state.deviceName.isNotBlank(),
                )

                AnimatedVisibility(
                    visible = state.nameSaved,
                    enter = expandVertically(tween(300)) + fadeIn(tween(300)),
                    exit = shrinkVertically(tween(200)) + fadeOut(tween(200)),
                ) {
                    Text(
                        text = "Device name saved",
                        style = AppTypography.Body,
                        color = AppColors.Success,
                    )
                }

                state.nameError?.let { error ->
                    Text(
                        text = error,
                        style = AppTypography.Caption,
                        color = AppColors.Error,
                    )
                }
            }
        }

        Spacer(Modifier.height(AppSpacing.XXL))

        SectionHeader(icon = Icons.Outlined.ExitToApp, title = "Session")

        Spacer(Modifier.height(AppSpacing.MD))

        GlassCard {
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.MD)) {
                Text(
                    text = "Sign out and switch to a different merchant account.",
                    style = AppTypography.Caption,
                    color = AppColors.TextMuted,
                )
                AeroButton(
                    text = if (state.isLoading) "Signing out..." else "Logout",
                    onClick = { showLogoutDialog = true },
                    loading = state.isLoading,
                    variant = ButtonVariant.Danger,
                )
            }
        }

        Spacer(Modifier.height(AppSpacing.XXXL))
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            containerColor = AppColors.Glass,
            titleContentColor = AppColors.TextPrimary,
            textContentColor = AppColors.TextMuted,
            title = { Text("Sign out?", fontWeight = FontWeight.Bold) },
            text = {
                Text("You'll need to sign in again or scan a QR code to reconnect this device.")
            },
            confirmButton = {
                AeroButton(
                    text = "Sign out",
                    onClick = {
                        showLogoutDialog = false
                        viewModel.logout()
                    },
                    loading = state.isLoading,
                )
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Cancel", color = AppColors.TextMuted)
                }
            },
        )
    }
}
