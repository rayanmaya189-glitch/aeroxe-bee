package com.aeroxebee.client.worker

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.annotation.SuppressLint
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.WifiInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.telephony.SignalStrength
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.aeroxebee.client.MainActivity
import com.aeroxebee.client.R
import com.aeroxebee.client.data.remote.mqtt.MqttManager
import com.aeroxebee.client.data.remote.model.SMSCommand
import com.aeroxebee.client.data.remote.model.StatusUpdateRequest
import com.aeroxebee.client.data.repository.SMSTaskRepository
import com.aeroxebee.client.domain.model.SMSTask
import com.aeroxebee.client.performance.PerformanceTracer
import com.aeroxebee.client.sms.SMSEngine
import com.aeroxebee.client.util.DeviceStateClassifier
import com.aeroxebee.client.util.TokenManager
import com.google.gson.Gson
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import javax.inject.Inject

@AndroidEntryPoint
class MqttService : Service() {

    @Inject lateinit var mqttManager: MqttManager
    @Inject lateinit var tokenManager: TokenManager
    @Inject lateinit var smsEngine: SMSEngine
    @Inject lateinit var smsRepository: SMSTaskRepository
    @Inject lateinit var deviceStateClassifier: DeviceStateClassifier
    @Inject lateinit var tracer: PerformanceTracer

