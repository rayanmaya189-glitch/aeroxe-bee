package com.aeroxebee.client.device.intelligence

import android.os.Build
import android.util.DisplayMetrics

object EmulatorDetector {

    private val EMULATOR_BUILD_FINGERPRINTS = listOf(
        "generic", "generic_x86", "generic_x86_64", "generic_arm64",
        "generic_arm", "sdk_gphone", "sdk_gphone64", "sdk_google",
        "google_sdk", "emu64", "emulator64",
    )

    private val EMULATOR_HARDWARE = listOf(
        "goldfish", "ranchu", "vbox", "qemu", "android_x86",
        "android_x86_64", "android_arm", "android_arm64",
    )

    private val EMULATOR_PRODUCTS = listOf(
        "sdk", "sdk_x86", "sdk_gphone", "sdk_gphone64",
        "google_sdk", "generic", "vbox86p", "emulator",
    )

    private val EMULATOR_BOARD = listOf(
        "goldfish", "ranchu", "trout", "vsoc_x86", "vsoc_x86_64",
    )

    private val EMULATOR_BOOTLOADER = listOf(
        "goldfish", "ran chu", "unknown",
    )

    // x86 ABIs that should never appear on ARM devices
    private val X86_ABIS = listOf("x86", "x86_64", "x86_64h")

    // Common emulator-only display densities for resolutions
    private val EMULATOR_DENSITY_RESOLUTION_PAIRS = listOf(
        Pair(720, 1280) to DisplayMetrics.DENSITY_HIGH,      // mdpi on HD is emulator
        Pair(1080, 1920) to DisplayMetrics.DENSITY_MEDIUM,   // mdpi on FHD is emulator
        Pair(1440, 2560) to DisplayMetrics.DENSITY_HIGH,     // hdpi on QHD is emulator
    )

    fun isEmulator(): Boolean {
        return matchesFingerprint() || matchesHardware() || matchesProduct() ||
                matchesBoard() || matchesBootloader() || matchesAbi()
    }

    fun getFlags(context: android.content.Context? = null): Map<String, Boolean> {
        return mapOf(
            "emulator_fingerprint" to matchesFingerprint(),
            "emulator_hardware" to matchesHardware(),
            "emulator_product" to matchesProduct(),
            "emulator_board" to matchesBoard(),
            "emulator_bootloader" to matchesBootloader(),
            "emulator_abi" to matchesAbi(),
            "emulator_display" to (context?.let { matchesDisplay(it) } ?: false),
        )
    }

    fun getConfidence(context: android.content.Context? = null): Float {
        val flags = getFlags(context).values
        val matched = flags.count { it }
        return matched.toFloat() / flags.size.toFloat()
    }

    private fun matchesFingerprint(): Boolean {
        val fp = Build.FINGERPRINT.lowercase()
        return EMULATOR_BUILD_FINGERPRINTS.any { fp.contains(it) }
    }

    private fun matchesHardware(): Boolean {
        val hw = Build.HARDWARE.lowercase()
        return EMULATOR_HARDWARE.any { hw.contains(it) }
    }

    private fun matchesProduct(): Boolean {
        val product = Build.PRODUCT.lowercase()
        return EMULATOR_PRODUCTS.any { product.contains(it) }
    }

    private fun matchesBoard(): Boolean {
        val board = Build.BOARD.lowercase()
        return EMULATOR_BOARD.any { board.contains(it) }
    }

    private fun matchesBootloader(): Boolean {
        val bl = Build.BOOTLOADER.lowercase()
        return EMULATOR_BOOTLOADER.any { bl.contains(it) }
    }

    fun matchesAbi(): Boolean {
        val abis = Build.SUPPORTED_ABIS
        if (abis.isEmpty()) return false
        // If device claims arm architecture but ABIs contain x86, it's emulated
        val isArm = abis.any { it.startsWith("arm") }
        val hasX86 = abis.any { X86_ABIS.contains(it) }
        return hasX86 && !isArm
    }

    fun matchesDisplay(context: android.content.Context): Boolean {
        val metrics = context.resources.displayMetrics
        val w = metrics.widthPixels
        val h = metrics.heightPixels
        val density = metrics.densityDpi
        val minDim = minOf(w, h)
        val maxDim = maxOf(w, h)

        for ((pair, expectedDensity) in EMULATOR_DENSITY_RESOLUTION_PAIRS) {
            if (minDim == pair.first && maxDim == pair.second) {
                if (density <= expectedDensity) return true
            }
        }
        return false
    }
}
