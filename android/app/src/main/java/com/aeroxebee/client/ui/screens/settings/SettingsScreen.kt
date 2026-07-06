package com.aeroxebee.client.ui.screens.settings

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.aeroxebee.client.ui.components.*
import com.aeroxebee.client.ui.theme.*

@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var serverUrl by remember { mutableStateOf(state.serverUrl) }
    var email by remember { mutableStateOf(state.email) }
    var password by remember { mutableStateOf(state.password) }
    val scrollState = rememberScrollState()

    LaunchedEffect(state.serverUrl) { serverUrl = state.serverUrl }
    LaunchedEffect(state.email) { email = state.email }
    LaunchedEffect(state.password) { password = state.password }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.Background)
            .verticalScroll(scrollState)
            .padding(horizontal = AppSpacing.XL),
    ) {
        Spacer(Modifier.height(AppSpacing.XL))

        // ─── Server Configuration ───────────────────────────
        SectionHeader(icon = Icons.Outlined.Cloud, title = "Server Configuration")

        Spacer(Modifier.height(AppSpacing.MD))

        GlassCard {
            Column(verticalArrangement = Arrangement.spacedBy(AppSpacing.LG)) {
                AeroTextField(
                    value = serverUrl,
                    onValueChange = { serverUrl = it },
                    label = "Server URL",
                    leadingIcon = Icons.Outlined.Language,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri, imeAction = ImeAction.Next),
                )

                AeroTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = "Email",
                    leadingIcon = Icons.Outlined.Email,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                )

                AeroTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = "Password",
                    leadingIcon = Icons.Outlined.Lock,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(
                        onDone = { viewModel.save(serverUrl, email, password) }
                    ),
                    visualTransformation = PasswordVisualTransformation(),
                )
            }
        }

        Spacer(Modifier.height(AppSpacing.XXL))

        AeroButton(
            text = "Save & Reconnect",
            onClick = { viewModel.save(serverUrl, email, password) },
            loading = state.isLoading,
        )

        AnimatedVisibility(
            visible = state.saved,
            enter = expandVertically(tween(300)) + fadeIn(tween(300)),
            exit = shrinkVertically(tween(200)) + fadeOut(tween(200)),
        ) {
            GlassCard(modifier = Modifier.padding(top = AppSpacing.LG)) {
                Text(
                    text = "Settings saved successfully",
                    style = AppTypography.Body,
                    color = AppColors.Success,
                )
            }
        }

        Spacer(Modifier.height(AppSpacing.XXXL))
    }
}
