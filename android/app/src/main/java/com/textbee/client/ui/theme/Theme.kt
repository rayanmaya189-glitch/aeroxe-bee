package com.textbee.client.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

val Blue400 = Color(0xFF60A5FA)
val Blue500 = Color(0xFF3B82F6)
val Blue600 = Color(0xFF2563EB)
val Blue700 = Color(0xFF1D4ED8)
val Blue50 = Color(0xFFEFF6FF)
val Blue100 = Color(0xFFDBEAFE)

val SurfaceLight = Color(0xFFF8FAFC)
val SurfaceDark = Color(0xFF0F172A)
val SurfaceDarkCard = Color(0xFF1E293B)

val Success = Color(0xFF10B981)
val Warning = Color(0xFFF59E0B)
val Danger = Color(0xFFEF4444)

private val LightColorScheme = lightColorScheme(
    primary = Blue600,
    onPrimary = Color.White,
    primaryContainer = Blue100,
    secondary = Blue500,
    background = SurfaceLight,
    surface = Color.White,
    surfaceVariant = Color(0xFFF1F5F9),
    error = Danger,
    onBackground = Color(0xFF0F172A),
    onSurface = Color(0xFF1E293B),
    outline = Color(0xFFCBD5E1),
)

private val DarkColorScheme = darkColorScheme(
    primary = Blue400,
    onPrimary = Color.Black,
    primaryContainer = Blue700,
    secondary = Blue500,
    background = SurfaceDark,
    surface = SurfaceDarkCard,
    surfaceVariant = Color(0xFF334155),
    error = Danger,
    onBackground = Color(0xFFF1F5F9),
    onSurface = Color(0xFFE2E8F0),
    outline = Color(0xFF475569),
)

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
            window.statusBarColor = colorScheme.surface.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography(),
        content = content,
    )
}
