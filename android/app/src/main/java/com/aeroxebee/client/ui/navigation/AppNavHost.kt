package com.aeroxebee.client.ui.navigation

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.aeroxebee.client.ui.screens.dashboard.DashboardScreen
import com.aeroxebee.client.ui.screens.device.DeviceScreen
import com.aeroxebee.client.ui.screens.logs.LogsScreen
import com.aeroxebee.client.ui.screens.notifications.NotificationsScreen
import com.aeroxebee.client.ui.screens.onboarding.OnboardingScreen
import com.aeroxebee.client.ui.screens.profile.ProfileScreen
import com.aeroxebee.client.ui.screens.qrscanner.QrScannerScreen
import com.aeroxebee.client.ui.screens.registration.RegistrationScreen
import com.aeroxebee.client.ui.screens.settings.SettingsScreen
import com.aeroxebee.client.ui.screens.splash.SplashScreen
import com.aeroxebee.client.ui.screens.update.UpdateCheckerViewModel
import com.aeroxebee.client.ui.screens.update.UpdateDialog
import com.aeroxebee.client.ui.screens.update.UpdateDownloadDialog
import com.aeroxebee.client.ui.screens.update.UpdateState
import com.aeroxebee.client.ui.theme.*
import com.aeroxebee.client.util.TokenManager
import com.aeroxebee.client.analytics.AnalyticsHelper
import androidx.hilt.navigation.compose.hiltViewModel
import dagger.hilt.EntryPoint
import dagger.hilt.EntryPointAccessors
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

sealed class Screen(val route: String, val title: String, val icon: ImageVector, val selectedIcon: ImageVector) {
    data object Dashboard : Screen("dashboard", "Dashboard", Icons.Outlined.Home, Icons.Filled.Home)
    data object Logs : Screen("logs", "SMS Logs", Icons.Outlined.MailOutline, Icons.Filled.Mail)
    data object Device : Screen("device", "Device", Icons.Outlined.PhoneAndroid, Icons.Filled.PhoneAndroid)
    data object Settings : Screen("settings", "Settings", Icons.Outlined.Settings, Icons.Filled.Settings)
    data object Profile : Screen("profile", "Profile", Icons.Outlined.Person, Icons.Filled.Person)
    data object Notifications : Screen("notifications", "Alerts", Icons.Outlined.Notifications, Icons.Filled.Notifications)
}

private val bottomNavItems = listOf(
    Screen.Dashboard, Screen.Logs, Screen.Device, Screen.Settings,
)

/**
 * Hilt entry point for accessing AnalyticsHelper from a @Composable function.
 */
@EntryPoint
@InstallIn(SingletonComponent::class)
interface NavAnalyticsEntryPoint {
    fun analyticsHelper(): AnalyticsHelper
}

private val routeOrder = listOf(
    Screen.Dashboard.route, Screen.Logs.route, Screen.Device.route, Screen.Settings.route,
)

private fun slideTransitionForRoute(targetRoute: String, initialRoute: String?): EnterTransition {
    val targetIndex = routeOrder.indexOf(targetRoute).coerceAtLeast(0)
    val initialIndex = initialRoute?.let { routeOrder.indexOf(it) }?.coerceAtLeast(0) ?: targetIndex
    return if (targetIndex >= initialIndex) {
        slideInHorizontally(tween(300)) { it / 3 } + fadeIn(tween(300))
    } else {
        slideInHorizontally(tween(300)) { -it / 3 } + fadeIn(tween(300))
    }
}

private fun slideExitForRoute(exitRoute: String, targetRoute: String?): ExitTransition {
    val exitIndex = routeOrder.indexOf(exitRoute).coerceAtLeast(0)
    val targetIndex = targetRoute?.let { routeOrder.indexOf(it) }?.coerceAtLeast(0) ?: exitIndex
    return if (targetIndex >= exitIndex) {
        slideOutHorizontally(tween(300)) { -it / 3 } + fadeOut(tween(200))
    } else {
        slideOutHorizontally(tween(300)) { it / 3 } + fadeOut(tween(200))
    }
}

