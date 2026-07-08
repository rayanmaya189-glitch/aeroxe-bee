package com.aeroxebee.client.device.intelligence

import android.content.Context
import android.os.Build
import android.os.Debug
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.security.MessageDigest

object RuntimeIntegrityChecker {

    data class IntegrityReport(
        val isDebuggerAttached: Boolean,
        val isDeviceDebuggable: Boolean,
        val isRunningUnderTest: Boolean,
        val hasHookFramework: Boolean,
        val hasSuspiciousMaps: Boolean,
        val suspiciousProcessCount: Int,
        val integrityScore: Float,
    )

    private val KNOWN_SUSPICIOUS_PROCESSES = listOf(
        "frida-server", "frida-helper", "frida",
        "com.android.shell:frida", "frida-agent",
        "android.process.acore",
        "com.topjohnwu.magisk",
        "de.robv.android.xposed.installer",
    )

    fun check(): IntegrityReport {
        val debuggerAttached = Debug.isDebuggerConnected()
        val debuggable = isDebuggable()
        val underTest = isUnderTest()
        val hasHook = hasXposed()
        val suspiciousMaps = hasSuspiciousLibraries()
        val procCount = countSuspiciousProcesses()

        var score = 1.0f
        if (debuggerAttached) score -= 0.3f
        if (debuggable) score -= 0.2f
        if (underTest) score -= 0.2f
        if (hasHook) score -= 0.3f
        if (suspiciousMaps) score -= 0.2f
        score -= procCount * 0.1f
        if (score < 0f) score = 0f

        return IntegrityReport(
            isDebuggerAttached = debuggerAttached,
            isDeviceDebuggable = debuggable,
            isRunningUnderTest = underTest,
            hasHookFramework = hasHook,
            hasSuspiciousMaps = suspiciousMaps,
            suspiciousProcessCount = procCount,
            integrityScore = score,
        )
    }

    private fun isDebuggable(): Boolean {
        return try {
            val reader = BufferedReader(InputStreamReader(Runtime.getRuntime().exec("getprop ro.debuggable").inputStream))
            val line = reader.readLine()
            reader.close()
            line == "1"
        } catch (_: Exception) {
            false
        }
    }

    private fun isUnderTest(): Boolean {
        return try {
            Class.forName("androidx.test.InstrumentationRegistry")
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun hasXposed(): Boolean {
        return try {
            Class.forName("de.robv.android.xposed.XposedBridge")
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun hasSuspiciousLibraries(): Boolean {
        return try {
            val maps = File("/proc/self/maps").readText()
            listOf("libfrida", "libgadget", "libsubstrate", "libxposed", "libcycript", "libinject")
                .any { maps.contains(it) }
        } catch (_: Exception) {
            false
        }
    }

    private fun countSuspiciousProcesses(): Int {
        return try {
            val dir = File("/proc")
            val pids = dir.listFiles { file -> file.isDirectory && file.name.all { it.isDigit() } } ?: emptyArray()
            var count = 0
            for (pidDir in pids) {
                try {
                    val cmdline = File(pidDir, "cmdline").readText().trimEnd('\u0000')
                    if (KNOWN_SUSPICIOUS_PROCESSES.any { cmdline.contains(it) }) {
                        count++
                    }
                } catch (_: Exception) { }
            }
            count
        } catch (_: Exception) {
            0
        }
    }
}
