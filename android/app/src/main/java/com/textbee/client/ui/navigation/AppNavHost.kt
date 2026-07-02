package com.textbee.client.ui.navigation

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.textbee.client.ui.screens.dashboard.DashboardScreen
import com.textbee.client.ui.screens.device.DeviceScreen
import com.textbee.client.ui.screens.logs.LogsScreen
import com.textbee.client.ui.screens.registration.RegistrationScreen
import com.textbee.client.ui.screens.settings.SettingsScreen
import com.textbee.client.util.TokenManager
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

sealed class Screen(val route: String, val title: String, val icon: ImageVector, val selectedIcon: ImageVector) {
    data object Dashboard : Screen("dashboard", "Dashboard", Icons.Outlined.Home, Icons.Filled.Home)
    data object Logs : Screen("logs", "SMS Logs", Icons.Outlined.MailOutline, Icons.Filled.Mail)
    data object Device : Screen("device", "Device", Icons.Outlined.PhoneAndroid, Icons.Filled.PhoneAndroid)
    data object Settings : Screen("settings", "Settings", Icons.Outlined.Settings, Icons.Filled.Settings)
}

private val bottomNavItems = listOf(
    Screen.Dashboard, Screen.Logs, Screen.Device, Screen.Settings,
)

/** Slide direction: left↔right based on route index */
private val routeOrder = listOf(
    Screen.Dashboard.route,
    Screen.Logs.route,
    Screen.Device.route,
    Screen.Settings.route,
)

private fun slideTransitionForRoute(
    targetRoute: String,
    initialRoute: String?,
): EnterTransition {
    val targetIndex = routeOrder.indexOf(targetRoute).coerceAtLeast(0)
    val initialIndex = initialRoute?.let { routeOrder.indexOf(it) }?.coerceAtLeast(0) ?: targetIndex
    return if (targetIndex >= initialIndex) {
        slideInHorizontally(tween(300)) { it / 3 } + fadeIn(tween(300))
    } else {
        slideInHorizontally(tween(300)) { -it / 3 } + fadeIn(tween(300))
    }
}

private fun slideExitForRoute(
    exitRoute: String,
    targetRoute: String?,
): ExitTransition {
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
    val showBottomBar = currentDestination?.route != "registration"
    val currentRoute = currentDestination?.route

    val navHostContent: @Composable (Modifier) -> Unit = { modifier ->
        NavHost(
            navController = navController,
            startDestination = "registration",
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
            composable("registration") {
                RegistrationScreen(
                    onRegistered = {
                        navController.navigate(Screen.Dashboard.route) {
                            popUpTo("registration") { inclusive = true }
                        }
                    }
                )
            }
            composable(Screen.Dashboard.route) { DashboardScreen() }
            composable(Screen.Logs.route) { LogsScreen() }
            composable(Screen.Device.route) { DeviceScreen() }
            composable(Screen.Settings.route) { SettingsScreen() }
        }
    }

    if (showBottomBar) {
        Scaffold(
            containerColor = MaterialTheme.colorScheme.background,
            bottomBar = {
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    tonalElevation = 0.dp,
                ) {
                    bottomNavItems.forEach { screen ->
                        val selected = currentDestination?.hierarchy?.any { it.route == screen.route } == true
                        NavigationBarItem(
                            icon = {
                                Icon(
                                    imageVector = if (selected) screen.selectedIcon else screen.icon,
                                    contentDescription = screen.title,
                                    modifier = Modifier
                                        .padding(vertical = 0.dp),
                                )
                            },
                            label = {
                                Text(
                                    screen.title,
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                                )
                            },
                            selected = selected,
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = MaterialTheme.colorScheme.primary,
                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                            ),
                            onClick = {
                                navController.navigate(screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        )
                    }
                }
            }
        ) { innerPadding ->
            navHostContent(Modifier.padding(innerPadding))
        }
    } else {
        navHostContent(Modifier)
    }
}
