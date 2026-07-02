package com.textbee.client.util

import android.os.Build

data class OEMBatteryGuideEntry(
    val manufacturer: String,
    val displayName: String,
    val instructions: List<String>,
)

object OEMBatteryGuide {
    private val guides = listOf(
        OEMBatteryGuideEntry(
            manufacturer = "xiaomi",
            displayName = "Xiaomi / Redmi",
            instructions = listOf(
                "Open Settings → Apps → Manage apps",
                "Find AeroXe Bee and tap on it",
                "Tap 'Battery saver' and select 'No restrictions'",
                "Go to Settings → Apps → Manage apps → AeroXe Bee → 'Other permissions' → enable 'Autostart'",
                "Go to Settings → Battery → 'Battery Saver' → 'App battery saver' → select AeroXe Bee → 'No restrictions'",
                "Lock the app in the recent apps list (pull down on the app preview)",
            ),
        ),
        OEMBatteryGuideEntry(
            manufacturer = "huawei",
            displayName = "Huawei / Honor",
            instructions = listOf(
                "Open Settings → Apps → Apps → AeroXe Bee → Battery → 'App launch'",
                "Set to 'Manage manually' and enable all three toggles",
                "Go to Settings → Battery → 'App battery management' → select AeroXe Bee → 'No restrictions'",
                "Go to Phone Manager → 'App launch' → find AeroXe Bee → toggle off 'Manage automatically' → enable all toggles",
                "Lock the app in recent apps (swipe down on the app preview)",
            ),
        ),
        OEMBatteryGuideEntry(
            manufacturer = "oppo",
            displayName = "OPPO / Realme",
            instructions = listOf(
                "Open Settings → Apps → App management → AeroXe Bee → 'Battery' → 'Allow background activity'",
                "Go to Settings → Battery → 'Battery optimization' → find AeroXe Bee → select 'Don't optimize'",
                "Open the recent apps screen and lock the app (tap the ⋮ menu or pull down on the preview)",
                "Go to Settings → 'Notification & Status Bar' → 'Notification Manager' → AeroXe Bee → enable all",
            ),
        ),
        OEMBatteryGuideEntry(
            manufacturer = "vivo",
            displayName = "Vivo / iQOO",
            instructions = listOf(
                "Open Settings → Apps → App management → AeroXe Bee → 'Battery' → 'Background activity' → enable",
                "Go to Settings → Battery → 'Background app management' → find AeroXe Bee → toggle to 'Allow background activity'",
                "Open iManager → 'App management' → 'Auto-start management' → enable AeroXe Bee",
                "Lock the app in recent apps (swipe down on the app preview)",
            ),
        ),
        OEMBatteryGuideEntry(
            manufacturer = "oneplus",
            displayName = "OnePlus",
            instructions = listOf(
                "Open Settings → Battery → 'Battery optimization' → find AeroXe Bee → select 'Don't optimize'",
                "Go to Settings → Apps → App management → AeroXe Bee → 'Battery' → 'Background activity' → enable",
                "Open the recent apps screen and lock the app (tap the ⋮ menu and select the lock icon)",
                "Go to Settings → Apps → 'Auto-start' → enable AeroXe Bee",
            ),
        ),
        OEMBatteryGuideEntry(
            manufacturer = "samsung",
            displayName = "Samsung",
            instructions = listOf(
                "Open Settings → Apps → AeroXe Bee → 'Battery' → 'Unrestricted' (not 'Optimized' or 'Restricted')",
                "Go to Settings → Device care → Battery → 'App power management' → 'Apps that won't be put to sleep' → add AeroXe Bee",
                "Go to Settings → Device care → Memory → 'Apps that won't be closed' → add AeroXe Bee",
            ),
        ),
        OEMBatteryGuideEntry(
            manufacturer = "asus",
            displayName = "ASUS",
            instructions = listOf(
                "Open Settings → Battery → 'Battery optimization' → find AeroXe Bee → select 'Don't optimize'",
                "Go to Settings → Apps & notifications → App info → AeroXe Bee → 'Battery' → 'Background restriction' → tap 'No restriction'",
                "Open the recent apps screen and lock the app (tap the lock icon on the app preview)",
            ),
        ),
        OEMBatteryGuideEntry(
            manufacturer = "google",
            displayName = "Google / Pixel",
            instructions = listOf(
                "Open Settings → Apps → AeroXe Bee → 'App battery usage' → 'Unrestricted'",
                "Open Settings → Battery → 'Battery optimization' → find AeroXe Bee → select 'Don't optimize'",
            ),
        ),
    )

    fun find(manufacturer: String): OEMBatteryGuideEntry? {
        val lower = manufacturer.lowercase()
        return guides.find { lower.contains(it.manufacturer) }
    }

    fun getGeneralInstructions(): List<String> = listOf(
        "Open your device's Settings app",
        "Find Apps/Applications and select AeroXe Bee",
        "Disable any battery restrictions or optimizations",
        "Enable 'Auto-start' or 'Autostart' if available",
        "Lock the app in the recent apps overview",
        "Disable any 'Deep Clean' or 'Smart Manager' features for the app",
    )

    val knownManufacturers: List<String>
        get() = guides.map { it.displayName }
}
