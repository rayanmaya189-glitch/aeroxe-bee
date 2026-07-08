package com.aeroxebee.client.di

import android.content.Context
import androidx.room.Room
import com.aeroxebee.client.BuildConfig
import com.aeroxebee.client.analytics.AnalyticsHelper
import com.aeroxebee.client.data.local.AeroXeBeeDatabase
import com.aeroxebee.client.data.local.dao.SMSTaskDao
import com.aeroxebee.client.data.local.dao.SyncLogDao
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import com.aeroxebee.client.data.remote.interceptor.AuthInterceptor
import com.aeroxebee.client.data.remote.interceptor.RetryInterceptor
import com.aeroxebee.client.util.TokenManager
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.analytics.ktx.analytics
import com.google.firebase.ktx.Firebase
import com.google.firebase.remoteconfig.FirebaseRemoteConfig
import com.google.firebase.remoteconfig.ktx.remoteConfig
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.CertificatePinner
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AeroXeBeeDatabase {
        return Room.databaseBuilder(
            context, AeroXeBeeDatabase::class.java, "aeroxebee_db"
        ).build()
    }

    @Provides @Singleton
    fun provideSMSTaskDao(db: AeroXeBeeDatabase): SMSTaskDao = db.smsTaskDao()

    @Provides @Singleton
    fun provideSyncLogDao(db: AeroXeBeeDatabase): SyncLogDao = db.syncLogDao()

    @Provides @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
    ): OkHttpClient {
        val builder = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(RetryInterceptor())
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)

        if (BuildConfig.DEBUG) {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
            builder.addInterceptor(logging)
        }

        // Certificate pinning for release builds — prevents MITM via forged CA
        // Obtain hashes: openssl s_client -connect api.aeroxe.com:443 -servername api.aeroxe.com </dev/null 2>/dev/null | openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64
        if (!BuildConfig.DEBUG && BuildConfig.BASE_URL.startsWith("https")) {
            val host = java.net.URI(BuildConfig.BASE_URL).host
            if (host != null) {
                builder.certificatePinner(
                    CertificatePinner.Builder()
                        .add(host, BuildConfig.CERT_PIN_SHA256)
                        .build()
                )
            }
        }

        return builder.build()
    }

    @Provides @Singleton
    fun provideAeroXeBeeApi(okHttpClient: OkHttpClient): AeroXeBeeApi {
        return Retrofit.Builder()
            .baseUrl(BuildConfig.BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(AeroXeBeeApi::class.java)
    }

    @Provides @Singleton
    fun provideAnalytics(): FirebaseAnalytics = Firebase.analytics

    @Provides @Singleton
    fun provideRemoteConfig(): FirebaseRemoteConfig = Firebase.remoteConfig

    @Provides @Singleton
    fun provideAuthInterceptor(tokenManager: TokenManager): AuthInterceptor {
        return AuthInterceptor(tokenManager)
    }
}
