package com.textbee.client.ui.screens.device

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeviceScreen(
    viewModel: DeviceViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Device") },
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
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            Text(
                text = "Device Info",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )

            Spacer(Modifier.height(16.dp))

            InfoRow("Model", state.deviceInfo.model)
            InfoRow("Manufacturer", state.deviceInfo.manufacturer)
            InfoRow("OS Version", state.deviceInfo.osVersion)
            InfoRow("SDK Level", state.deviceInfo.sdkLevel.toString())

            Spacer(Modifier.height(16.dp))

            RiskStateCard(state.deviceState)

            Spacer(Modifier.height(24.dp))

            Text(
                text = "SIM Slots",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )

            Spacer(Modifier.height(8.dp))

            state.deviceInfo.simSlots.forEach { slot ->
                Card(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant,
                    ),
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "SIM ${slot.slot + 1}",
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            text = "Carrier: ${slot.carrier.ifBlank { "Unknown" }}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Text(
                            text = "Phone: ${slot.phoneNumber.ifBlank { "N/A" }}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            Text(
                text = "Battery Optimization",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )

            Spacer(Modifier.height(8.dp))

            Button(
                onClick = { viewModel.requestBatteryOptimization() },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Disable Battery Optimization")
            }

            state.batteryGuide?.let { guide ->
                Spacer(Modifier.height(12.dp))
                Text(
                    text = "Guide for ${guide.displayName}:",
                    style = MaterialTheme.typography.labelLarge,
                )
                guide.instructions.forEachIndexed { index, instruction ->
                    Text(
                        text = "${index + 1}. $instruction",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }

            Spacer(Modifier.height(24.dp))

            Text(
                text = "Exact Alarm Permission",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )

            Spacer(Modifier.height(8.dp))

            Text(
                text = if (state.canScheduleExactAlarms) "Granted" else "Not granted",
                style = MaterialTheme.typography.bodyMedium,
                color = if (state.canScheduleExactAlarms) Color(0xFF4CAF50) else MaterialTheme.colorScheme.error,
            )

            if (!state.canScheduleExactAlarms) {
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = { viewModel.requestExactAlarmPermission() },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Grant Exact Alarm Permission")
                }
            }
        }
    }
}

@Composable
private fun RiskStateCard(deviceState: com.textbee.client.domain.model.DeviceState) {
    val (label, color) = when (deviceState) {
        com.textbee.client.domain.model.DeviceState.ACTIVE -> "Healthy" to Color(0xFF4CAF50)
        com.textbee.client.domain.model.DeviceState.DOZE_RISK -> "Doze Risk" to Color(0xFFFF9800)
        com.textbee.client.domain.model.DeviceState.OEM_KILL_RISK -> "OEM Kill Risk" to Color(0xFFF44336)
    }

    Card(
        colors = CardDefaults.cardColors(
            containerColor = color.copy(alpha = 0.15f),
        ),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(12.dp).fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Risk State",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = color,
            )
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(text = label, style = MaterialTheme.typography.bodyMedium)
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
