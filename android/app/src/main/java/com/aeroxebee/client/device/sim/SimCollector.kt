package com.aeroxebee.client.device.sim

import android.annotation.SuppressLint
import android.content.Context
import android.telephony.SubscriptionManager

object SimCollector {

    @SuppressLint("MissingPermission")
    fun collect(context: Context): List<SimSnapshot> {
        val sm = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE)
            as SubscriptionManager

        val list = mutableListOf<SimSnapshot>()

        sm.activeSubscriptionInfoList?.forEach { sub ->
            list.add(
                SimSnapshot(
                    slotIndex = sub.simSlotIndex,
                    subscriptionId = sub.subscriptionId,
                    carrierName = sub.carrierName?.toString(),
                    mccMnc = "${sub.mcc}${sub.mnc}",
                    countryIso = sub.countryIso,
                    isRoaming = false,
                    timestamp = System.currentTimeMillis(),
                ),
            )
        }

        return list
    }
}
