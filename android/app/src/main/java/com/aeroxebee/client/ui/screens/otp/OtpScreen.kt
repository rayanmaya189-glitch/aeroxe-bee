package com.aeroxebee.client.ui.screens.otp

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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.aeroxebee.client.ui.components.*
import com.aeroxebee.client.ui.theme.*

@Composable
fun OtpScreen(
    onBack: () -> Unit,
    viewModel: OtpViewModel = hiltViewModel(),
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
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            SectionHeader(icon = Icons.Outlined.Sms, title = "OTP Tool")
            TextButton(onClick = onBack) {
                Text("Cancel", color = AppColors.TextMuted)
            }
        }

        Spacer(Modifier.height(AppSpacing.XL))

        when (state.step) {
            OtpStep.SEND -> SendOtpCard(state, viewModel)
            OtpStep.VERIFY -> VerifyOtpCard(state, viewModel)
        }

        Spacer(Modifier.height(AppSpacing.XXXL))
    }
}

@Composable
private fun SendOtpCard(state: OtpState, viewModel: OtpViewModel) {
    GlassCard {
        Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.LG)) {
            Text(
                text = "Send a one-time passcode via SMS.",
                style = AppTypography.Caption,
                color = AppColors.TextMuted,
            )

            AeroTextField(
                value = state.recipient,
                onValueChange = viewModel::updateRecipient,
                label = "Recipient Phone",
                leadingIcon = Icons.Outlined.Phone,
                placeholder = "+1234567890",
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Phone,
                    imeAction = ImeAction.Next,
                ),
            )

            AeroTextField(
                value = state.sender,
                onValueChange = viewModel::updateSender,
                label = "Sender ID (optional)",
                leadingIcon = Icons.Outlined.AlternateEmail,
                placeholder = "OTP",
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
            )

            AeroTextField(
                value = state.message,
                onValueChange = viewModel::updateMessage,
                label = "Message Template (optional)",
                leadingIcon = Icons.Outlined.Message,
                placeholder = "Your code is: {{OTP}}",
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            )

            SimSlotSelector(
                selected = state.simSlot,
                onSelected = viewModel::updateSimSlot,
            )

            state.error?.let { error ->
                Text(
                    text = error,
                    style = AppTypography.Caption,
                    color = AppColors.Error,
                )
            }

            AeroButton(
                text = if (state.isSending) "Sending..." else "Send OTP",
                onClick = { viewModel.sendOtp() },
                loading = state.isSending,
                enabled = state.recipient.isNotBlank(),
            )
        }
    }
}

@Composable
private fun VerifyOtpCard(state: OtpState, viewModel: OtpViewModel) {
    GlassCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(AppSpacing.LG),
        ) {
            Icon(
                imageVector = Icons.Outlined.Sms,
                contentDescription = null,
                tint = AppColors.Blue,
                modifier = Modifier.size(48.dp),
            )

            Text(
                text = "OTP Sent!",
                style = AppTypography.Card,
                fontWeight = FontWeight.Bold,
                color = AppColors.TextPrimary,
            )

            Text(
                text = "Enter the code sent to ${state.recipient}",
                style = AppTypography.Caption,
                color = AppColors.TextMuted,
            )

            if (state.expiresIn > 0) {
                Text(
                    text = "Expires in ${state.expiresIn}s",
                    style = AppTypography.Small,
                    color = AppColors.Warning,
                )
            }

            if (state.isVerified) {
                Icon(
                    imageVector = Icons.Outlined.CheckCircle,
                    contentDescription = null,
                    tint = AppColors.Success,
                    modifier = Modifier.size(48.dp),
                )
                Text(
                    text = "Verified!",
                    style = AppTypography.Card,
                    fontWeight = FontWeight.Bold,
                    color = AppColors.Success,
                )
            } else {
                AeroTextField(
                    value = state.verifyCode,
                    onValueChange = viewModel::updateVerifyCode,
                    label = "Verification Code",
                    leadingIcon = Icons.Outlined.Pin,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Number,
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

                AeroButton(
                    text = if (state.isVerifying) "Verifying..." else "Verify Code",
                    onClick = { viewModel.verifyOtp() },
                    loading = state.isVerifying,
                    enabled = state.verifyCode.isNotBlank(),
                )
            }

            TextButton(onClick = {
                viewModel.reset()
            }) {
                Text("Send Again", color = AppColors.Blue)
            }
        }
    }
}

@Composable
private fun SimSlotSelector(
    selected: Int?,
    onSelected: (Int?) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val label = if (selected != null) "SIM Slot $selected" else "Auto-select SIM"

    Column {
        OutlinedTextField(
            value = label,
            onValueChange = {},
            label = { Text("SIM Slot", style = AppTypography.Body) },
            leadingIcon = {
                Icon(Icons.Outlined.SimCard, contentDescription = null, tint = AppColors.TextMuted)
            },
            trailingIcon = {
                IconButton(onClick = { expanded = !expanded }) {
                    Icon(
                        imageVector = if (expanded) Icons.Outlined.ExpandLess else Icons.Outlined.ExpandMore,
                        contentDescription = null,
                        tint = AppColors.TextMuted,
                    )
                }
            },
            readOnly = true,
            enabled = true,
            modifier = Modifier.fillMaxWidth(),
            shape = androidx.compose.foundation.shape.RoundedCornerShape(AppShapes.Medium),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = AppColors.Border,
                focusedBorderColor = AppColors.Blue,
                unfocusedContainerColor = AppColors.Glass,
                focusedContainerColor = AppColors.Glass,
                unfocusedTextColor = AppColors.TextPrimary,
                focusedTextColor = AppColors.TextPrimary,
                cursorColor = AppColors.Blue,
                unfocusedLabelColor = AppColors.TextMuted,
                focusedLabelColor = AppColors.Blue,
            ),
            textStyle = AppTypography.Body,
        )

        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            DropdownMenuItem(
                text = { Text("Auto-select") },
                onClick = {
                    onSelected(null)
                    expanded = false
                },
            )
            DropdownMenuItem(
                text = { Text("SIM Slot 1") },
                onClick = {
                    onSelected(1)
                    expanded = false
                },
            )
            DropdownMenuItem(
                text = { Text("SIM Slot 2") },
                onClick = {
                    onSelected(2)
                    expanded = false
                },
            )
        }
    }
}
