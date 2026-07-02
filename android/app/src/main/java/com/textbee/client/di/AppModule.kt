package com.textbee.client.di

import android.content.Context
import androidx.room.Room
import com.textbee.client.BuildConfig
import com.textbee.client.data.local.TextBeeDatabase
import com.textbee.client.data.local.dao.SMSTaskDao
import com.textbee.client.data.local.dao.SyncLogDao
import com.textbee.client.data.remote.api.TextBeeApi
import com.textbee.client.data.remote.interceptor.AuthInterceptor
import com.textbee.client.data.remote.interceptor.RetryInterceptor
import com.textbee.client.util.TokenManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
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
    fun provideDatabase(@ApplicationContext context: Context): TextBeeDatabase {
        return Room.databaseBuilder(
            context, TextBeeDatabase::class.java, "textbee_db"
        ).build()
    }

    @Provides @Singleton
    fun provideSMSTaskDao(db: TextBeeDatabase): SMSTaskDao = db.smsTaskDao()

    @Provides @Singleton
    fun provideSyncLogDao(db: TextBeeDatabase): SyncLogDao = db.syncLogDao()

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

        return builder.build()
    }

    @Provides @Singleton
    fun provideTextBeeApi(okHttpClient: OkHttpClient): TextBeeApi {
        return Retrofit.Builder()
            .baseUrl(BuildConfig.BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(TextBeeApi::class.java)
    }

    @Provides @Singleton
    fun provideAuthInterceptor(tokenManager: TokenManager): AuthInterceptor {
        return AuthInterceptor(tokenManager)
    }
}
