package com.aeroxebee.client.device.intelligence

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import java.io.File
import java.net.InetSocketAddress
import java.net.Socket

object NetworkFingerprinter {

    data class NetworkReport(
        val isConnected: Boolean,
        val networkType: String,
        val isVpnActive: Boolean,
        val isBehindProxy: Boolean?,
        val ipAddress: String?,
    )

    fun fingerprint(context: Context): NetworkReport {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork
        val caps = network?.let { cm.getNetworkCapabilities(it) }

        val isConnected = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
        val isVpn = caps?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) == true

        val networkType = when {
            caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true -> "wifi"
            caps?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true -> "cellular"
            caps?.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) == true -> "ethernet"
            caps?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) == true -> "vpn"
            else -> "unknown"
        }

        return NetworkReport(
            isConnected = isConnected,
            networkType = networkType,
            isVpnActive = isVpn,
            isBehindProxy = checkProxy(),
            ipAddress = null,
        )
    }

    private fun checkProxy(): Boolean? {
        return try {
            val host = System.getProperty("http.proxyHost")
            val port = System.getProperty("http.proxyPort")
            if (host != null && port != null) {
                val socket = Socket()
                socket.connect(InetSocketAddress(host, port.toInt()), 2000)
                socket.close()
                true
            } else false
        } catch (_: Exception) {
            false
        }
    }

    fun getRouteInfo(): Map<String, String> {
        val info = mutableMapOf<String, String>()
        try {
            val lines = File("/proc/net/route").readLines()
            if (lines.size > 1) {
                val parts = lines[1].split("\\s+".toRegex())
                info["default_gateway"] = parts.getOrElse(2) { "" }
                info["default_interface"] = parts.getOrElse(0) { "" }
            }
        } catch (_: Exception) { }

        try {
            val arpLines = File("/proc/net/arp").readLines()
            if (arpLines.size > 1) {
                val parts = arpLines[1].split("\\s+".toRegex())
                info["gateway_ip"] = parts.getOrElse(0) { "" }
                info["gateway_hw"] = parts.getOrElse(3) { "" }
            }
        } catch (_: Exception) { }

        return info
    }
}
