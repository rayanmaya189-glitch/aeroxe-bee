package com.textbee.client.ui.screens.registration

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.textbee.client.ui.components.*
import com.textbee.client.ui.theme.*

private enum class Step(val index: Int, val label: String, val icon: ImageVector) {
    CREDENTIALS(0, "Server", Icons.Outlined.Cloud),
    SIM(1, "SIM", Icons.Outlined.SimCard),
    BATTERY(2, "Battery", Icons.Outlined.BatteryFull),
    CONFIRM(3, "Connect", Icons.Outlined.Link),
}

@Composable
fun RegistrationScreen(
    onRegistered: () -> Unit,
    viewModel: RegistrationViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(state.isRegistered) {
        if (state.isRegistered) onRegistered()
    }

    val currentStep = when (state.step) {
        RegistrationStep.CREDENTIALS -> Step.CREDENTIALS
        RegistrationStep.SIM_SELECTION -> Step.SIM
        RegistrationStep.BATTERY_OPT -> Step.BATTERY
        RegistrationStep.CONFIRM -> Step.CONFIRM
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.Background)
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = AppSpacing.XXL),
    ) {
        Spacer(Modifier.height(AppSpacing.XXL))

        // ─── Welcome Hero ───────────────────────────────────
        Text(
            text = "Welcome",
            style = AppTypography.Hero,
            fontWeight = FontWeight.Black,
            color = AppColors.TextPrimary,
        )

        Spacer(Modifier.height(AppSpacing.XS))

        Text(
            text = "Connect to your SMS gateway server",
            style = AppTypography.BodyLarge,
            color = AppColors.TextMuted,
        )

        Spacer(Modifier.height(AppSpacing.XXXL))

        // ─── Step Progress Indicator ────────────────────────
        StepProgressIndicator(currentStep)

        Spacer(Modifier.height(AppSpacing.XXXL))

        // ─── Step Content ───────────────────────────────────
        AnimatedContent(
            targetState = state.step,
            transitionSpec = {
                if (targetState.ordinal > initialState.ordinal) {
                    slideInHorizontally(tween(300)) { it / 4 } + fadeIn(tween(300)) togetherWith
                    slideOutHorizontally(tween(250)) { -it / 4 } + fadeOut(tween(250))
                } else {
                    slideInHorizontally(tween(300)) { -it / 4 } + fadeIn(tween(300)) togetherWith
                    slideOutHorizontally(tween(250)) { it / 4 } + fadeOut(tween(250))
                }
            },
            label = "stepContent",
        ) { step ->
            when (step) {
                RegistrationStep.CREDENTIALS -> CredentialsStep(state, viewModel)
                RegistrationStep.SIM_SELECTION -> SimSelectionStep(state, viewModel)
                RegistrationStep.BATTERY_OPT -> BatteryOptStep(state, viewModel)
                RegistrationStep.CONFIRM -> ConfirmStep(state, viewModel)
            }
        }

        state.error?.let { error ->
            Spacer(Modifier.height(AppSpacing.LG))
            GlassCard {
                Text(
                    text = error,
                    style = AppTypography.Body,
                    color = AppColors.Error,
                )
            }
        }

        Spacer(Modifier.height(AppSpacing.XXXL))
    }
}

@Composable
private fun StepProgressIndicator(currentStep: Step) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Step.entries.forEach { step ->
            val isActive = step.index <= currentStep.index
            val isCurrent = step == currentStep

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.weight(1f),
            ) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(
                            when {
                                step.index < currentStep.index -> AppColors.Blue
                                isCurrent -> AppColors.Blue
                                else -> AppColors.Glass
                            }
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    if (step.index < currentStep.index) {
                        Icon(
                            imageVector = Icons.Filled.Check,
                            contentDescription = "Done",
                            tint = AppColors.TextPrimary,
                            modifier = Modifier.size(16.dp),
                        )
                    } else {
                        Icon(
                            imageVector = step.icon,
                            contentDescription = step.label,
                            tint = if (isActive) AppColors.TextPrimary else AppColors.TextDisabled,
                            modifier = Modifier.size(16.dp),
                        )
                    }
                }

                Spacer(Modifier.height(AppSpacing.SM))

                Text(
                    text = step.label,
                    style = AppTypography.Small,
                    color = if (isActive) AppColors.Blue else AppColors.TextDisabled,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun CredentialsStep(state: RegistrationState, viewModel: RegistrationViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.LG)) {
        AeroTextField(
            value = state.serverUrl,
            onValueChange = viewModel::onServerUrlChange,
            label = "Server URL",
            placeholder = "http://10.0.2.2:8080",
            leadingIcon = Icons.Outlined.Cloud,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri, imeAction = ImeAction.Next),
            isError = state.serverUrlError != null,
            errorText = state.serverUrlError,
        )

        AeroTextField(
            value = state.email,
            onValueChange = viewModel::onEmailChange,
            label = "Email",
            leadingIcon = Icons.Outlined.Email,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
            isError = state.emailError != null,
            errorText = state.emailError,
        )

        AeroTextField(
            value = state.password,
            onValueChange = viewModel::onPasswordChange,
            label = "Password",
            leadingIcon = Icons.Outlined.Lock,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { viewModel.nextStep() }),
            visualTransformation = PasswordVisualTransformation(),
            isError = state.passwordError != null,
            errorText = state.passwordError,
        )

        Spacer(Modifier.height(AppSpacing.SM))

        AeroButton(
            text = "Next",
            onClick = { viewModel.nextStep() },
        )
    }
}

