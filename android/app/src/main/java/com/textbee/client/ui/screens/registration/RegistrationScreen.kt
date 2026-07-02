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
import com.textbee.client.ui.theme.*

private enum class Step(val index: Int, val label: String, val icon: ImageVector) {
    CREDENTIALS(0, "Server", Icons.Outlined.Cloud),
    SIM(1, "SIM", Icons.Outlined.SimCard),
    BATTERY(2, "Battery", Icons.Outlined.BatteryFull),
    CONFIRM(3, "Connect", Icons.Outlined.Link),
}

@OptIn(ExperimentalMaterial3Api::class)
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

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "AeroXe Bee",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                ),
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
        ) {
            Spacer(Modifier.height(8.dp))

            // ─── Welcome Hero ───────────────────────────────────
            Text(
                text = "Welcome",
                style = MaterialTheme.typography.displayMedium,
                fontWeight = FontWeight.Black,
                color = MaterialTheme.colorScheme.onBackground,
            )

            Spacer(Modifier.height(4.dp))

            Text(
                text = "Connect to your SMS gateway server",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Spacer(Modifier.height(28.dp))

            // ─── Step Progress Indicator ────────────────────────
            StepProgressIndicator(currentStep)

            Spacer(Modifier.height(28.dp))

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
                Spacer(Modifier.height(16.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = DangerDark.copy(alpha = 0.15f),
                    ),
                ) {
                    Text(
                        text = error,
                        modifier = Modifier.padding(14.dp),
                        style = MaterialTheme.typography.bodyMedium,
                        color = DangerDark,
                    )
                }
            }

            Spacer(Modifier.height(32.dp))
        }
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
                                step.index < currentStep.index -> MaterialTheme.colorScheme.primary
                                isCurrent -> MaterialTheme.colorScheme.primary
                                else -> MaterialTheme.colorScheme.surfaceVariant
                            }
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    if (step.index < currentStep.index) {
                        Icon(
                            imageVector = Icons.Filled.Check,
                            contentDescription = "Done",
                            tint = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.size(16.dp),
                        )
                    } else {
                        Icon(
                            imageVector = step.icon,
                            contentDescription = step.label,
                            tint = if (isActive) MaterialTheme.colorScheme.onPrimary
                            else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                            modifier = Modifier.size(16.dp),
                        )
                    }
                }

                Spacer(Modifier.height(6.dp))

                Text(
                    text = step.label,
                    style = MaterialTheme.typography.labelSmall,
                    color = if (isActive) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun CredentialsStep(state: RegistrationState, viewModel: RegistrationViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        StyledTextField(
            value = state.serverUrl,
            onValueChange = viewModel::onServerUrlChange,
            label = "Server URL",
            placeholder = "http://10.0.2.2:8080",
            leadingIcon = Icons.Outlined.Cloud,
            keyboardType = KeyboardType.Uri,
            imeAction = ImeAction.Next,
            isError = state.serverUrlError != null,
            errorText = state.serverUrlError,
        )

        StyledTextField(
            value = state.email,
            onValueChange = viewModel::onEmailChange,
            label = "Email",
            leadingIcon = Icons.Outlined.Email,
            keyboardType = KeyboardType.Email,
            imeAction = ImeAction.Next,
            isError = state.emailError != null,
            errorText = state.emailError,
        )

        StyledTextField(
            value = state.password,
            onValueChange = viewModel::onPasswordChange,
            label = "Password",
            leadingIcon = Icons.Outlined.Lock,
            keyboardType = KeyboardType.Password,
            imeAction = ImeAction.Done,
            keyboardActions = KeyboardActions(onDone = { viewModel.nextStep() }),
            visualTransformation = PasswordVisualTransformation(),
            isError = state.passwordError != null,
            errorText = state.passwordError,
        )

        Spacer(Modifier.height(8.dp))

        Button(
            onClick = { viewModel.nextStep() },
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(14.dp),
        ) {
            Text("Next", style = MaterialTheme.typography.titleSmall)
        }
    }
}

@Composable
private fun SimSelectionStep(state: RegistrationState, viewModel: RegistrationViewModel) {
    Column {
        if (state.availableSlots.isEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                ),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = "No SIM slots detected",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        } else {
            state.availableSlots.forEachIndexed { index, slot ->
                val isSelected = index == state.selectedSlotIndex
                Card(
                    onClick = { viewModel.onSlotSelected(index) },
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isSelected)
                            MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)
                        else MaterialTheme.colorScheme.surfaceVariant,
                    ),
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(
                                    if (isSelected) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.SimCard,
                                contentDescription = "SIM",
                                tint = if (isSelected) MaterialTheme.colorScheme.onPrimary
                                else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp),
                            )
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "SIM ${slot.slotId + 1}",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                text = slot.carrierName.ifBlank { "Unknown carrier" },
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(28.dp))

        NavigationButtons(
            onBack = { viewModel.previousStep() },
            onNext = { viewModel.nextStep() },
        )
    }
}

