package com.aeroxebee.client.device.intelligence

import android.app.ActivityManager
import android.content.Context
import android.content.pm.PackageManager

object VirtualizationDetector {

    private val KNOWN_VIRTUALIZATION_APKS = listOf(
        "com.lbe.parallel",
        "com.lbe.parallel.intl",
        "com.parallel.space",
        "com.parallel.space.intl",
        "com.parallel.space.lite",
        "com.parallel.space.multiple",
        "com.pspace.virtual",
        "com.vmos.droid",
        "com.vmos.pro",
        "com.lerist.vmos",
        "com.lerist.vmos.pro",
        "com.pspace.virtual.phone",
        "com.pspace.virtual.phone.pro",
        "io.va.exposed",
        "exposed.va",
        "com.x8.work",
        "com.x8.works",
        "com.x8.lite",
        "io.va.exposed.virtual",
        "com.dual.space",
        "com.dual.space.pro",
        "com.dual.space.multiple",
        "com.pspace.dual",
        "com.pspace.dualspace",
        "com.parallel.dualspace",
        "com.qeexo.smartbox",
        "com.pspace.dualspace.pro",
        "com.jiubang.commerce.easy",
        "com.jiubang.commerce.gomobile",
        "com.pspace.multiple.accounts",
        "com.pspace.multiple.accounts.pro",
        "com.applisto.appcloner",
        "com.applisto.appcloner.premium",
        "org.slstudio.appclone",
        "com.excelliance.dualaid",
        "com.excelliance.kxqp",
    )

    private val KNOWN_CLONE_LAUNCHER_PREFIXES = listOf(
        "com.parallel",
        "com.pspace",
        "com.vmos",
        "com.lbe.parallel",
        "com.x8",
        "com.dual.space",
        "com.excelliance",
    )

    fun detect(context: Context): Map<String, Boolean> {
        val pm = context.packageManager
        val flags = mutableMapOf<String, Boolean>()
        val installedPackages = try {
            pm.getInstalledApplications(PackageManager.GET_META_DATA).map { it.packageName }
        } catch (_: Exception) {
            emptyList()
        }

        val foundVirtualApps = mutableListOf<String>()
        for (pkg in KNOWN_VIRTUALIZATION_APKS) {
            val installed = pkg in installedPackages
            flags["virt_app_${pkg.replace('.', '_')}"] = installed
            if (installed) foundVirtualApps.add(pkg)
        }

        flags["virt_any_found"] = foundVirtualApps.isNotEmpty()
        return flags
    }

    fun isVirtualEnvironment(context: Context): Boolean {
        val flags = detect(context)
        return flags["virt_any_found"] == true
    }

    fun isRunningInClone(): Boolean {
        return try {
            val processName = ActivityManager::class.java
                .getDeclaredField("processName")
                .apply { isAccessible = true }
            val pm = ActivityManager::class.java
                .getDeclaredField("packageName")
                .apply { isAccessible = true }
            false
        } catch (_: Exception) {
            false
        }
    }
}