@Composable
private fun SimSelectionStep(state: RegistrationState, viewModel: RegistrationViewModel) {
    Column {
        if (state.availableSlots.isEmpty()) {
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
            state.availableSlots.forEachIndexed { index, slot ->
                val isSelected = index == state.selectedSlotIndex
                GlassCard(onClick = { viewModel.onSlotSelected(index) }) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(AppSpacing.MD),
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(
                                    if (isSelected) AppColors.Blue
                                    else AppColors.Glass
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.SimCard,
                                contentDescription = "SIM",
                                tint = if (isSelected) AppColors.TextPrimary else AppColors.TextMuted,
                                modifier = Modifier.size(20.dp),
                            )
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "SIM ${slot.slotId + 1}",
                                style = AppTypography.Card,
                                fontWeight = FontWeight.SemiBold,
                                color = AppColors.TextPrimary,
                            )
                            Text(
                                text = slot.carrierName.ifBlank { "Unknown carrier" },
                                style = AppTypography.Caption,
                                color = AppColors.TextMuted,
                            )
                        }
                    }
                }
                if (index < state.availableSlots.lastIndex) {
                    Spacer(Modifier.height(AppSpacing.SM))
                }
            }
        }

        Spacer(Modifier.height(AppSpacing.XXXL))

        NavigationButtons(
            onBack = { viewModel.previousStep() },
            onNext = { viewModel.nextStep() },
        )
    }
}

@Composable
private fun BatteryOptStep(state: RegistrationState, viewModel: RegistrationViewModel) {
    Column {
        GlassCard {
            Column {
                Text(
                    text = if (state.isBatteryOptimized) "Battery optimization is disabled" else "Battery optimization is enabled",
                    style = AppTypography.Card,
                    fontWeight = FontWeight.SemiBold,
                    color = if (state.isBatteryOptimized) AppColors.Success else AppColors.Error,
                )
                Spacer(Modifier.height(AppSpacing.XS))
                Text(
                    text = if (state.isBatteryOptimized) "Your app will run reliably in the background."
                    else "Background operation may be restricted. We recommend disabling it.",
                    style = AppTypography.Caption,
                    color = AppColors.TextMuted,
                    lineHeight = 18.sp,
                )
            }
        }

        Spacer(Modifier.height(AppSpacing.LG))

        if (!state.isBatteryOptimized) {
            AeroButton(
                text = "Disable Battery Optimization",
                onClick = { viewModel.requestBatteryOptimization() },
            )

            Spacer(Modifier.height(AppSpacing.SM))

            AeroButton(
                text = "Check Status",
                onClick = { viewModel.refreshBatteryOptStatus() },
                variant = ButtonVariant.Secondary,
            )
        }

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
                        Text(
                            text = "${index + 1}. $instruction",
                            style = AppTypography.Caption,
                            color = AppColors.TextMuted,
                            modifier = Modifier.padding(top = 3.dp),
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(AppSpacing.XXXL))

        NavigationButtons(
            onBack = { viewModel.previousStep() },
            onNext = { viewModel.nextStep() },
        )
    }
}

@Composable
private fun ConfirmStep(state: RegistrationState, viewModel: RegistrationViewModel) {
    Column {
        GlassCard {
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.SM)) {
                ConfirmRow("Server", state.serverUrl)
                ConfirmRow("Email", state.email)
                ConfirmRow("SIM Slot", "SIM ${state.selectedSlotIndex + 1}")
                ConfirmRow("Battery optimization", if (state.isBatteryOptimized) "Disabled ✓" else "Enabled")
            }
        }

        Spacer(Modifier.height(AppSpacing.XXL))

        AeroButton(
            text = "Connect",
            onClick = { viewModel.register() },
            loading = state.isLoading,
        )

        Spacer(Modifier.height(AppSpacing.SM))

        AeroButton(
            text = "Back",
            onClick = { viewModel.previousStep() },
            variant = ButtonVariant.Secondary,
        )
    }
}

@Composable
private fun NavigationButtons(onBack: () -> Unit, onNext: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(AppSpacing.MD),
    ) {
        AeroButton(
            text = "Back",
            onClick = onBack,
            variant = ButtonVariant.Secondary,
            modifier = Modifier.weight(1f),
        )
        AeroButton(
            text = "Next",
            onClick = onNext,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun ConfirmRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text = label,
            style = AppTypography.Body,
            color = AppColors.TextMuted,
        )
        Text(
            text = value,
            style = AppTypography.Body,
            fontWeight = FontWeight.Medium,
            color = AppColors.TextPrimary,
        )
    }
}
