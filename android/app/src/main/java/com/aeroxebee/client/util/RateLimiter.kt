package com.aeroxebee.client.util

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RateLimiter @Inject constructor(
    @ApplicationContext context: Context,
) {
    private val prefs = context.getSharedPreferences("rate_limiter", Context.MODE_PRIVATE)
    private val slots = mutableMapOf<Int, SlotState>()

    data class SlotState(
        var sentThisMinute: Int = 0,
        var minuteStart: Long = System.currentTimeMillis(),
        var sentThisHour: Int = 0,
        var hourStart: Long = System.currentTimeMillis(),
    )

    fun canSend(simSlot: Int, maxPerMinute: Int = 10, maxPerHour: Int = 100): Boolean {
        val state = slots.getOrPut(simSlot) { SlotState() }
        val now = System.currentTimeMillis()

        if (now - state.minuteStart > 60_000) {
            state.sentThisMinute = 0
            state.minuteStart = now
        }
        if (now - state.hourStart > 3_600_000) {
            state.sentThisHour = 0
            state.hourStart = now
        }

        return state.sentThisMinute < maxPerMinute && state.sentThisHour < maxPerHour
    }

    fun recordSend(simSlot: Int) {
        val state = slots.getOrPut(simSlot) { SlotState() }
        state.sentThisMinute++
        state.sentThisHour++
    }

    fun getSlotStats(simSlot: Int): Pair<Int, Int> {
        val state = slots[simSlot] ?: return 0 to 0
        return state.sentThisMinute to state.sentThisHour
    }
}
