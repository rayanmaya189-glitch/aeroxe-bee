package com.textbee.client.ui.screens.splash

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Sms
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.textbee.client.ui.theme.*
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(onReady: () -> Unit) {
    val scale = remember { Animatable(0.5f) }
    val alpha = remember { Animatable(0f) }
    val textAlpha = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        // Icon scale-up + fade-in
        scale.animateTo(1f, animationSpec = tween(500, easing = FastOutSlowInEasing))
        alpha.animateTo(1f, animationSpec = tween(400))

        // Text fade-in
        textAlpha.animateTo(1f, animationSpec = tween(400, delayMillis = 200))

        // Hold, then navigate
        delay(1200)
        onReady()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.Background),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            // Animated icon
            Box(
                modifier = Modifier
                    .scale(scale.value)
                    .alpha(alpha.value)
                    .size(96.dp)
                    .background(
                        Brush.linearGradient(AppColors.GradientBlue),
                        shape = androidx.compose.foundation.shape.RoundedCornerShape(AppShapes.XL),
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.Sms,
                    contentDescription = "AeroXe Bee",
                    tint = AppColors.TextPrimary,
                    modifier = Modifier.size(48.dp),
                )
            }

            Spacer(Modifier.height(AppSpacing.XXL))

            // Brand name
            Text(
                text = "AeroXe Bee",
                style = AppTypography.Hero,
                fontWeight = FontWeight.ExtraBold,
                color = AppColors.TextPrimary,
                modifier = alpha(textAlpha.value).alpha(textAlpha.value),
            )

            Spacer(Modifier.height(AppSpacing.SM))

            // Tagline
            Text(
                text = "Distributed SMS Gateway",
                style = AppTypography.Body,
                color = AppColors.TextMuted,
                modifier = Modifier.alpha(textAlpha.value),
            )
        }
    }
}
