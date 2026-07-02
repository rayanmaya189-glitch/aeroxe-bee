package com.textbee.client.ui.screens.registration

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

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

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AeroXe Bee") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                ),
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp)
                .imePadding()
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = "Welcome",
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.onBackground,
            )

            Spacer(Modifier.height(8.dp))

            Text(
                text = "Connect to your SMS gateway server",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Spacer(Modifier.height(32.dp))

            when (state.step) {
                RegistrationStep.CREDENTIALS -> CredentialsStep(state, viewModel)
                RegistrationStep.SIM_SELECTION -> SimSelectionStep(state, viewModel)
                RegistrationStep.BATTERY_OPT -> BatteryOptStep(state, viewModel)
                RegistrationStep.CONFIRM -> ConfirmStep(state, viewModel)
            }

            state.error?.let { error ->
                Spacer(Modifier.height(16.dp))
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}

@Composable
private fun CredentialsStep(state: RegistrationState, viewModel: RegistrationViewModel) {
    OutlinedTextField(
        value = state.serverUrl,
        onValueChange = viewModel::onServerUrlChange,
        label = { Text("Server URL") },
        placeholder = { Text("http://10.0.2.2:8080") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Uri,
            imeAction = ImeAction.Next,
        ),
        isError = state.serverUrlError != null,
        supportingText = state.serverUrlError?.let { { Text(it) } },
    )

    Spacer(Modifier.height(16.dp))

    OutlinedTextField(
        value = state.email,
        onValueChange = viewModel::onEmailChange,
        label = { Text("Email") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Email,
            imeAction = ImeAction.Next,
        ),
        isError = state.emailError != null,
        supportingText = state.emailError?.let { { Text(it) } },
    )

    Spacer(Modifier.height(12.dp))

    OutlinedTextField(
        value = state.password,
        onValueChange = viewModel::onPasswordChange,
        label = { Text("Password") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Password,
            imeAction = ImeAction.Done,
        ),
        keyboardActions = KeyboardActions(onDone = { viewModel.nextStep() }),
        visualTransformation = PasswordVisualTransformation(),
        isError = state.passwordError != null,
        supportingText = state.passwordError?.let { { Text(it) } },
    )

    Spacer(Modifier.height(24.dp))

    Button(
        onClick = { viewModel.nextStep() },
        modifier = Modifier.fillMaxWidth().height(50.dp),
    ) {
        Text("Next")
    }
}

@Composable
private fun SimSelectionStep(state: RegistrationState, viewModel: RegistrationViewModel) {
    Text(
        text = "Select SIM Slot",
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.SemiBold,
    )

    Spacer(Modifier.height(16.dp))

    if (state.availableSlots.isEmpty()) {
        Text(
            text = "No SIM slots detected",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    } else {
        state.availableSlots.forEachIndexed { index, slot ->
            Card(
                onClick = { viewModel.onSlotSelected(index) },
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (index == state.selectedSlotIndex)
                        MaterialTheme.colorScheme.primaryContainer
                    else
                        MaterialTheme.colorScheme.surfaceVariant,
                ),
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = "SIM ${slot.slotId + 1}",
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = "Carrier: ${slot.carrierName.ifBlank { "Unknown" }}",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
        }
    }

    Spacer(Modifier.height(24.dp))

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        OutlinedButton(onClick = { viewModel.previousStep() }) {
            Text("Back")
        }
        Button(onClick = { viewModel.nextStep() }) {
            Text("Next")
        }
    }
}

@Composable
private fun BatteryOptStep(state: RegistrationState, viewModel: RegistrationViewModel) {
    Text(
        text = "Battery Optimization",
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.SemiBold,
    )

    Spacer(Modifier.height(16.dp))

    Text(
        text = if (state.isBatteryOptimized) "Battery optimization is disabled for this app."
        else "Battery optimization is enabled. Background operation may be restricted.",
        style = MaterialTheme.typography.bodyMedium,
        color = if (state.isBatteryOptimized) Color(0xFF4CAF50) else MaterialTheme.colorScheme.error,
    )

    if (!state.isBatteryOptimized) {
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = { viewModel.requestBatteryOptimization() },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Disable Battery Optimization")
        }

        Spacer(Modifier.height(8.dp))
        OutlinedButton(
            onClick = { viewModel.refreshBatteryOptStatus() },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Check Status")
        }
    }

    state.batteryGuide?.let { guide ->
        Spacer(Modifier.height(16.dp))
        Text(
            text = "Guide for ${guide.displayName}:",
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(Modifier.height(4.dp))
        guide.instructions.forEachIndexed { index, instruction ->
            Text(
                text = "${index + 1}. $instruction",
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }

    Spacer(Modifier.height(24.dp))

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        OutlinedButton(onClick = { viewModel.previousStep() }) {
            Text("Back")
        }
        Button(onClick = { viewModel.nextStep() }) {
            Text("Next")
        }
    }
}

@Composable
private fun ConfirmStep(state: RegistrationState, viewModel: RegistrationViewModel) {
    Text(
        text = "Confirm Settings",
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.SemiBold,
    )

    Spacer(Modifier.height(16.dp))

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant,
        ),
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text("Server: ${state.serverUrl}", style = MaterialTheme.typography.bodyMedium)
            Text("Email: ${state.email}", style = MaterialTheme.typography.bodyMedium)
            Text("SIM Slot: ${state.selectedSlotIndex + 1}", style = MaterialTheme.typography.bodyMedium)
            Text(
                if (state.isBatteryOptimized) "Battery opt: Disabled"
                else "Battery opt: Enabled (recommend disabling)",
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }

    Spacer(Modifier.height(24.dp))

    Button(
        onClick = { viewModel.register() },
        modifier = Modifier.fillMaxWidth().height(50.dp),
        enabled = !state.isLoading,
    ) {
        if (state.isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(24.dp),
                color = MaterialTheme.colorScheme.onPrimary,
                strokeWidth = 2.dp,
            )
        } else {
            Text("Connect")
        }
    }

    Spacer(Modifier.height(8.dp))

    OutlinedButton(
        onClick = { viewModel.previousStep() },
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text("Back")
    }
}
