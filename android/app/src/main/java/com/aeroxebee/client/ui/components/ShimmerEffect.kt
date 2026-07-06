package com.aeroxebee.client.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.aeroxebee.client.ui.theme.AppColors

/**
 * A shimmer brush that animates a gradient highlight across its content.
 * Uses a diagonal sweep from top-left to bottom-right.
 */
@Composable
fun shimmerBrush(
    shimmerColors: List<Color> = listOf(
        AppColors.SecondaryBg.copy(alpha = 0.6f),
        AppColors.Glass.copy(alpha = 0.3f),
        AppColors.SecondaryBg.copy(alpha = 0.6f),
    ),
    animationDuration: Int = 1200,
): Brush {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateX by transition.animateFloat(
        initialValue = -300f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = animationDuration, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "shimmerTranslateX",
    )
    return Brush.linearGradient(
        colors = shimmerColors,
        start = Offset(translateX, translateX * 0.5f),
        end = Offset(translateX + 300f, (translateX + 300f) * 0.5f),
    )
}

/**
 * A placeholder rectangle with shimmer applied.
 */
@Composable
fun ShimmerBox(
    modifier: Modifier = Modifier,
    shape: RoundedCornerShape = RoundedCornerShape(8.dp),
) {
    Box(
        modifier = modifier
            .clip(shape)
            .background(shimmerBrush()),
    )
}

/**
 * A placeholder circle with shimmer applied.
 */
@Composable
fun ShimmerCircle(
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(shimmerBrush()),
    )
}

/**
 * A placeholder text line with shimmer.
 */
@Composable
fun ShimmerTextLine(
    widthFraction: Float = 1f,
    height: Dp = 14.dp,
    modifier: Modifier = Modifier,
) {
    ShimmerBox(
        modifier = modifier
            .fillMaxWidth(widthFraction)
            .height(height),
    )
}
