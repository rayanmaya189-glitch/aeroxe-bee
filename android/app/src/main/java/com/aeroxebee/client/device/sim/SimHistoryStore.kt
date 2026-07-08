package com.aeroxebee.client.device.sim

import android.content.Context
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

object SimHistoryStore {
    private const val PREF = "sim_history"
    private const val KEY_LAST = "last_sim"
    private const val KEY_EVENTS = "sim_events"

    fun save(context: Context, sims: List<SimSnapshot>) {
        val json = Gson().toJson(sims)
        context.getSharedPreferences(PREF, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_LAST, json)
            .apply()
    }

    fun get(context: Context): List<SimSnapshot>? {
        val json = context.getSharedPreferences(PREF, Context.MODE_PRIVATE)
            .getString(KEY_LAST, null) ?: return null
        val type = object : TypeToken<Array<SimSnapshot>>() {}.type
        return Gson().fromJson<Array<SimSnapshot>>(json, type).toList()
    }

    fun saveEventTimestamps(context: Context, timestamps: List<Long>) {
        val json = Gson().toJson(timestamps)
        context.getSharedPreferences(PREF, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_EVENTS, json)
            .apply()
    }

    fun getEventTimestamps(context: Context): List<Long> {
        val json = context.getSharedPreferences(PREF, Context.MODE_PRIVATE)
            .getString(KEY_EVENTS, null) ?: return emptyList()
        val type = object : TypeToken<Array<Long>>() {}.type
        return Gson().fromJson<Array<Long>>(json, type).toList()
    }
}