@Composable
fun AppNavHost() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination
    val hideBottomBarRoutes = listOf("splash", "onboarding", "registration")
    val showBottomBar = currentDestination?.route !in hideBottomBarRoutes
    val currentRoute = currentDestination?.route

    // ─── In-app update checker ─────────────────────────────
    val updateViewModel: UpdateCheckerViewModel = hiltViewModel()
    val updateState by updateViewModel.updateState.collectAsState()

    // Check for updates once when the composable first appears
    LaunchedEffect(Unit) {
        updateViewModel.checkForUpdate()
    }

    // ─── Automatic screen view tracking ────────────────────
    val analytics = remember { EntryPointAccessors.fromApplication(
        navController.context.applicationContext,
        NavAnalyticsEntryPoint::class.java,
    ).analyticsHelper() }

    LaunchedEffect(currentRoute) {
        currentRoute?.let { route ->
            val screenName = when (route) {
                Screen.Dashboard.route -> "Dashboard"
                Screen.Logs.route -> "SMS Logs"
                Screen.Device.route -> "Device"
                Screen.Settings.route -> "Settings"
                Screen.Profile.route -> "Profile"
                Screen.Notifications.route -> "Notifications"
                "splash" -> "Splash"
                "onboarding" -> "Onboarding"
                "registration" -> "Registration"
                else -> route
            }
            analytics.logScreenView(screenName)
        }
    }

    val navHostContent: @Composable (Modifier) -> Unit = { modifier ->
        NavHost(
            navController = navController,
            startDestination = "splash",
            modifier = modifier,
            enterTransition = {
                slideTransitionForRoute(
                    targetRoute = targetState.destination.route ?: "",
                    initialRoute = initialState.destination.route,
                )
            },
            exitTransition = {
                slideExitForRoute(
                    exitRoute = initialState.destination.route ?: "",
                    targetRoute = targetState.destination.route,
                )
            },
            popEnterTransition = {
                slideInHorizontally(tween(300)) { -it / 3 } + fadeIn(tween(300))
            },
            popExitTransition = {
                slideOutHorizontally(tween(300)) { it / 3 } + fadeOut(tween(200))
            },
        ) {
            composable("splash") {
                SplashScreen(
                    onReady = {
                        navController.navigate("onboarding") {
                            popUpTo("splash") { inclusive = true }
                        }
                    }
                )
            }
            composable("onboarding") {
                OnboardingScreen(
                    onComplete = {
                        navController.navigate("registration") {
                            popUpTo("onboarding") { inclusive = true }
                        }
                    }
                )
            }
            composable("registration") {
                RegistrationScreen(
                    onRegistered = {
                        navController.navigate(Screen.Dashboard.route) {
                            popUpTo("registration") { inclusive = true }
                        }
                    },
                    onScanQr = {
                        navController.navigate("qr-scan")
                    },
                )
            }
            composable("qr-scan") {
                QrScannerScreen(
                    onBack = { navController.popBackStack() },
                    onPaired = {
                        navController.navigate(Screen.Dashboard.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                )
            }
            composable(Screen.Dashboard.route) { DashboardScreen() }
            composable(Screen.Logs.route) { LogsScreen() }
            composable(Screen.Device.route) { DeviceScreen() }
            composable(Screen.Settings.route) { SettingsScreen() }
            composable(Screen.Profile.route) { ProfileScreen() }
            composable(Screen.Notifications.route) { NotificationsScreen() }
        }
    }

    if (showBottomBar) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Main content
            navHostContent(Modifier.weight(1f))

            // Custom bottom nav bar
            CustomBottomNavBar(
                items = bottomNavItems,
                currentRoute = currentRoute,
                onNavigate = { screen ->
                    navController.navigate(screen.route) {
                        popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                }
            )
        }
    } else {
        navHostContent(Modifier)
    }

    // ─── Update dialogs ─────────────────────────────────────
    when (val state = updateState) {
        is UpdateState.UpdateAvailable -> {
            UpdateDialog(
                state = state,
                onDownload = { updateViewModel.downloadAndInstall() },
                onDismiss = { updateViewModel.dismissUpdate() },
            )
        }
        is UpdateState.Downloading -> {
            UpdateDownloadDialog(progress = state.progress)
        }
        else -> { /* No dialog */ }
    }
}

@Composable
private fun CustomBottomNavBar(
    items: List<Screen>,
    currentRoute: String?,
    onNavigate: (Screen) -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(AppColors.SecondaryBg)
            .padding(horizontal = AppSpacing.LG, vertical = AppSpacing.SM)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            items.forEach { screen ->
                val selected = currentRoute == screen.route
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(AppShapes.Medium))
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                            onClick = { onNavigate(screen) }
                        )
                        .then(
                            if (selected) {
                                Modifier.background(AppColors.Blue.copy(alpha = 0.12f))
                            } else {
                                Modifier
                            }
                        )
                        .padding(vertical = AppSpacing.SM, horizontal = AppSpacing.XS),
                ) {
                    Icon(
                        imageVector = if (selected) screen.selectedIcon else screen.icon,
                        contentDescription = screen.title,
                        tint = if (selected) AppColors.Blue else AppColors.TextMuted,
                        modifier = Modifier.size(22.dp),
                    )
                    Spacer(Modifier.height(AppSpacing.XS))
                    Text(
                        text = screen.title,
                        style = AppTypography.Small,
                        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                        color = if (selected) AppColors.Blue else AppColors.TextMuted,
                    )
                }
            }
        }
    }
}
