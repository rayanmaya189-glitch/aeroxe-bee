# TextBee Client ProGuard Rules
-keepattributes *Annotation*
-keep class com.textbee.client.** { *; }
-keepclassmembers class * extends androidx.room.RoomDatabase { *; }
-keep class * extends com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer
