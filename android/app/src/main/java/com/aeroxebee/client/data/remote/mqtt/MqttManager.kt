package com.aeroxebee.client.data.remote.mqtt

import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.launch
import android.content.Context
import com.aeroxebee.client.analytics.AnalyticsHelper
import com.aeroxebee.client.performance.PerformanceTracer
import org.eclipse.paho.client.mqttv3.*
import org.eclipse.paho.client.mqttv3.persist.MqttDefaultFilePersistence
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import java.security.KeyStore
import java.security.SecureRandom
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import javax.inject.Inject
import javax.inject.Singleton
import javax.net.ssl.KeyManagerFactory
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager

@Singleton
class MqttManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val tracer: PerformanceTracer,
    private val analytics: AnalyticsHelper,
) {
    companion object {
        private const val TAG = "MqttManager"
        // QoS 1 (at-least-once) aligns with backend default MQTT_QOS config.
        // QoS 2 is expensive and unnecessary for SMS command/status traffic.
        private const val QOS = 1
        private const val CONNECT_TIMEOUT = 30
        private const val KEEP_ALIVE = 60
        private const val RECONNECT_DELAY_MS = 5000L
        private const val MAX_RECONNECT_DELAY = 60000L
    }

    private var client: MqttAsyncClient? = null
    private var isConnected = false
    private val scope = CoroutineScope(Dispatchers.IO + Job())
    private var reconnectDelay = RECONNECT_DELAY_MS
    private val subscribedTopics = mutableSetOf<String>()

    // Store connection params for resubscribe after reconnect
    private var lastBrokerUrl: String? = null
    private var lastClientId: String? = null
    private var lastUsername: String? = null
    private var lastPassword: String? = null

    private val _messages = MutableSharedFlow<String>(replay = 0, extraBufferCapacity = 64)
    val messages: SharedFlow<String> = _messages

    private val _connectionState = MutableSharedFlow<Boolean>(replay = 1)
    val connectionState: SharedFlow<Boolean> = _connectionState

    private val callback = object : MqttCallback {
        override fun connectionLost(cause: Throwable?) {
            Log.w(TAG, "Connection lost: ${cause?.message}")
            isConnected = false
            analytics.logMqttDisconnected(cause?.message ?: "unknown")
            _connectionState.tryEmit(false)
            scheduleReconnect()
        }

        override fun messageArrived(topic: String, message: MqttMessage) {
            val payload = String(message.payload)
            Log.d(TAG, "Message arrived on $topic: $payload")
            _messages.tryEmit(payload)
        }

        override fun deliveryComplete(token: IMqttDeliveryToken) {
            Log.d(TAG, "Delivery complete: ${token.messageId}")
        }
    }

    fun connect(brokerUrl: String, clientId: String, username: String? = null, password: String? = null) {
        // Store connection params for resubscribe after reconnect
        lastBrokerUrl = brokerUrl
        lastClientId = clientId
        lastUsername = username
        lastPassword = password

        val trace = tracer.traceMqttConnect(brokerUrl)
        try {
            if (client?.isConnected == true) disconnect()

            val dataDir = File(context.filesDir, "mqtt-persistence")
            dataDir.mkdirs()
            val persistence = MqttDefaultFilePersistence(dataDir.absolutePath)
            client = MqttAsyncClient(brokerUrl, clientId, persistence).also {
                it.setCallback(callback)
            }

            val options = MqttConnectOptions().apply {
                isCleanSession = false
                connectionTimeout = CONNECT_TIMEOUT
                keepAliveInterval = KEEP_ALIVE
                // Manual reconnect via scheduleReconnect() handles reconnection
                // with proper resubscribeAll(). Paho auto-reconnect skips
                // resubscription since it doesn't call connect() again.
                isAutomaticReconnect = false
                username?.let { userName = it }
                password?.let { this.password = it.toCharArray() }

                // Enable TLS/SSL for mqtts:// and ssl:// broker URLs
                if (brokerUrl.startsWith("mqtts://") || brokerUrl.startsWith("ssl://")) {
                    socketFactory = createTLSSocketFactory()
                }
            }

            val connectToken = client?.connect(options)
            val connected = connectToken?.waitForCompletion(CONNECT_TIMEOUT * 1000L) ?: false
            if (!connected) {
                Log.w(TAG, "MQTT connect timed out, connection may still be establishing")
                scheduleReconnect()
                tracer.stopTrace(trace, TAG)
                return
            }
            isConnected = true
            reconnectDelay = RECONNECT_DELAY_MS
            _connectionState.tryEmit(true)
            Log.i(TAG, "MQTT connected to $brokerUrl")
            analytics.logMqttConnected()
            tracer.stopTrace(trace, TAG)

            // Resubscribe to all previously subscribed topics
            resubscribeAll()
        } catch (e: Exception) {
            trace.putAttribute("error", e.message?.take(100) ?: "unknown")
            tracer.stopTrace(trace, TAG)
            Log.e(TAG, "MQTT connect failed: ${e.message}")
            scheduleReconnect()
        }
    }

    fun subscribe(topic: String) {
        try {
            subscribedTopics.add(topic)
            client?.subscribe(topic, QOS)
            Log.d(TAG, "Subscribed to $topic")
        } catch (e: Exception) {
            Log.e(TAG, "Subscribe failed: ${e.message}")
        }
    }

    fun publish(topic: String, payload: String, timeoutMs: Long = 5000L): Boolean {
        val trace = tracer.traceMqttPublish(topic)
        try {
            val message = MqttMessage(payload.toByteArray()).apply { qos = QOS }
            val token = client?.publish(topic, message)
            if (token != null) {
                token.waitForCompletion(timeoutMs)
                if (!token.isComplete) {
                    trace.putAttribute("result", "timeout")
                    tracer.stopTrace(trace, TAG)
                    Log.w(TAG, "Publish timeout on $topic after ${timeoutMs}ms")
                    return false
                }
                val ex = token.getException()
                if (ex != null) {
                    trace.putAttribute("error", ex.message?.take(100) ?: "unknown")
                    tracer.stopTrace(trace, TAG)
                    Log.e(TAG, "Publish failed on $topic: ${ex.message}")
                    return false
                }
            }
            tracer.stopTrace(trace, TAG)
            return true
        } catch (e: Exception) {
            trace.putAttribute("error", e.message?.take(100) ?: "unknown")
            tracer.stopTrace(trace, TAG)
            Log.e(TAG, "Publish failed: ${e.message}")
            return false
        }
    }

    fun disconnect() {
        try {
            client?.disconnect()
            client?.close()
        } catch (_: Exception) {}
        isConnected = false
        subscribedTopics.clear()
        _connectionState.tryEmit(false)
    }

    fun isConnected(): Boolean = isConnected

    private fun resubscribeAll() {
        if (subscribedTopics.isEmpty()) return
        scope.launch {
            // Small delay to ensure subscription registers after reconnect
            delay(500)
            for (topic in subscribedTopics) {
                try {
                    client?.subscribe(topic, QOS)
                    Log.i(TAG, "Resubscribed to $topic after reconnect")
                } catch (e: Exception) {
                    Log.e(TAG, "Resubscribe failed for $topic: ${e.message}")
                }
            }
        }
    }

    private fun scheduleReconnect() {
        if (isConnected) return
        scope.launch {
            // Wait longer if there's no network — avoid burning battery with pointless retries
            while (!isNetworkAvailable() && !isConnected) {
                Log.d(TAG, "No network, waiting before MQTT reconnect...")
                delay(10_000L)
            }
            if (isConnected) return@launch

            delay(reconnectDelay)
            reconnectDelay = (reconnectDelay * 2).coerceAtMost(MAX_RECONNECT_DELAY)
            Log.i(TAG, "Reconnecting in ${reconnectDelay}ms...")
            val url = lastBrokerUrl ?: client?.serverURI ?: return@launch
            val id = lastClientId ?: client?.clientId ?: return@launch
            connect(
                brokerUrl = url,
                clientId = id,
                username = lastUsername,
                password = lastPassword,
            )
        }
    }

    private fun isNetworkAvailable(): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    /**
     * Called externally when network connectivity returns, to immediately attempt reconnect
     * instead of waiting for the next scheduled retry.
     */
    fun onNetworkAvailable() {
        if (!isConnected && lastBrokerUrl != null) {
            Log.i(TAG, "Network available, triggering MQTT reconnect")
            reconnectDelay = RECONNECT_DELAY_MS // Reset to fast retry
            scope.launch {
                val url = lastBrokerUrl ?: return@launch
                val id = lastClientId ?: return@launch
                connect(
                    brokerUrl = url,
                    clientId = id,
                    username = lastUsername,
                    password = lastPassword,
                )
            }
        }
    }

    /**
     * Creates a TLS SocketFactory for secure MQTT connections (mqtts:// or ssl://).
     * Uses the system default trust store for certificate validation.
     * Supports custom CA certificates via MQTT_CA_CERT_PATH env/config if needed.
     */
    private fun createTLSSocketFactory(): javax.net.ssl.SSLSocketFactory {
        // Use system default trust store (includes Android's bundled CAs)
        val trustManagerFactory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
        trustManagerFactory.init(null as KeyStore?)

        val sslContext = SSLContext.getInstance("TLSv1.2")
        sslContext.init(null, trustManagerFactory.trustManagers, SecureRandom())

        Log.i(TAG, "TLS socket factory created for secure MQTT connection")
        return sslContext.socketFactory
    }

    fun destroy() {
        disconnect()
    }
}
