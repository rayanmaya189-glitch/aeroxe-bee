package com.aeroxebee.client.device.sim

object SimRotationFrequency {
    private const val WINDOW_MS = 60 * 60 * 1000L
    private const val HIGH_FREQ_THRESHOLD = 3

    fun isHighFrequency(events: List<Long>): Boolean {
        val now = System.currentTimeMillis()
        val recent = events.filter { now - it < WINDOW_MS }
        return recent.size >= HIGH_FREQ_THRESHOLD
    }

    fun countInWindow(events: List<Long>, windowMs: Long = WINDOW_MS): Int {
        val now = System.currentTimeMillis()
        return events.count { now - it < windowMs }
    }

    fun classify(events: List<Long>): String {
        val count = countInWindow(events)
        return when {
            count >= 5 -> "CRITICAL"
            count >= 3 -> "HIGH"
            count == 2 -> "MEDIUM"
            count == 1 -> "LOW"
            else -> "NONE"
        }
    }
}
