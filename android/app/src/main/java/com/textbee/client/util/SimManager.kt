package com.textbee.client.util

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

    fun getAvailableSlots(): List<SimSlot> {
        val slots = mutableListOf<SimSlot>()
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            val subManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
            for (sub in subManager.activeSubscriptionInfoList ?: return slots) {
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
                    carrierName = telephonyManager.networkOperatorName ?: "Unknown",
                    isActive = true,
                )
            )
        }
        return slots
    }

    fun getDefaultSubscriptionId(slot: Int): Int {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            val subManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
            subManager.activeSubscriptionInfoList?.forEach { sub ->
                if (sub.simSlotIndex == slot) return sub.subscriptionId
            }
        }
        return SubscriptionManager.getDefaultSubscriptionId()
    }

    data class SimSlot(
        val slotId: Int,
        val subscriptionId: Int,
        val carrierName: String,
        val displayName: String = "",
        val isActive: Boolean = false,
    )
}
