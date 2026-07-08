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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material.icons.outlined.Build
import androidx.compose.material.icons.outlined.ChevronRight
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
    onNavigateToKyc: () -> Unit = {},
    onNavigateToChangePassword: () -> Unit = {},
    onNavigateToOtp: () -> Unit = {},
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val scrollState = rememberScrollState()

    LaunchedEffect(state.isLoggedOut) {
        if (state.isLoggedOut) onLoggedOut()
    }

    var showLogoutDialog by remember { mutableStateOf(false) }
    var show2FADisableDialog by remember { mutableStateOf(false) }
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

        // ─── Account Details ──────────────────────────────────
        SectionHeader(icon = Icons.Outlined.Info, title = "Account Details")

        Spacer(Modifier.height(AppSpacing.MD))

        GlassCard {
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.MD)) {
                InfoRow(icon = Icons.Outlined.Email, label = "Email", value = state.email)
                if (state.accountId.isNotBlank()) {
                    HorizontalDivider(color = AppColors.Border)
                    InfoRow(icon = Icons.Outlined.Badge, label = "Account ID", value = state.accountId)
                }
                if (state.planName.isNotBlank()) {
                    HorizontalDivider(color = AppColors.Border)
                    InfoRow(icon = Icons.Outlined.Subscriptions, label = "Plan", value = state.planName)
                }
                if (state.accountStatus.isNotBlank()) {
                    HorizontalDivider(color = AppColors.Border)
                    InfoRow(icon = Icons.Outlined.Verified, label = "Status", value = state.accountStatus.replaceFirstChar { it.uppercase() })
                }
                if (state.dailyUsage > 0 || state.monthlyUsage > 0) {
                    HorizontalDivider(color = AppColors.Border)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text("Usage", style = AppTypography.Body, color = AppColors.TextMuted)
                        Text(
                            text = "${state.dailyUsage}D / ${state.monthlyUsage}M",
                            style = AppTypography.Body,
                            fontWeight = FontWeight.Medium,
                            color = AppColors.TextPrimary,
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(AppSpacing.XXL))

        // ─── KYC Verification ──────────────────────────────────
        SectionHeader(icon = Icons.Outlined.Verified, title = "Verification")

        Spacer(Modifier.height(AppSpacing.MD))

        GlassCard(onClick = onNavigateToKyc) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "KYC Verification",
                        style = AppTypography.Body,
                        color = AppColors.TextPrimary,
                    )
                    Text(
                        text = "Verify your identity",
                        style = AppTypography.Caption,
                        color = AppColors.TextMuted,
                    )
                }
                Icon(
                    imageVector = Icons.Outlined.ChevronRight,
                    contentDescription = "Open KYC",
                    tint = AppColors.TextMuted,
                    modifier = Modifier.size(20.dp),
                )
            }
        }

        Spacer(Modifier.height(AppSpacing.XXL))

        // ─── Device ───────────────────────────────────────────
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

        // ─── Security (2FA) ───────────────────────────────────
        SectionHeader(icon = Icons.Outlined.Lock, title = "Security")

        Spacer(Modifier.height(AppSpacing.MD))

        GlassCard {
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.LG)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Two-Factor Authentication",
                            style = AppTypography.Body,
                            color = AppColors.TextPrimary,
                        )
                        Text(
                            text = if (state.twoFAEnabled) "2FA is active" else "Add an extra layer of security",
                            style = AppTypography.Caption,
                            color = if (state.twoFAEnabled) AppColors.Success else AppColors.TextMuted,
                        )
                    }
                    StatusBadge(
                        text = if (state.twoFAEnabled) "Enabled" else "Disabled",
                        color = if (state.twoFAEnabled) AppColors.Success else AppColors.TextMuted,
                    )
                }

                state.twoFASuccess?.let { msg ->
                    Text(
                        text = msg,
                        style = AppTypography.Body,
                        color = AppColors.Success,
                    )
                }

                if (state.twoFAEnabled) {
                    AeroButton(
                        text = "Disable 2FA",
                        onClick = { show2FADisableDialog = true },
                        variant = ButtonVariant.Secondary,
                    )
                } else {
                    AeroButton(
                        text = if (state.isLoading2FA) "Setting up..." else "Enable 2FA",
                        onClick = { viewModel.setup2FA() },
                        loading = state.isLoading2FA,
                    )
                }
            }
        }

        Spacer(Modifier.height(AppSpacing.XXL))

        // ─── Change Password ───────────────────────────────────
        GlassCard(onClick = onNavigateToChangePassword) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Change Password",
                        style = AppTypography.Body,
                        color = AppColors.TextPrimary,
                    )
                    Text(
                        text = "Update your account password",
                        style = AppTypography.Caption,
                        color = AppColors.TextMuted,
                    )
                }
                Icon(
                    imageVector = Icons.Outlined.ChevronRight,
                    contentDescription = "Change Password",
                    tint = AppColors.TextMuted,
                    modifier = Modifier.size(20.dp),
                )
            }
        }

        Spacer(Modifier.height(AppSpacing.XXL))

        // ─── Tools ─────────────────────────────────────────────
        SectionHeader(icon = Icons.Outlined.Build, title = "Tools")

        Spacer(Modifier.height(AppSpacing.MD))

        GlassCard(onClick = onNavigateToOtp) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "OTP Tool",
                        style = AppTypography.Body,
                        color = AppColors.TextPrimary,
                    )
                    Text(
                        text = "Send and verify OTP codes",
                        style = AppTypography.Caption,
                        color = AppColors.TextMuted,
                    )
                }
                Icon(
                    imageVector = Icons.Outlined.ChevronRight,
                    contentDescription = "Open OTP Tool",
                    tint = AppColors.TextMuted,
                    modifier = Modifier.size(20.dp),
                )
            }
        }

        Spacer(Modifier.height(AppSpacing.XXL))

        // ─── Session ──────────────────────────────────────────
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

    // ─── 2FA Setup Dialog ─────────────────────────────────────
    if (state.show2FASetup) {
        AlertDialog(
            onDismissRequest = { if (!state.isLoading2FA) viewModel.cancel2FASetup() },
            containerColor = AppColors.SecondaryBg,
            titleContentColor = AppColors.TextPrimary,
            textContentColor = AppColors.TextMuted,
            title = {
                Text("Enable 2FA", style = AppTypography.Card)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.MD)) {
                    Text(
                        text = "Scan this secret with an authenticator app (e.g. Google Authenticator) or enter it manually.",
                        style = AppTypography.Body,
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(AppShapes.Medium))
                            .background(AppColors.Glass)
                            .padding(AppSpacing.MD),
                    ) {
                        Text(
                            text = state.twoFASetupSecret,
                            style = AppTypography.Body,
                            fontWeight = FontWeight.Bold,
                            color = AppColors.TextPrimary,
                        )
                    }
                    AeroTextField(
                        value = state.verifyCode,
                        onValueChange = viewModel::updateVerifyCode,
                        label = "Verification Code",
                        leadingIcon = Icons.Outlined.Pin,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { viewModel.verify2FA() }),
                    )
                    state.twoFAError?.let { error ->
                        Text(error, style = AppTypography.Caption, color = AppColors.Error)
                    }
                }
            },
            confirmButton = {
                AeroButton(
                    text = if (state.isLoading2FA) "Verifying..." else "Verify & Enable",
                    onClick = { viewModel.verify2FA() },
                    loading = state.isLoading2FA,
                    enabled = state.verifyCode.isNotBlank(),
                )
            },
            dismissButton = {
                TextButton(
                    onClick = { viewModel.cancel2FASetup() },
                    enabled = !state.isLoading2FA,
                ) {
                    Text("Cancel", color = AppColors.TextMuted)
                }
            },
        )
    }

    // ─── 2FA Disable Dialog ────────────────────────────────────
    if (show2FADisableDialog) {
        AlertDialog(
            onDismissRequest = { show2FADisableDialog = false },
            containerColor = AppColors.Glass,
            titleContentColor = AppColors.TextPrimary,
            textContentColor = AppColors.TextMuted,
            title = { Text("Disable 2FA?", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.MD)) {
                    Text("Enter your authenticator code to disable two-factor authentication.")
                    AeroTextField(
                        value = state.verifyCode,
                        onValueChange = viewModel::updateVerifyCode,
                        label = "Verification Code",
                        leadingIcon = Icons.Outlined.Pin,
                    )
                    state.twoFAError?.let { error ->
                        Text(error, style = AppTypography.Caption, color = AppColors.Error)
                    }
                }
            },
            confirmButton = {
                AeroButton(
                    text = if (state.isLoading2FA) "Disabling..." else "Disable",
                    onClick = {
                        viewModel.disable2FA()
                        show2FADisableDialog = false
                    },
                    loading = state.isLoading2FA,
                    variant = ButtonVariant.Danger,
                    enabled = state.verifyCode.isNotBlank(),
                )
            },
            dismissButton = {
                TextButton(onClick = {
                    show2FADisableDialog = false
                    viewModel.clearTwoFAMessages()
                }) {
                    Text("Cancel", color = AppColors.TextMuted)
                }
            },
        )
    }

    // ─── Logout Dialog ────────────────────────────────────────
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
