package com.textbee.client.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.textbee.client.data.local.dao.SMSTaskDao
import com.textbee.client.data.local.dao.SyncLogDao
import com.textbee.client.data.local.entity.SMSTaskEntity
import com.textbee.client.data.local.entity.SyncLogEntity

@Database(
    entities = [SMSTaskEntity::class, SyncLogEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class TextBeeDatabase : RoomDatabase() {
    abstract fun smsTaskDao(): SMSTaskDao
    abstract fun syncLogDao(): SyncLogDao
}
