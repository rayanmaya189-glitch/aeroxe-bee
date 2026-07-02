package com.textbee.client.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat

// ─── Honey Palette ──────────────────────────────────────────────
val Honey50  = Color(0xFFFFFBEB)
val Honey100 = Color(0xFFFEF3C7)
val Honey200 = Color(0xFFFDE68A)
val Honey300 = Color(0xFFFCD34D)
val Honey400 = Color(0xFFFBBF24)
val Honey500 = Color(0xFFF59E0B)
val Honey600 = Color(0xFFD97706)
val Honey700 = Color(0xFFB45309)

// ─── Slate Palette ──────────────────────────────────────────────
val Slate50  = Color(0xFFF8FAFC)
val Slate100 = Color(0xFFF1F5F9)
val Slate200 = Color(0xFFE2E8F0)
val Slate300 = Color(0xFFCBD5E1)
val Slate400 = Color(0xFF94A3B8)
val Slate500 = Color(0xFF64748B)
val Slate600 = Color(0xFF475569)
val Slate700 = Color(0xFF334155)
val Slate800 = Color(0xFF1E293B)
val Slate900 = Color(0xFF0F172A)
val Slate950 = Color(0xFF020617)

// ─── Semantic Colors ────────────────────────────────────────────
val SuccessLight = Color(0xFF059669)
val SuccessDark  = Color(0xFF34D399)
val WarningLight = Color(0xFFD97706)
val WarningDark  = Color(0xFFFBBF24)
val DangerLight  = Color(0xFFDC2626)
val DangerDark   = Color(0xFFF87171)
val InfoDark     = Color(0xFF60A5FA)

// ─── Dark Color Scheme (primary) ───────────────────────────────
private val DarkColorScheme = darkColorScheme(
    primary            = Honey400,
    onPrimary          = Slate950,
    primaryContainer   = Honey700,
    onPrimaryContainer = Honey100,
    secondary          = Honey300,
    onSecondary        = Slate950,
    secondaryContainer = Slate800,
    onSecondaryContainer = Slate100,
    tertiary           = InfoDark,
    background         = Slate950,
    onBackground       = Slate100,
    surface            = Slate900,
    onSurface          = Slate100,
    surfaceVariant     = Slate800,
    onSurfaceVariant   = Slate400,
    surfaceTint        = Honey400,
    error              = DangerDark,
    onError            = Slate950,
    outline            = Slate600,
    outlineVariant     = Slate700,
    inverseSurface     = Slate200,
    inverseOnSurface   = Slate900,
)

// ─── Light Color Scheme ────────────────────────────────────────
private val LightColorScheme = lightColorScheme(
    primary            = Honey600,
    onPrimary          = Color.White,
    primaryContainer   = Honey100,
    onPrimaryContainer = Honey900(),
    secondary          = Honey500,
    onSecondary        = Color.White,
    secondaryContainer = Slate100,
    onSecondaryContainer = Slate900,
    tertiary           = Color(0xFF2563EB),
    background         = Honey50,
    onBackground       = Slate900,
    surface            = Color.White,
    onSurface          = Slate900,
    surfaceVariant     = Slate100,
    onSurfaceVariant   = Slate500,
    error              = DangerLight,
    onError            = Color.White,
    outline            = Slate300,
    outlineVariant     = Slate200,
)

// ─── Typography ────────────────────────────────────────────────
private val AppTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Black,
        fontSize = 40.sp,
        lineHeight = 44.sp,
        letterSpacing = (-1.5).sp,
    ),
    displayMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 32.sp,
        lineHeight = 36.sp,
        letterSpacing = (-0.5).sp,
    ),
    headlineLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
        lineHeight = 34.sp,
        letterSpacing = (-0.25).sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 24.sp,
        lineHeight = 30.sp,
    ),
    headlineSmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
        lineHeight = 26.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 18.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.sp,
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 22.sp,
        letterSpacing = 0.15.sp,
    ),
    titleSmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.15.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.25.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.4.sp,
    ),
    labelLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp,
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.5.sp,
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        lineHeight = 14.sp,
        letterSpacing = 0.5.sp,
    ),
)

// ─── Shapes ────────────────────────────────────────────────────
private val AppShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small      = RoundedCornerShape(12.dp),
    medium     = RoundedCornerShape(16.dp),
    large      = RoundedCornerShape(20.dp),
    extraLarge = RoundedCornerShape(28.dp),
)

// ─── Theme ─────────────────────────────────────────────────────
@Composable
fun TextBeeTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            @Suppress("DEPRECATION")
            window.statusBarColor = colorScheme.background.toArgb()
            window.navigationBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = !darkTheme
                isAppearanceLightNavigationBars = !darkTheme
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = AppTypography,
        shapes = AppShapes,
        content = content,
    )
}

@Suppress("NOTHING_TO_INLINE")
private inline fun Honey900(): Color = Color(0xFF78350F)
