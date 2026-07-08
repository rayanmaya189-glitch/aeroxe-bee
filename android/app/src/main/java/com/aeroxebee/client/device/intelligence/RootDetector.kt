package com.aeroxebee.client.device.intelligence

import java.io.BufferedReader
import java.io.File

object RootDetector {

    private val KNOWN_ROOT_BINARIES = listOf(
        "su", "magisk", "busybox", "supolicy", "daemonsu",
    )

    private val KNOWN_ROOT_PATHS = listOf(
        "/system/app/Superuser.apk",
        "/system/app/SuperSU.apk",
        "/system/app/Magisk.apk",
        "/system/xbin/su",
        "/system/bin/su",
        "/sbin/su",
        "/data/local/su",
        "/data/local/xbin/su",
        "/data/local/bin/su",
        "/system/sd/xbin/su",
        "/system/bin/failsafe/su",
        "/data/local/magisk.img",
        "/data/local/tmp/magisk.db",
    )

    private val KNOWN_ROOT_SPECIFIC_PACKAGES = listOf(
        "com.topjohnwu.magisk",
        "com.noshufou.android.su",
        "com.thirdparty.superuser",
        "eu.chainfire.supersu",
        "com.koushikdutta.superuser",
        "com.koushikdutta.rommanager",
    )

    fun isRooted(): Boolean {
        return hasSuBinary() || hasKnownRootPath() || hasMagiskMountedDir()
    }

    fun getFlags(): Map<String, Boolean> {
        return mapOf(
            "root_su_binary" to hasSuBinary(),
            "root_known_path" to hasKnownRootPath(),
            "root_magisk_mount" to hasMagiskMountedDir(),
            "root_busybox" to hasBusybox(),
        )
    }

    fun getConfidence(): Float {
        val flags = getFlags().values
        val matched = flags.count { it }
        return matched.toFloat() / flags.size.toFloat()
    }

    private fun hasSuBinary(): Boolean {
        return try {
            val process = Runtime.getRuntime().exec(arrayOf("which", "su"))
            val reader = BufferedReader(process.inputStream.reader())
            val line = reader.readLine()
            process.destroy()
            !line.isNullOrBlank()
        } catch (_: Exception) {
            false
        }
    }

    private fun hasKnownRootPath(): Boolean {
        return KNOWN_ROOT_PATHS.any { File(it).exists() }
    }

    private fun hasMagiskMountedDir(): Boolean {
        return try {
            val env = System.getenv()
            env["MAGISK_ENABLE"] != null || env["MAGISK_PATH"] != null
        } catch (_: Exception) {
            false
        }
    }

    private fun hasBusybox(): Boolean {
        return try {
            val process = Runtime.getRuntime().exec(arrayOf("which", "busybox"))
            val reader = BufferedReader(process.inputStream.reader())
            val line = reader.readLine()
            process.destroy()
            !line.isNullOrBlank()
        } catch (_: Exception) {
            false
        }
    }

    fun isMagiskInstalled(): Boolean {
        return try {
            val process = Runtime.getRuntime().exec(arrayOf("magisk", "-v"))
            val reader = BufferedReader(process.inputStream.reader())
            val line = reader.readLine()
            process.destroy()
            !line.isNullOrBlank()
        } catch (_: Exception) {
            false
        }
    }
}
