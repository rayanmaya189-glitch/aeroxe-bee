package com.aeroxebee.client.ui.screens.update

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.SystemUpdate
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.aeroxebee.client.ui.theme.AppColors

@Composable
fun UpdateDialog(
    state: UpdateState.UpdateAvailable,
    onDownload: () -> Unit,
    onDismiss: () -> Unit,
) {
    Dialog(
        onDismissRequest = { if (!state.forceUpdate) onDismiss() },
        properties = DialogProperties(
            dismissOnBackPress = !state.forceUpdate,
            dismissOnClickOutside = !state.forceUpdate,
        ),
    ) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = AppColors.SecondaryBg),
            modifier = Modifier.fillMaxWidth(0.9f),
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                // Update icon with gradient background
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .background(
                            Brush.linearGradient(
                                if (state.forceUpdate) listOf(
                                    AppColors.Red.copy(alpha = 0.2f),
                                    AppColors.Red.copy(alpha = 0.05f),
                                ) else listOf(
                                    AppColors.Blue.copy(alpha = 0.2f),
                                    AppColors.Blue.copy(alpha = 0.05f),
                                )
                            )
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.SystemUpdate,
                        contentDescription = null,
                        modifier = Modifier.size(36.dp),
                        tint = if (state.forceUpdate) AppColors.Red else AppColors.Blue,
                    )
                }

                Spacer(Modifier.height(16.dp))

                // Title
                Text(
                    text = if (state.forceUpdate) "Update Required" else "Update Available",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                )

                Spacer(Modifier.height(4.dp))

                // Version info
                Text(
                    text = "v${state.versionName}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (state.forceUpdate) AppColors.Red else AppColors.TextMuted,
                    fontWeight = FontWeight.SemiBold,
                )

                Spacer(Modifier.height(12.dp))

                // Release notes
                if (state.releaseNotes.isNotBlank()) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            if (state.title.isNotBlank()) {
                                Text(
                                    text = state.title,
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(bottom = 4.dp),
                                )
                            }
                            Text(
                                text = state.releaseNotes,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                lineHeight = 18.sp,
                            )
                        }
                    }
                }

                Spacer(Modifier.height(20.dp))

                // Action buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (!state.forceUpdate) {
                        OutlinedButton(
                            onClick = onDismiss,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = MaterialTheme.colorScheme.onSurface,
                            ),
                        ) {
                            Text("Later")
                        }
                    }

                    Button(
                        onClick = onDownload,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (state.forceUpdate) AppColors.Red else AppColors.Blue,
                        ),
                    ) {
                        Text(
                            "Update Now",
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }

                // Force update warning
                if (state.forceUpdate) {
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = "You must update to continue using the app",
                        style = MaterialTheme.typography.bodySmall,
                        color = AppColors.Red.copy(alpha = 0.7f),
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }
    }
}

@Composable
fun UpdateDownloadDialog(progress: Int) {
    Dialog(
        onDismissRequest = { },
        properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false),
    ) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = AppColors.SecondaryBg),
            modifier = Modifier.fillMaxWidth(0.85f),
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    text = "Downloading Update",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                )

                Spacer(Modifier.height(16.dp))

                LinearProgressIndicator(
                    progress = { progress / 100f },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp)),
                    color = AppColors.Blue,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant,
                )

                Spacer(Modifier.height(8.dp))

                Text(
                    text = "$progress%",
                    style = MaterialTheme.typography.bodyMedium,
                    color = AppColors.TextMuted,
                )

                Spacer(Modifier.height(4.dp))

                Text(
                    text = "Please don't close the app",
                    style = MaterialTheme.typography.bodySmall,
                    color = AppColors.TextMuted.copy(alpha = 0.6f),
                )
            }
        }
    }
}
