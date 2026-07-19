# AeroXe Bee ProGuard Rules
# Copyright (c) Aeroxe Enterprises Pvt. Ltd., Jalgaon, Maharashtra, India

# --- General ---
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions

# --- App models (Retrofit DTOs, Room entities, domain models) ---
-keep class com.aeroxebee.client.data.remote.model.** { *; }
-keep class com.aeroxebee.client.data.local.entity.** { *; }
-keep class com.aeroxebee.client.domain.model.** { *; }

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

# --- SSL/TLS (critical for MQTT TLS in release builds) ---
-keep class javax.net.ssl.** { *; }
-keep class javax.net.ssl.SSLContext { *; }
-keep class javax.net.ssl.TrustManagerFactory { *; }
-keep class javax.net.ssl.KeyManagerFactory { *; }
-keep class javax.net.ssl.SSLSocketFactory { *; }
-keep class javax.net.ssl.SSLSocket { *; }
-keep class javax.net.ssl.SSLSession { *; }
-keep class javax.net.ssl.X509TrustManager { *; }
-keep class javax.net.ssl.HostnameVerifier { *; }
-keep class javax.net.ssl.HttpsURLConnection { *; }
-dontwarn javax.net.ssl.**

# Java Security / Crypto (used by TLS and Paho internals)
-keep class java.security.** { *; }
-keep class java.security.cert.** { *; }
-dontwarn java.security.**
-keep class org.conscrypt.** { *; }
-dontwarn org.conscrypt.**
-keep class com.android.org.conscrypt.** { *; }
-dontwarn com.android.org.conscrypt.**
-keep class org.bouncycastle.** { *; }
-dontwarn org.bouncycastle.**
-keep class org.apache.harmony.** { *; }
-dontwarn org.apache.harmony.**

# --- Hilt / Dagger (bundles own rules, suppress warnings only) ---
-dontwarn dagger.hilt.**
-keep class * extends dagger.hilt.android.internal.managers.ViewComponentManager$FragmentContextWrapper { *; }

# --- Firebase ---
-keep class com.google.firebase.messaging.** { *; }
-dontwarn com.google.firebase.messaging.**