@Composable
private fun BatteryOptStep(state: RegistrationState, viewModel: RegistrationViewModel) {
    Column {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = if (state.isBatteryOptimized)
                    SuccessDark.copy(alpha = 0.12f) else DangerDark.copy(alpha = 0.12f),
            ),
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = if (state.isBatteryOptimized) "Battery optimization is disabled" else "Battery optimization is enabled",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = if (state.isBatteryOptimized) SuccessDark else DangerDark,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = if (state.isBatteryOptimized) "Your app will run reliably in the background."
                    else "Background operation may be restricted. We recommend disabling it.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = 18.sp,
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        if (!state.isBatteryOptimized) {
            Button(
                onClick = { viewModel.requestBatteryOptimization() },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(14.dp),
            ) {
                Text("Disable Battery Optimization")
            }

            Spacer(Modifier.height(8.dp))

            OutlinedButton(
                onClick = { viewModel.refreshBatteryOptStatus() },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(14.dp),
            ) {
                Text("Check Status")
            }
        }

        state.batteryGuide?.let { guide ->
            Spacer(Modifier.height(16.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                ),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Guide for ${guide.displayName}",
                        style = MaterialTheme.typography.labelLarge,
                    )
                    Spacer(Modifier.height(8.dp))
                    guide.instructions.forEachIndexed { index, instruction ->
                        Text(
                            text = "${index + 1}. $instruction",
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(top = 3.dp),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(28.dp))

        NavigationButtons(
            onBack = { viewModel.previousStep() },
            onNext = { viewModel.nextStep() },
        )
    }
}

@Composable
private fun ConfirmStep(state: RegistrationState, viewModel: RegistrationViewModel) {
    Column {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant,
            ),
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                ConfirmRow("Server", state.serverUrl)
                HorizontalDivider(
                    modifier = Modifier.padding(vertical = 12.dp),
                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f),
                )
                ConfirmRow("Email", state.email)
                HorizontalDivider(
                    modifier = Modifier.padding(vertical = 12.dp),
                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f),
                )
                ConfirmRow("SIM Slot", "SIM ${state.selectedSlotIndex + 1}")
                HorizontalDivider(
                    modifier = Modifier.padding(vertical = 12.dp),
                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f),
                )
                ConfirmRow(
                    "Battery optimization",
                    if (state.isBatteryOptimized) "Disabled ✓" else "Enabled",
                )
            }
        }

        Spacer(Modifier.height(24.dp))

        Button(
            onClick = { viewModel.register() },
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(14.dp),
            enabled = !state.isLoading,
        ) {
            if (state.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = MaterialTheme.colorScheme.onPrimary,
                    strokeWidth = 2.dp,
                )
            } else {
                Text("Connect", style = MaterialTheme.typography.titleSmall)
            }
        }

        Spacer(Modifier.height(8.dp))

        OutlinedButton(
            onClick = { viewModel.previousStep() },
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
            shape = RoundedCornerShape(14.dp),
        ) {
            Text("Back")
        }
    }
}

@Composable
private fun StyledTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String = "",
    leadingIcon: ImageVector,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    keyboardActions: KeyboardActions = KeyboardActions(),
    visualTransformation: androidx.compose.ui.text.input.VisualTransformation =
        androidx.compose.ui.text.input.VisualTransformation.None,
    isError: Boolean = false,
    errorText: String? = null,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        placeholder = if (placeholder.isNotEmpty()) {{ Text(placeholder) }} else null,
        leadingIcon = {
            Icon(leadingIcon, contentDescription = null, modifier = Modifier.size(20.dp))
        },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
        keyboardActions = keyboardActions,
        visualTransformation = visualTransformation,
        isError = isError,
        supportingText = errorText?.let { { Text(it) } },
        colors = OutlinedTextFieldDefaults.colors(
            unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
        ),
    )
}

@Composable
private fun NavigationButtons(onBack: () -> Unit, onNext: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        OutlinedButton(
            onClick = onBack,
            modifier = Modifier
                .weight(1f)
                .height(48.dp),
            shape = RoundedCornerShape(14.dp),
        ) {
            Text("Back")
        }
        Button(
            onClick = onNext,
            modifier = Modifier
                .weight(1f)
                .height(48.dp),
            shape = RoundedCornerShape(14.dp),
        ) {
            Text("Next")
        }
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
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
        )
    }
}
