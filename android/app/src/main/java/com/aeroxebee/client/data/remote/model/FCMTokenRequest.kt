package com.aeroxebee.client.data.remote.model

import com.google.gson.annotations.SerializedName

/**
 * Request body for POST /api/v1/auth/fcm-token.
 * Registers the device's FCM token with the backend for push notifications.
 */
data class FCMTokenRequest(
    @SerializedName("device_id") val deviceId: String,
    @SerializedName("fcm_token") val fcmToken: String,
    @SerializedName("platform") val platform: String, // "android"
)
