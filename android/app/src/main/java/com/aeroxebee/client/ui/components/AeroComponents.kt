package com.aeroxebee.client.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.material3.ripple
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.aeroxebee.client.ui.theme.*

// ─── GlassCard ────────────────────────────────────────────────
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val cardModifier = modifier
        .fillMaxWidth()
        .clip(RoundedCornerShape(AppShapes.Large))
        .background(AppColors.Glass)
        .border(1.dp, AppColors.Border, RoundedCornerShape(AppShapes.Large))

    if (onClick != null) {
        Card(
            modifier = cardModifier.clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = ripple(bounded = true),
                onClick = onClick,
            ),
            shape = RoundedCornerShape(AppShapes.Large),
            colors = CardDefaults.cardColors(containerColor = Color.Transparent),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        ) {
            Column(modifier = Modifier.padding(AppSpacing.XXL), content = content)
        }
    } else {
        Card(
            modifier = cardModifier,
            shape = RoundedCornerShape(AppShapes.Large),
            colors = CardDefaults.cardColors(containerColor = Color.Transparent),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        ) {
            Column(modifier = Modifier.padding(AppSpacing.XXL), content = content)
        }
    }
}

// ─── GradientCard ─────────────────────────────────────────────
@Composable
fun GradientCard(
    modifier: Modifier = Modifier,
    gradient: List<Color> = AppColors.GradientBlue,
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(AppShapes.Large),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.linearGradient(gradient, start = androidx.compose.ui.geometry.Offset(0f, 0f), end = androidx.compose.ui.geometry.Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY)))
                .padding(AppSpacing.XXL),
        ) {
            Column(content = content)
        }
    }
}

// ─── StatCard ─────────────────────────────────────────────────
@Composable
fun StatCard(
    icon: ImageVector,
    label: String,
    value: String,
    accentColor: Color,
    bgColor: Color,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(AppShapes.Medium),
        colors = CardDefaults.cardColors(containerColor = bgColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(AppSpacing.MD),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = accentColor,
                modifier = Modifier.size(20.dp),
            )
            Spacer(Modifier.height(AppSpacing.SM))
            Text(
                text = value,
                style = AppTypography.Section,
                fontWeight = FontWeight.ExtraBold,
                color = accentColor,
            )
            Spacer(Modifier.height(2.dp))
            Text(
                text = label,
                style = AppTypography.Small,
                color = accentColor.copy(alpha = 0.7f),
            )
        }
    }
}

// ─── CustomButton ─────────────────────────────────────────────
@Composable
fun AeroButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
    icon: ImageVector? = null,
    variant: ButtonVariant = ButtonVariant.Primary,
) {
    val bgColor = when (variant) {
        ButtonVariant.Primary -> AppColors.Blue
        ButtonVariant.Secondary -> AppColors.Glass
        ButtonVariant.Ghost -> Color.Transparent
        ButtonVariant.Danger -> AppColors.Error
    }
    val textColor = when (variant) {
        ButtonVariant.Primary -> AppColors.TextPrimary
        ButtonVariant.Secondary -> AppColors.TextSecondary
        ButtonVariant.Ghost -> AppColors.TextSecondary
        ButtonVariant.Danger -> AppColors.TextPrimary
    }
    val borderModifier = when (variant) {
        ButtonVariant.Secondary -> Modifier.border(1.dp, if (enabled) AppColors.Border else AppColors.Border.copy(alpha = 0.5f), RoundedCornerShape(AppShapes.Medium))
        else -> Modifier
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp)
            .clip(RoundedCornerShape(AppShapes.Medium))
            .then(borderModifier)
            .background(if (enabled) bgColor else bgColor.copy(alpha = 0.5f))
            .clickable(enabled = enabled && !loading) { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(22.dp),
                color = textColor,
                strokeWidth = 2.dp,
            )
        } else {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.SM),
            ) {
                icon?.let {
                    Icon(it, contentDescription = null, tint = textColor, modifier = Modifier.size(18.dp))
                }
                Text(
                    text = text,
                    style = AppTypography.Label,
                    color = textColor,
                )
            }
        }
    }
}

enum class ButtonVariant { Primary, Secondary, Ghost, Danger }

// ─── Custom Input Field ──────────────────────────────────────
@Composable
fun AeroTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    leadingIcon: ImageVector? = null,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions(),
    visualTransformation: VisualTransformation = VisualTransformation.None,
    isError: Boolean = false,
    errorText: String? = null,
) {
    Column(modifier = modifier) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            label = { Text(label, style = AppTypography.Body) },
            placeholder = if (placeholder.isNotEmpty()) {
                { Text(placeholder, style = AppTypography.Body, color = AppColors.TextDisabled) }
            } else null,
            leadingIcon = leadingIcon?.let {
                { Icon(it, contentDescription = null, tint = AppColors.TextMuted, modifier = Modifier.size(20.dp)) }
            },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(AppShapes.Medium),
            keyboardOptions = keyboardOptions,
            keyboardActions = keyboardActions,
            visualTransformation = visualTransformation,
            isError = isError,
            supportingText = errorText?.let { { Text(it, style = AppTypography.Caption, color = AppColors.Error) } },
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
                errorBorderColor = AppColors.Error,
                errorCursorColor = AppColors.Error,
            ),
            textStyle = AppTypography.Body,
        )
    }
}

// ─── Section Header ──────────────────────────────────────────
@Composable
fun SectionHeader(
    icon: ImageVector,
    title: String,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppSpacing.SM),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = AppColors.Blue,
            modifier = Modifier.size(18.dp),
        )
        Text(
            text = title,
            style = AppTypography.Card,
            color = AppColors.TextPrimary,
        )
    }
}

// ─── Info Row ─────────────────────────────────────────────────
@Composable
fun InfoRow(
    icon: ImageVector,
    label: String,
    value: String,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppSpacing.MD),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = AppColors.TextMuted.copy(alpha = 0.6f),
            modifier = Modifier.size(18.dp),
        )
        Text(
            text = label,
            style = AppTypography.Body,
            color = AppColors.TextMuted,
            modifier = Modifier.weight(1f),
        )
        Text(
            text = value,
            style = AppTypography.Body,
            fontWeight = FontWeight.Medium,
            color = AppColors.TextPrimary,
        )
    }
}

// ─── Progress Bar ─────────────────────────────────────────────
@Composable
fun AeroProgressBar(
    progress: Float,
    modifier: Modifier = Modifier,
    color: Color = AppColors.Success,
    trackColor: Color = AppColors.Glass,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(6.dp)
            .clip(RoundedCornerShape(3.dp))
            .background(trackColor)
    ) {
        Box(
            modifier = Modifier
                .fillMaxHeight()
                .fillMaxWidth(fraction = progress.coerceIn(0f, 1f))
                .clip(RoundedCornerShape(3.dp))
                .background(Brush.horizontalGradient(listOf(color, color.copy(alpha = 0.7f))))
        )
    }
}

// ─── Status Badge ─────────────────────────────────────────────
@Composable
fun StatusBadge(
    text: String,
    color: Color,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(AppShapes.Small))
            .background(color.copy(alpha = 0.15f))
            .padding(horizontal = AppSpacing.SM, vertical = AppSpacing.XS),
    ) {
        Text(
            text = text,
            style = AppTypography.Small,
            fontWeight = FontWeight.SemiBold,
            color = color,
        )
    }
}
