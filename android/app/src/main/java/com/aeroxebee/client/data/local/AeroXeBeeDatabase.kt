package com.aeroxebee.client.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.aeroxebee.client.data.local.dao.SMSTaskDao
import com.aeroxebee.client.data.local.dao.SyncLogDao
import com.aeroxebee.client.data.local.entity.SMSTaskEntity
import com.aeroxebee.client.data.local.entity.SyncLogEntity

@Database(
    entities = [SMSTaskEntity::class, SyncLogEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class AeroXeBeeDatabase : RoomDatabase() {
    abstract fun smsTaskDao(): SMSTaskDao
    abstract fun syncLogDao(): SyncLogDao
}
