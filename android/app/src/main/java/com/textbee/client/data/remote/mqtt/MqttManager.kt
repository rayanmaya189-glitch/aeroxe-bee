package com.textbee.client.data.remote.mqtt

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.launch
import android.content.Context
import org.eclipse.paho.client.mqttv3.*
import org.eclipse.paho.client.mqttv3.persist.MqttDefaultFilePersistence
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MqttManager @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    companion object {
        private const val TAG = "MqttManager"
        private const val QOS = 2
        private const val CONNECT_TIMEOUT = 30
        private const val KEEP_ALIVE = 60
        private const val RECONNECT_DELAY_MS = 5000L
        private const val MAX_RECONNECT_DELAY = 60000L
    }

    private var client: MqttClient? = null
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

        try {
            if (client?.isConnected == true) disconnect()

            val dataDir = File(context.filesDir, "mqtt-persistence")
            dataDir.mkdirs()
            val persistence = MqttDefaultFilePersistence(dataDir.absolutePath)
            client = MqttClient(brokerUrl, clientId, persistence).also {
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
            }

            client?.connect(options)
            isConnected = true
            reconnectDelay = RECONNECT_DELAY_MS
            _connectionState.tryEmit(true)
            Log.i(TAG, "MQTT connected to $brokerUrl")

            // Resubscribe to all previously subscribed topics
            resubscribeAll()
        } catch (e: Exception) {
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
        try {
            val message = MqttMessage(payload.toByteArray()).apply { qos = QOS }
            val token = client?.publish(topic, message)
            if (token != null) {
                token.waitFor(timeoutMs)
                if (!token.isComplete) {
                    Log.w(TAG, "Publish timeout on $topic after ${timeoutMs}ms")
                    return false
                }
                if (token.exception != null) {
                    Log.e(TAG, "Publish failed on $topic: ${token.exception?.message}")
                    return false
                }
            }
            return true
        } catch (e: Exception) {
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

    fun destroy() {
        disconnect()
    }
}
