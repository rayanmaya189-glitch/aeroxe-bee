# AeroXe Bee ProGuard Rules
# Copyright (c) Aeroxe Enterprises Pvt. Ltd., Jalgaon, Maharashtra, India

# --- General ---
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions

# --- App models (Retrofit DTOs, Room entities, domain models) ---
-keep class com.textbee.client.data.remote.model.** { *; }
-keep class com.textbee.client.data.local.entity.** { *; }
-keep class com.textbee.client.domain.model.** { *; }

# --- Retrofit ---
-keep,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn javax.annotation.**
-dontwarn kotlin.Unit
-dontwarn retrofit2.KotlinExtensions
-dontwarn retrofit2.KotlinExtensions$*

# --- Gson ---
-keep class * extends com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer
-keepclassmembers,allowobfuscation class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# --- Room ---
-keep class * extends androidx.room.RoomDatabase { *; }
-keep @androidx.room.Entity class * { *; }
-keep @androidx.room.Dao class * { *; }

# --- MQTT (Paho) ---
-keep class org.eclipse.paho.client.mqttv3.** { *; }
-dontwarn org.eclipse.paho.client.mqttv3.**

# --- Hilt / Dagger (bundles own rules, suppress warnings only) ---
-dontwarn dagger.hilt.**
-keep class * extends dagger.hilt.android.internal.managers.ViewComponentManager$FragmentContextWrapper { *; }

# --- Firebase ---
-keep class com.google.firebase.messaging.** { *; }
-dontwarn com.google.firebase.messaging.**
