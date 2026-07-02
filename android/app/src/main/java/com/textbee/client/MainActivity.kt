package com.textbee.client

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import com.textbee.client.ui.navigation.AppNavHost
import com.textbee.client.ui.theme.TextBeeTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val requiredPermissions = mutableListOf(
        Manifest.permission.SEND_SMS,
        Manifest.permission.RECEIVE_SMS,
        Manifest.permission.READ_PHONE_STATE,
        Manifest.permission.FOREGROUND_SERVICE,
        Manifest.permission.RECEIVE_BOOT_COMPLETED,
    )

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { /* results handled via state */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (!requiredPermissions.contains(Manifest.permission.POST_NOTIFICATIONS)) {
                requiredPermissions.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            if (!requiredPermissions.contains(Manifest.permission.FOREGROUND_SERVICE_DATA_SYNC)) {
                requiredPermissions.add(Manifest.permission.FOREGROUND_SERVICE_DATA_SYNC)
            }
        }

        requestPermissionsIfNeeded()

        setContent {
            TextBeeTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background,
                ) {
                    AppNavHost()
                }
            }
        }
    }

    private fun requestPermissionsIfNeeded() {
        val missing = requiredPermissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            permissionLauncher.launch(missing.toTypedArray())
        }
    }
}