    private val gson = Gson()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var deviceId: String = ""
    private var heartbeatJob: Job? = null
    private var connectionMonitorJob: Job? = null
    private var retryJob: Job? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private var isReconnecting = false
    private var wakeLock: PowerManager.WakeLock? = null
    private var wakeLockRenewalJob: Job? = null
    private var connectivityManager: ConnectivityManager? = null

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIFICATION_ID, createNotification("Connecting..."))

        // Acquire partial WakeLock to keep CPU alive for MQTT processing in Doze
        acquireWakeLock()

        deviceId = tokenManager.getDeviceId() ?: ""
        val brokerUrl = tokenManager.getMqttBrokerUrl()

        if (brokerUrl.isNullOrBlank() || deviceId.isBlank()) {
            Log.w(TAG, "No MQTT credentials, stopping service")
            stopSelf()
            return
        }

        connectAndSubscribe()

        scope.launch {
            mqttManager.messages.collect { payload ->
                processMqttMessage(payload)
            }
        }

        startConnectionMonitor()
        startHeartbeat()
        startRetryProcessor()
        registerNetworkCallback()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun connectAndSubscribe() {
        val brokerUrl = tokenManager.getMqttBrokerUrl() ?: return
        val username = tokenManager.getMqttUsername()
        val password = tokenManager.getMqttPassword()
        val clientId = "aeroxebee_android_$deviceId"

        mqttManager.connect(brokerUrl, clientId, username, password)
        // Subscriptions are tracked by MqttManager and auto-resubscribed on reconnect
        mqttManager.subscribe("devices/$deviceId/commands")
        mqttManager.subscribe("devices/$deviceId/pong")

        isReconnecting = false
        updateNotification("Connected to broker")
    }

    private fun startConnectionMonitor() {
        connectionMonitorJob = scope.launch {
            mqttManager.connectionState.collect { connected ->
                if (!connected && !isReconnecting) {
                    isReconnecting = true
                    updateNotification("Reconnecting...")
                    Log.w(TAG, "MQTT disconnected, waiting for auto-reconnect...")
                } else if (connected) {
                    isReconnecting = false
                    updateNotification("Connected to broker")
                    Log.i(TAG, "MQTT reconnected")
                }
            }
        }
    }

    /**
     * Adaptive heartbeat: 30s when active, 60s when battery is moderate,
     * 120s when battery is low or device is in Doze. Saves battery significantly.
     */
    private fun getHeartbeatIntervalMs(): Long {
        val batteryLevel = getBatteryLevel()
        val isIdleMode = try {
            val pm = getSystemService(POWER_SERVICE) as PowerManager
            pm.isDeviceIdleMode
        } catch (_: Exception) { false }

        return when {
            isIdleMode -> 120_000L                           // 2 min in Doze
            batteryLevel <= 15 -> 120_000L                   // 2 min at low battery
            batteryLevel <= 30 -> 60_000L                    // 1 min at moderate battery
            else -> HEARTBEAT_INTERVAL_MS                    // 30s normally
        }
    }

    @SuppressLint("MissingPermission")
    private fun getNetworkInfo(): Pair<String, Boolean> {
        val cm = getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork
        if (network == null) return "None" to false
        val caps = cm.getNetworkCapabilities(network) ?: return "Unknown" to false
        val isConnected = caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
        val type = when {
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "WiFi"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "Ethernet"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> getCellularType()
            else -> "Other"
        }
        return type to isConnected
    }

    @SuppressLint("MissingPermission")
    private fun getCellularType(): String {
        val tm = getSystemService(TELEPHONY_SERVICE) as TelephonyManager
        return when (tm.dataNetworkType) {
            TelephonyManager.NETWORK_TYPE_NR -> "5G"
            TelephonyManager.NETWORK_TYPE_LTE -> "LTE"
            TelephonyManager.NETWORK_TYPE_UMTS,
            TelephonyManager.NETWORK_TYPE_HSDPA,
            TelephonyManager.NETWORK_TYPE_HSUPA,
            TelephonyManager.NETWORK_TYPE_HSPAP -> "3G"
            TelephonyManager.NETWORK_TYPE_EDGE,
            TelephonyManager.NETWORK_TYPE_GPRS,
            TelephonyManager.NETWORK_TYPE_GSM -> "2G"
            TelephonyManager.NETWORK_TYPE_CDMA,
            TelephonyManager.NETWORK_TYPE_EVDO_0,
            TelephonyManager.NETWORK_TYPE_EVDO_A -> "CDMA"
            else -> "Cellular"
        }
    }

    /**
     * Returns signal strength as Pair(rssi_dbm, level_0_to_4).
     * For WiFi: RSSI in dBm and calculated level (0-4).
     * For cellular: RSSI from CellInfo and signal level.
     */
    @SuppressLint("MissingPermission")
    private fun getSignalStrength(): Pair<Int, Int> {
        val cm = getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return 0 to 0
        val caps = cm.getNetworkCapabilities(network) ?: return 0 to 0

        return when {
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> getWifiSignalStrength()
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> getCellularSignalStrength()
            else -> 0 to 0
        }
    }

    @Suppress("DEPRECATION")
    private fun getWifiSignalStrength(): Pair<Int, Int> {
        val wm = applicationContext.getSystemService(WIFI_SERVICE) as WifiManager
        val wifiInfo: WifiInfo = wm.connectionInfo
        val rssi = wifiInfo.rssi
        // Map RSSI to level 0-4 (same as WifiManager.calculateSignalLevel)
        val level = when {
            rssi <= -100 -> 0
            rssi <= -80 -> 1
            rssi <= -67 -> 2
            rssi <= -55 -> 3
            else -> 4
        }
        return rssi to level
    }

    @Suppress("DEPRECATION")
    private fun getCellularSignalStrength(): Pair<Int, Int> {
        val tm = getSystemService(TELEPHONY_SERVICE) as TelephonyManager
        try {
            // Use getSignalStrength() — deprecated but doesn't require ACCESS_FINE_LOCATION
            // unlike getAllCellInfo() which needs location permission on API 29+
            val ss: SignalStrength? = tm.signalStrength
            if (ss != null) {
                val dbm = ss.cellSignalStrengths.firstOrNull()?.dbm ?: 0
                val level = ss.cellSignalStrengths.firstOrNull()?.level ?: 0
                return dbm to level
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to get cellular signal: ${e.message}")
        }
        return 0 to 0
    }

    private fun getBatteryLevel(): Int {
        val filter = android.content.IntentFilter(android.content.Intent.ACTION_BATTERY_CHANGED)
        val intent = registerReceiver(null, filter)
        val level = intent?.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = intent?.getIntExtra(android.os.BatteryManager.EXTRA_SCALE, -1) ?: -1
        return if (level >= 0 && scale > 0) (level * 100) / scale else 50
    }

    private fun registerNetworkCallback() {
        connectivityManager = getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        networkCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: android.net.Network) {
                Log.i(TAG, "Network available, triggering MQTT reconnect")
                mqttManager.onNetworkAvailable()
            }
        }

        val callback = networkCallback ?: return
        try {
            connectivityManager?.registerNetworkCallback(request, callback)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to register network callback: ${e.message}")
        }
    }

    private fun acquireWakeLock() {
        val pm = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "aeroxebee:mqtt_service"
        ).apply {
            acquire() // Released in onDestroy when service stops
        }
        startWakeLockRenewal()
    }

    /**
     * Periodically renew the WakeLock to survive aggressive OEM battery managers.
     * Some devices forcibly release WakeLocks after extended periods. By releasing
     * and re-acquiring every 3 hours, we reset the OS timer and stay alive.
     */
    private fun startWakeLockRenewal() {
        wakeLockRenewalJob = scope.launch {
            while (isActive) {
                delay(WAKELOCK_RENEWAL_INTERVAL_MS)
                try {
                    wakeLock?.let {
                        if (it.isHeld) {
                            it.release()
                            it.acquire()
                            Log.d(TAG, "WakeLock renewed")
                        }
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "WakeLock renewal failed: ${e.message}")
                }
            }
        }
    }

    private fun updateNotification(text: String) {
        val pendingIntent = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(this, CHANNEL_MQTT)
            .setContentTitle("AeroXe Bee MQTT")
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
        startForeground(NOTIFICATION_ID, notification)
    }

    override fun onDestroy() {
        connectionMonitorJob?.cancel()
        heartbeatJob?.cancel()
        retryJob?.cancel()
        wakeLockRenewalJob?.cancel()
        unregisterNetworkCallback()
        wakeLock?.let { if (it.isHeld) it.release() }
        scope.cancel()
        mqttManager.destroy()
        super.onDestroy()
    }

    private fun unregisterNetworkCallback() {
        networkCallback?.let {
            try {
                connectivityManager?.unregisterNetworkCallback(it)
            } catch (_: Exception) {}
        }
        networkCallback = null
    }

    /**
     * Heartbeat now includes device_state classification (ACTIVE, DOZE_RISK, OEM_KILL_RISK)
     * so the backend can track device health and background execution risk.
     */
    private fun startHeartbeat() {
        heartbeatJob = scope.launch {
            while (isActive) {
                val interval = getHeartbeatIntervalMs()
                val deviceState = deviceStateClassifier.classify()
                val networkInfo = getNetworkInfo()
                val signalStrength = getSignalStrength()
                val payload = gson.toJson(
                    mapOf(
                        "device_id" to deviceId,
                        "action" to "ping",
                        "timestamp" to System.currentTimeMillis(),
                        "device_state" to deviceState,
                        "battery_level" to getBatteryLevel(),
                        "network_type" to networkInfo.first,
                        "is_connected" to networkInfo.second,
                        "signal_rssi" to signalStrength.first,
                        "signal_level" to signalStrength.second,
                    )
                )
                if (!mqttManager.publish("devices/$deviceId/ping", payload)) {
                    Log.w(TAG, "Heartbeat publish failed, will retry next cycle")
                }
                delay(interval)
            }
        }
    }

    private fun processMqttMessage(payload: String) {
        val trace = tracer.traceMessageRoundTrip("unknown")
        try {
            val json = gson.fromJson(payload, Map::class.java) as? Map<String, Any> ?: return
            val action = json["action"] as? String ?: return
            trace.putAttribute("action", action)

            when (action) {
                "send_sms" -> {
                    val cmd = gson.fromJson(payload, SMSCommand::class.java)
                    if (cmd.id.isBlank()) return

                    scope.launch {
                        val targetSimSlot = if (cmd.simSlot >= 0) cmd.simSlot else tokenManager.getSimSlot()
                        val task = SMSTask(
                            id = cmd.id,
                            accountId = cmd.accountId,
                            recipient = cmd.recipient,
                            message = cmd.message,
                            priority = try {
                                SMSTask.Priority.valueOf(cmd.priority)
                            } catch (_: Exception) { SMSTask.Priority.NORMAL },
                            status = SMSTask.Status.PENDING,
                            simSlot = targetSimSlot,
                        )
                        val result = smsEngine.send(task)
                        val isSuccess = result == SMSTask.Status.SENT || result == SMSTask.Status.DELIVERED
                        if (!isSuccess) {
                            Log.w(TAG, "SMS send failed for ${cmd.id}, will retry from queue")
                        }
                        mqttManager.publish(
                            "devices/$deviceId/status",
                            gson.toJson(
                                StatusUpdateRequest(
                                    messageId = cmd.id,
                                    deviceId = deviceId,
                                    status = if (isSuccess) "SENT" else "FAILED",
                                    deliveryStatus = if (isSuccess) "SENT" else "FAILED",
                                    confidenceScore = if (isSuccess) 1.0 else 0.0,
                                    error = if (isSuccess) null else "sms_send_failed",
                                    simSlot = targetSimSlot,
                                    timestamp = System.currentTimeMillis(),
                                )
                            )
                        )
                    }
                }
                "pong" -> {
                    val deviceIdFromPayload = json["device_id"] as? String
                    if (deviceIdFromPayload == deviceId) {
                        mqttManager.publish(
                            "devices/$deviceId/ack",
                            """{"device_id":"$deviceId","action":"ack","timestamp":${System.currentTimeMillis()}}"""
                        )
                    }
                }
            }
        } catch (e: Exception) {
            trace.putAttribute("error", e.message?.take(100) ?: "unknown")
            Log.e(TAG, "Failed to process MQTT message", e)
        } finally {
            tracer.stopTrace(trace, TAG)
        }
    }

    /**
     * Periodically retry failed/pending SMS tasks from the Room DB queue.
     */
    private fun startRetryProcessor() {
        retryJob = scope.launch {
            while (isActive) {
                delay(RETRY_INTERVAL_MS)
                try {
                    val failedTasks = smsRepository.getRetryableTasks()
                    for (task in failedTasks) {
                        Log.i(TAG, "Retrying failed SMS: ${task.id} (attempt ${task.retryCount + 1}/${task.maxRetries})")
                        val result = smsEngine.send(task)
                        val isSuccess = result == SMSTask.Status.SENT || result == SMSTask.Status.DELIVERED
                        if (isSuccess) {
                            if (mqttManager.isConnected() && deviceId.isNotBlank()) {
                                mqttManager.publish(
                                    "devices/$deviceId/status",
                                    gson.toJson(
                                        StatusUpdateRequest(
                                            messageId = task.id,
                                            deviceId = deviceId,
                                            status = "SENT",
                                            deliveryStatus = "SENT",
                                            confidenceScore = 1.0,
                                            simSlot = task.simSlot,
                                            timestamp = System.currentTimeMillis(),
                                        )
                                    )
                                )
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Retry processor error", e)
                }
            }
        }
    }

    private fun createNotification(text: String = "Connected to message broker"): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL_MQTT)
            .setContentTitle("AeroXe Bee MQTT")
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val TAG = "MqttService"
        private const val NOTIFICATION_ID = 1002
        const val CHANNEL_MQTT = "aeroxebee_mqtt_service"
        private const val HEARTBEAT_INTERVAL_MS = 30_000L
        private const val RETRY_INTERVAL_MS = 60_000L
        private const val WAKELOCK_RENEWAL_INTERVAL_MS = 3 * 60 * 60 * 1000L // 3 hours

        fun start(context: Context) {
            val intent = Intent(context, MqttService::class.java)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }
}
