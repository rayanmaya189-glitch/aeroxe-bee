package com.aeroxebee.client.util

import android.annotation.SuppressLint
import android.content.Context
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SimManager @Inject constructor(
    @ApplicationContext val context: Context,
) {
    private val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager

    @SuppressLint("MissingPermission")
    fun getAvailableSlots(): List<SimSlot> {
        val slots = mutableListOf<SimSlot>()
        val subManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
        val activeList = subManager.activeSubscriptionInfoList
        if (activeList != null) {
            for (sub in activeList) {
                slots.add(
                    SimSlot(
                        slotId = sub.simSlotIndex,
                        subscriptionId = sub.subscriptionId,
                        carrierName = sub.carrierName?.toString() ?: "Unknown",
                        displayName = sub.displayName?.toString() ?: "",
                        isActive = true,
                    )
                )
            }
        }
        if (slots.isEmpty()) {
            slots.add(
                SimSlot(
                    slotId = 0,
                    subscriptionId = SubscriptionManager.getDefaultSubscriptionId(),
                    carrierName = telephonyManager.networkOperatorName?.takeIf { it.isNotBlank() } ?: "Unknown",
                    isActive = true,
                )
            )
        }
        return slots
    }

    @SuppressLint("MissingPermission")
    fun getDefaultSubscriptionId(slot: Int): Int {
        val subManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
        subManager.activeSubscriptionInfoList?.forEach { sub ->
            if (sub.simSlotIndex == slot) return sub.subscriptionId
        }
        android.util.Log.w("SimManager", "Slot $slot not found in active subscriptions, falling back to default")
        return SubscriptionManager.getDefaultSubscriptionId()
    }

    fun getSlotSubscriptionId(slot: Int): Int? {
        val subManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
        subManager.activeSubscriptionInfoList?.forEach { sub ->
            if (sub.simSlotIndex == slot) return sub.subscriptionId
        }
        android.util.Log.w("SimManager", "Slot $slot not found in active subscriptions")
        return null
    }

    data class SimSlot(
        val slotId: Int,
        val subscriptionId: Int,
        val carrierName: String,
        val displayName: String = "",
        val isActive: Boolean = false,
    )
}
