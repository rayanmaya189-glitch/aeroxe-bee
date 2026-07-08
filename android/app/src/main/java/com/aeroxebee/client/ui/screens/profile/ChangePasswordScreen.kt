package com.aeroxebee.client.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.aeroxebee.client.ui.components.*
import com.aeroxebee.client.ui.theme.*

@Composable
fun ChangePasswordScreen(
    onBack: () -> Unit,
    viewModel: ChangePasswordViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val scrollState = rememberScrollState()

    LaunchedEffect(state.isSuccess) {
        if (state.isSuccess) {
            kotlinx.coroutines.delay(1500)
            onBack()
        }
    }

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
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            SectionHeader(icon = Icons.Outlined.Lock, title = "Change Password")
            TextButton(onClick = onBack) {
                Text("Cancel", color = AppColors.TextMuted)
            }
        }

        Spacer(Modifier.height(AppSpacing.XL))

        GlassCard {
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.LG)) {
                Text(
                    text = "Enter your current password and a new password.",
                    style = AppTypography.Caption,
                    color = AppColors.TextMuted,
                )

                AeroTextField(
                    value = state.oldPassword,
                    onValueChange = viewModel::updateOldPassword,
                    label = "Current Password",
                    leadingIcon = Icons.Outlined.Lock,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Next,
                    ),
                )

                AeroTextField(
                    value = state.newPassword,
                    onValueChange = viewModel::updateNewPassword,
                    label = "New Password",
                    leadingIcon = Icons.Outlined.Key,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Next,
                    ),
                )

                AeroTextField(
                    value = state.confirmPassword,
                    onValueChange = viewModel::updateConfirmPassword,
                    label = "Confirm New Password",
                    leadingIcon = Icons.Outlined.Key,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done,
                    ),
                )

                state.error?.let { error ->
                    Text(
                        text = error,
                        style = AppTypography.Caption,
                        color = AppColors.Error,
                    )
                }

                if (state.isSuccess) {
                    Text(
                        text = "Password changed successfully",
                        style = AppTypography.Body,
                        color = AppColors.Success,
                    )
                }

                AeroButton(
                    text = if (state.isLoading) "Changing..." else "Change Password",
                    onClick = { viewModel.changePassword() },
                    loading = state.isLoading,
                    enabled = state.oldPassword.isNotBlank()
                        && state.newPassword.isNotBlank()
                        && state.confirmPassword.isNotBlank(),
                )
            }
        }

        Spacer(Modifier.height(AppSpacing.XXXL))
    }
}
