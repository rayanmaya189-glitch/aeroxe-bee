package com.aeroxebee.client.performance

import android.util.Log
import com.google.firebase.perf.FirebasePerformance
import com.google.firebase.perf.metrics.Trace
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Typed wrapper around Firebase Performance Monitoring for custom traces.
 * Each critical path gets a named trace with relevant attributes for
 * debugging performance issues in the Firebase console.
 */
@Singleton
class PerformanceTracer @Inject constructor() {

    // ─── MQTT Traces ─────────────────────────────────────────

    /**
     * Trace MQTT broker connection time.
     * Call start() before connect(), stop() after connect() completes or fails.
     */
    fun traceMqttConnect(brokerUrl: String): Trace {
        val trace = FirebasePerformance.startTrace("mqtt_connect")
        trace.putAttribute("broker_url", sanitizeUrl(brokerUrl))
        return trace
    }

    /**
     * Trace MQTT message publish latency.
     * Call start() before publish(), stop() after publish() completes.
     */
    fun traceMqttPublish(topic: String): Trace {
        val trace = FirebasePerformance.startTrace("mqtt_publish")
        trace.putAttribute("topic", topic)
        return trace
    }

    // ─── FCM Traces ──────────────────────────────────────────

    /**
     * Trace FCM token registration round-trip (fetch token + register with backend).
     */
    fun traceFcmRegistration(): Trace {
        return FirebasePerformance.startTrace("fcm_token_registration")
    }

    // ─── SMS Traces ──────────────────────────────────────────

    /**
     * Trace SMS send latency (SmsManager API call).
     */
    fun traceSmsSend(recipient: String, partCount: Int): Trace {
        val trace = FirebasePerformance.startTrace("sms_send")
        trace.putAttribute("recipient_country", extractCountryCode(recipient))
        trace.putAttribute("part_count", partCount.toString())
        return trace
    }

    // ─── Message Processing Trace ─────────────────────────────

    /**
     * Trace the full MQTT message → SMS send → status report round-trip.
     */
    fun traceMessageRoundTrip(action: String): Trace {
        val trace = FirebasePerformance.startTrace("message_round_trip")
        trace.putAttribute("action", action)
        return trace
    }

    // ─── Helpers ──────────────────────────────────────────────

    /**
     * Safely stop a trace, catching any exceptions.
     * Firebase traces can throw if the trace was already stopped or if
     * the SDK encountered an internal error.
     */
    fun stopTrace(trace: Trace?, tag: String = "PerformanceTracer") {
        try {
            trace?.stop()
        } catch (e: Exception) {
            Log.w(tag, "Failed to stop trace: ${e.message}")
        }
    }

    private fun sanitizeUrl(url: String): String {
        // Strip credentials and path from broker URL for privacy
        return url.replace(Regex("://[^@]*@"), "://***@")
            .replace(Regex(":[0-9]+/?$"), "")
            .take(100)
    }

    private fun extractCountryCode(phone: String): String {
        if (phone.length < 3) return "unknown"
        val cleaned = if (phone.startsWith("+")) phone.substring(1) else phone
        return when {
            cleaned.startsWith("1") -> "US"
            cleaned.startsWith("44") -> "GB"
            cleaned.startsWith("91") -> "IN"
            cleaned.startsWith("86") -> "CN"
            cleaned.startsWith("81") -> "JP"
            cleaned.startsWith("82") -> "KR"
            cleaned.startsWith("49") -> "DE"
            cleaned.startsWith("33") -> "FR"
            cleaned.startsWith("61") -> "AU"
            cleaned.startsWith("55") -> "BR"
            cleaned.startsWith("7") -> "RU"
            cleaned.startsWith("52") -> "MX"
            cleaned.startsWith("971") -> "AE"
            else -> "other"
        }
    }
}
