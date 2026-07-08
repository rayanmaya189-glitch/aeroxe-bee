package com.aeroxebee.client.device.intelligence

import android.os.Build

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

    fun isEmulator(): Boolean {
        return matchesFingerprint() || matchesHardware() || matchesProduct() ||
                matchesBoard() || matchesBootloader()
    }

    fun getFlags(): Map<String, Boolean> {
        return mapOf(
            "emulator_fingerprint" to matchesFingerprint(),
            "emulator_hardware" to matchesHardware(),
            "emulator_product" to matchesProduct(),
            "emulator_board" to matchesBoard(),
            "emulator_bootloader" to matchesBootloader(),
        )
    }

    fun getConfidence(): Float {
        val flags = getFlags().values
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
}
