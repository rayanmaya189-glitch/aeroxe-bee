# AeroXe Bee ProGuard Rules
# Copyright (c) Aeroxe Enterprises Pvt. Ltd., Jalgaon, Maharashtra, India
-keepattributes *Annotation*
-keep class com.textbee.client.** { *; }
-keepclassmembers class * extends androidx.room.RoomDatabase { *; }
-keep class * extends com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer
