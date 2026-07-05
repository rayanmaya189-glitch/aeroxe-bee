package com.aeroxebee.client.ui.theme

import android.app.Activity
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat

// ─── Brand Colors ─────────────────────────────────────────────
object AppColors {
    // Backgrounds
    val Background      = Color(0xFF030712)
    val SecondaryBg     = Color(0xFF0F172A)
    val Surface         = Color(0xFF111827)
    val Elevated        = Color(0xFF1E293B)
    val Glass           = Color(0x0DFFFFFF) // rgba(255,255,255,0.05)
    val GlassHover      = Color(0x14FFFFFF) // rgba(255,255,255,0.08)
    val Border          = Color(0x14FFFFFF) // rgba(255,255,255,0.08)

    // Brand
    val Blue            = Color(0xFF2563EB)
    val BlueHover       = Color(0xFF1D4ED8)
    val Blue300         = Color(0xFF3B82F6)
    val Indigo          = Color(0xFF4F46E5)
    val Purple          = Color(0xFF7C3AED)
    val DeepPurple      = Color(0xFF9333EA)
    val Cyan            = Color(0xFF06B6D4)
    val Pink            = Color(0xFFEC4899)

    // Status
    val Success         = Color(0xFF10B981)
    val Warning         = Color(0xFFF59E0B)
    val Error           = Color(0xFFEF4444)

    // Text
    val TextPrimary     = Color(0xFFFFFFFF)
    val TextSecondary   = Color(0xFFCBD5E1)
    val TextMuted       = Color(0xFF94A3B8)
    val TextDisabled    = Color(0xFF64748B)

    // Gradients
    val GradientBlue    = listOf(Blue, Indigo, Purple)
    val GradientCyan    = listOf(Cyan, Blue, Purple)
    val GradientHero    = listOf(Blue, Purple, DeepPurple)
    val GradientSuccess = listOf(Success, Color(0xFF34D399))
    val GradientWarning = listOf(Warning, Color(0xFFFBBF24))
    val GradientError   = listOf(Error, Color(0xFFF87171))
}

// ─── Typography ───────────────────────────────────────────────
object AppTypography {
    val Hero = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 34.sp,
        lineHeight = 40.sp,
        letterSpacing = (-1).sp,
    )
    val Title = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
        lineHeight = 30.sp,
        letterSpacing = (-0.5).sp,
    )
    val Section = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
        lineHeight = 26.sp,
    )
    val Card = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 22.sp,
    )
    val Body = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    )
    val BodyLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
    )
    val Caption = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.5.sp,
    )
    val Label = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp,
    )
    val Small = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        lineHeight = 14.sp,
        letterSpacing = 0.5.sp,
    )
}

// ─── Shapes ───────────────────────────────────────────────────
object AppShapes {
    val Small    = 12.dp
    val Medium   = 16.dp
    val Large    = 24.dp
    val XL       = 32.dp
    val Pill     = 999.dp
}

// ─── Spacing ──────────────────────────────────────────────────
object AppSpacing {
    val XS  = 4.dp
    val SM  = 8.dp
    val MD  = 12.dp
    val LG  = 16.dp
    val XL  = 20.dp
    val XXL = 24.dp
    val XXXL = 32.dp
}

// ─── CompositionLocal ─────────────────────────────────────────
val LocalAppColors = staticCompositionLocalOf { AppColors }
val LocalAppTypography = staticCompositionLocalOf { AppTypography }
val LocalAppShapes = staticCompositionLocalOf { AppShapes }
val LocalAppSpacing = staticCompositionLocalOf { AppSpacing }

// ─── Theme ────────────────────────────────────────────────────
@Composable
fun AeroXeTheme(
    content: @Composable () -> Unit,
) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = AppColors.Background.toArgb()
            window.navigationBarColor = AppColors.Background.toArgb()
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = false
                isAppearanceLightNavigationBars = false
            }
        }
    }

    androidx.compose.runtime.CompositionLocalProvider(
        LocalAppColors provides AppColors,
        LocalAppTypography provides AppTypography,
        LocalAppShapes provides AppShapes,
        LocalAppSpacing provides AppSpacing,
    ) {
        content()
    }
}
