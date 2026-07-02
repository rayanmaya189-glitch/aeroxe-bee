package com.textbee.client.data.remote.mqtt

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.launch
import org.eclipse.paho.client.mqttv3.*
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MqttManager @Inject constructor() {
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
        try {
            if (client?.isConnected == true) disconnect()

            val persistence = MemoryPersistence()
            client = MqttClient(brokerUrl, clientId, persistence).also {
                it.setCallback(callback)
            }

            val options = MqttConnectOptions().apply {
                isCleanSession = true
                connectionTimeout = CONNECT_TIMEOUT
                keepAliveInterval = KEEP_ALIVE
                isAutomaticReconnect = false
                username?.let { userName = it }
                password?.let { this.password = it.toCharArray() }
            }

            client?.connect(options)
            isConnected = true
            reconnectDelay = RECONNECT_DELAY_MS
            _connectionState.tryEmit(true)
            Log.i(TAG, "MQTT connected to $brokerUrl")
        } catch (e: Exception) {
            Log.e(TAG, "MQTT connect failed: ${e.message}")
            scheduleReconnect()
        }
    }

    fun subscribe(topic: String) {
        try {
            client?.subscribe(topic, QOS)
            Log.d(TAG, "Subscribed to $topic")
        } catch (e: Exception) {
            Log.e(TAG, "Subscribe failed: ${e.message}")
        }
    }

    fun publish(topic: String, payload: String) {
        try {
            val message = MqttMessage(payload.toByteArray()).apply { qos = QOS }
            client?.publish(topic, message)
        } catch (e: Exception) {
            Log.e(TAG, "Publish failed: ${e.message}")
        }
    }

    fun disconnect() {
        try {
            client?.disconnect()
            client?.close()
        } catch (_: Exception) {}
        isConnected = false
        _connectionState.tryEmit(false)
    }

    fun isConnected(): Boolean = isConnected

    private fun scheduleReconnect() {
        if (isConnected) return
        scope.launch {
            delay(reconnectDelay)
            reconnectDelay = (reconnectDelay * 2).coerceAtMost(MAX_RECONNECT_DELAY)
            Log.i(TAG, "Reconnecting in ${reconnectDelay}ms...")
            connect(
                brokerUrl = client?.serverURI ?: return@launch,
                clientId = client?.clientId ?: return@launch,
            )
        }
    }

    fun destroy() {
        disconnect()
    }
}
