package com.aeroxebee.client.ui.screens.update

import android.app.Application
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.content.FileProvider
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.aeroxebee.client.BuildConfig
import com.aeroxebee.client.data.remote.api.AeroXeBeeApi
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.net.URL
import javax.inject.Inject

sealed class UpdateState {
    data object Idle : UpdateState()
    data object Checking : UpdateState()
    data class UpdateAvailable(
        val versionCode: Int,
        val versionName: String,
        val forceUpdate: Boolean,
        val releaseType: String,
        val title: String,
        val releaseNotes: String,
        val downloadUrl: String?,
        val apkFilename: String?,
    ) : UpdateState()
    data object NoUpdate : UpdateState()
    data class Downloading(val progress: Int) : UpdateState()
    data class DownloadComplete(val apkFile: File) : UpdateState()
    data class Error(val message: String) : UpdateState()
}

@HiltViewModel
class UpdateCheckerViewModel @Inject constructor(
    application: Application,
    private val api: AeroXeBeeApi,
) : AndroidViewModel(application) {

    companion object {
        private const val TAG = "UpdateChecker"
    }

    private val _updateState = MutableStateFlow<UpdateState>(UpdateState.Idle)
    val updateState: StateFlow<UpdateState> = _updateState.asStateFlow()

    fun checkForUpdate() {
        viewModelScope.launch {
            _updateState.value = UpdateState.Checking
            try {
                val currentVersionCode = BuildConfig.VERSION_CODE
                val response = api.checkForUpdate(currentVersionCode)

                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data
                    if (data != null && data.updateAvailable) {
                        _updateState.value = UpdateState.UpdateAvailable(
                            versionCode = data.versionCode,
                            versionName = data.versionName,
                            forceUpdate = data.forceUpdate,
                            releaseType = data.releaseType,
                            title = data.title,
                            releaseNotes = data.releaseNotes,
                            downloadUrl = data.downloadUrl,
                            apkFilename = data.apkFilename,
                        )
                    } else {
                        _updateState.value = UpdateState.NoUpdate
                    }
                } else {
                    _updateState.value = UpdateState.NoUpdate
                }
            } catch (e: Exception) {
                Log.e(TAG, "Update check failed", e)
                _updateState.value = UpdateState.NoUpdate
            }
        }
    }

    fun downloadAndInstall() {
        val state = _updateState.value
        if (state !is UpdateState.UpdateAvailable) return
        val downloadUrl = state.downloadUrl ?: return

        viewModelScope.launch {
            _updateState.value = UpdateState.Downloading(0)
            try {
                val apkFile = withContext(Dispatchers.IO) {
                    downloadApk(downloadUrl, state.apkFilename ?: "update.apk")
                }
                _updateState.value = UpdateState.DownloadComplete(apkFile)
                installApk(apkFile)
            } catch (e: Exception) {
                Log.e(TAG, "Download/install failed", e)
                _updateState.value = UpdateState.Error(e.message ?: "Download failed")
            }
        }
    }

    fun dismissUpdate() {
        _updateState.value = UpdateState.NoUpdate
    }

    private suspend fun downloadApk(url: String, filename: String): File {
        return withContext(Dispatchers.IO) {
            val context = getApplication<Application>()
            val updateDir = File(context.cacheDir, "updates")
            updateDir.mkdirs()

            // Clean old updates
            updateDir.listFiles()?.forEach { it.delete() }

            val apkFile = File(updateDir, filename)
            val connection = URL(url).openConnection()
            connection.connectTimeout = 30_000
            connection.readTimeout = 60_000

            val totalSize = connection.contentLength
            var downloaded = 0L

            connection.inputStream.use { input ->
                apkFile.outputStream().use { output ->
                    val buffer = ByteArray(8192)
                    var bytesRead: Int
                    while (input.read(buffer).also { bytesRead = it } != -1) {
                        output.write(buffer, 0, bytesRead)
                        downloaded += bytesRead
                        if (totalSize > 0) {
                            val progress = ((downloaded * 100) / totalSize).toInt()
                            withContext(Dispatchers.Main) {
                                _updateState.value = UpdateState.Downloading(progress)
                            }
                        }
                    }
                }
            }
            apkFile
        }
    }

    fun hasInstallPermission(): Boolean {
        val context = getApplication<Application>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return context.packageManager.canRequestPackageInstalls()
        }
        return true
    }

    fun openInstallSettings() {
        val context = getApplication<Application>()
        val intent = Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
            data = Uri.parse("package:${context.packageName}")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
    }

    private fun installApk(apkFile: File) {
        val context = getApplication<Application>()
        try {
            // On Android 8+, check install permission first
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !context.packageManager.canRequestPackageInstalls()) {
                _updateState.value = UpdateState.Error("Please grant install permission in Settings, then try again.")
                openInstallSettings()
                return
            }

            val uri: Uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    apkFile,
                )
            } else {
                Uri.fromFile(apkFile)
            }

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch install intent", e)
            _updateState.value = UpdateState.Error("No installer available. Download the APK manually.")
        }
    }
}
