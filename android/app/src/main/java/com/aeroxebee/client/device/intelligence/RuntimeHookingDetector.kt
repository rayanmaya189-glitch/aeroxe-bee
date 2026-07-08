package com.aeroxebee.client.device.intelligence

import android.os.Build
import java.io.BufferedReader
import java.io.File

object RuntimeHookingDetector {

    private val KNOWN_FRIDA_LIBS = listOf(
        "frida-agent", "frida-gadget", "frida-helper",
        "gadget", "frida", "gadget-2",
    )

    private val KNOWN_XPOSED_CLASSES = listOf(
        "de.robv.android.xposed.XposedBridge",
        "de.robv.android.xposed.XposedHelpers",
        "com.saurik.substrate.MS",
    )

    private val KNOWN_SUSPICIOUS_PROCESSES = listOf(
        "frida-server", "frida-helper", "frida",
        "com.android.shell:frida", "frida-agent",
    )

    private val KNOWN_SUSPICIOUS_LIBS = listOf(
        "libfrida", "libgadget", "libsubstrate", "libxposed",
        "libcycript", "libinject", "libhook",
    )

    fun check(): Map<String, Boolean> {
        return mapOf(
            "hook_xposed_classes" to hasXposedClasses(),
            "hook_ptrace_tracer" to isBeingTraced(),
            "hook_debuggable" to isDebuggable(),
            "hook_suspicious_libs" to hasSuspiciousLoadedLibs(),
        )
    }

    fun isHooked(): Boolean {
        return check().values.any { it }
    }

    fun getConfidence(): Float {
        val flags = check().values
        val matched = flags.count { it }
        return matched.toFloat() / flags.size.toFloat()
    }

    private fun hasXposedClasses(): Boolean {
        return try {
            KNOWN_XPOSED_CLASSES.any { cls ->
                try {
                    Class.forName(cls)
                    true
                } catch (_: Exception) {
                    false
                }
            }
        } catch (_: Exception) {
            false
        }
    }

    private fun isBeingTraced(): Boolean {
        return try {
            val tracer = File("/proc/self/status").useLines { lines ->
                lines.find { it.startsWith("TracerPid:") }
                    ?.split(":".toRegex())
                    ?.getOrNull(1)
                    ?.trim()
            }
            tracer != null && tracer != "0"
        } catch (_: Exception) {
            false
        }
    }

    private fun isDebuggable(): Boolean {
        return try {
            val debuggable = File("/proc/self/status").useLines { lines ->
                lines.find { it.startsWith("TracerPid:") }
            }
            debuggable != null
        } catch (_: Exception) {
            false
        }
    }

    private fun hasSuspiciousLoadedLibs(): Boolean {
        return try {
            val maps = File("/proc/self/maps").readText()
            KNOWN_SUSPICIOUS_LIBS.any { maps.contains(it) }
        } catch (_: Exception) {
            false
        }
    }

    fun getLoadedLibraries(): List<String> {
        return try {
            File("/proc/self/maps").readLines()
                .mapNotNull { line ->
                    val parts = line.split(" ")
                    parts.getOrNull(parts.size - 1)?.trim()
                }
                .filter { it.endsWith(".so") || it.endsWith(".so.xz") }
                .distinct()
        } catch (_: Exception) {
            emptyList()
        }
    }
}
