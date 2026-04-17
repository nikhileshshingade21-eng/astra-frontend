package com.nikhil.astra

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File

/**
 * ─────────────────────────────────────────────────────────────
 *  ASTRA In-App Auto Update Native Module
 * ─────────────────────────────────────────────────────────────
 *  Handles:
 *    1. Reading current versionCode/versionName from BuildConfig
 *    2. Downloading APK via Android DownloadManager
 *    3. Installing APK with FileProvider (Android 7+)
 *    4. Handling REQUEST_INSTALL_PACKAGES permission (Android 8+)
 *    5. Monitoring download progress and emitting events to JS
 * ─────────────────────────────────────────────────────────────
 */
class AppUpdateModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var downloadId: Long = -1
    private var downloadReceiver: BroadcastReceiver? = null

    override fun getName(): String = "AppUpdateModule"

    // ── Expose current app version info to JS ───────────────────
    override fun getConstants(): MutableMap<String, Any> {
        val constants = mutableMapOf<String, Any>()
        constants["versionCode"] = BuildConfig.VERSION_CODE
        constants["versionName"] = BuildConfig.VERSION_NAME
        return constants
    }

    // ── Check if the app can install unknown source APKs (Android 8+) ──
    @ReactMethod
    fun canInstallApks(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val canInstall = reactApplicationContext.packageManager.canRequestPackageInstalls()
                promise.resolve(canInstall)
            } else {
                // Below Android 8, no special permission needed
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("ERR_CHECK_INSTALL", e.message)
        }
    }

    // ── Open the system settings page for unknown sources ──────
    @ReactMethod
    fun openInstallPermissionSettings(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:${reactApplicationContext.packageName}")
                )
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("ERR_OPEN_SETTINGS", e.message)
        }
    }

    // ── Download APK using Android DownloadManager ────────────
    @ReactMethod
    fun downloadApk(url: String, fileName: String, promise: Promise) {
        try {
            // Clean up any previous download file
            val existingFile = File(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                fileName
            )
            if (existingFile.exists()) existingFile.delete()

            val downloadManager = reactApplicationContext.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager

            val request = DownloadManager.Request(Uri.parse(url))
                .setTitle("ASTRA Update")
                .setDescription("Downloading update...")
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                .setMimeType("application/vnd.android.package-archive")
                .setAllowedOverMetered(true)
                .setAllowedOverRoaming(true)

            downloadId = downloadManager.enqueue(request)

            // Register a receiver to listen for download completion
            downloadReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    val id = intent?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1) ?: -1
                    if (id == downloadId) {
                        // Query download status
                        val query = DownloadManager.Query().setFilterById(downloadId)
                        val cursor = downloadManager.query(query)
                        if (cursor.moveToFirst()) {
                            val statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS)
                            val status = cursor.getInt(statusIndex)
                            if (status == DownloadManager.STATUS_SUCCESSFUL) {
                                val uriIndex = cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI)
                                val localUri = cursor.getString(uriIndex)
                                sendEvent("downloadComplete", Arguments.createMap().apply {
                                    putString("uri", localUri)
                                    putString("fileName", fileName)
                                })
                            } else {
                                sendEvent("downloadFailed", Arguments.createMap().apply {
                                    putString("error", "Download failed with status: $status")
                                })
                            }
                        }
                        cursor.close()

                        // Unregister after completion
                        try {
                            reactApplicationContext.unregisterReceiver(this)
                        } catch (_: Exception) {}
                    }
                }
            }

            val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                reactApplicationContext.registerReceiver(downloadReceiver, filter, Context.RECEIVER_EXPORTED)
            } else {
                reactApplicationContext.registerReceiver(downloadReceiver, filter)
            }

            // Start a background thread to poll download progress
            startProgressMonitor(downloadManager)

            promise.resolve(downloadId.toDouble())
        } catch (e: Exception) {
            promise.reject("ERR_DOWNLOAD", e.message)
        }
    }

    // ── Poll download progress and emit events to JS ─────────
    private fun startProgressMonitor(downloadManager: DownloadManager) {
        Thread {
            var downloading = true
            while (downloading) {
                val query = DownloadManager.Query().setFilterById(downloadId)
                val cursor = downloadManager.query(query)
                if (cursor.moveToFirst()) {
                    val bytesIndex = cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)
                    val totalIndex = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)
                    val statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS)

                    val bytesDownloaded = cursor.getLong(bytesIndex)
                    val totalBytes = cursor.getLong(totalIndex)
                    val status = cursor.getInt(statusIndex)

                    if (totalBytes > 0) {
                        val progress = ((bytesDownloaded * 100) / totalBytes).toInt()
                        sendEvent("downloadProgress", Arguments.createMap().apply {
                            putInt("progress", progress)
                            putDouble("bytesDownloaded", bytesDownloaded.toDouble())
                            putDouble("totalBytes", totalBytes.toDouble())
                        })
                    }

                    if (status == DownloadManager.STATUS_SUCCESSFUL ||
                        status == DownloadManager.STATUS_FAILED) {
                        downloading = false
                    }
                }
                cursor.close()
                Thread.sleep(500) // Poll every 500ms
            }
        }.start()
    }

    // ── Install APK using FileProvider (Android 7+) ──────────
    @ReactMethod
    fun installApk(fileName: String, promise: Promise) {
        try {
            val file = File(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                fileName
            )

            if (!file.exists()) {
                promise.reject("ERR_INSTALL", "APK file not found: ${file.absolutePath}")
                return
            }

            val intent = Intent(Intent.ACTION_VIEW)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                // Android 7+: Use FileProvider for secure file URI
                val contentUri = FileProvider.getUriForFile(
                    reactApplicationContext,
                    "${reactApplicationContext.packageName}.fileprovider",
                    file
                )
                intent.setDataAndType(contentUri, "application/vnd.android.package-archive")
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            } else {
                intent.setDataAndType(Uri.fromFile(file), "application/vnd.android.package-archive")
            }

            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_INSTALL", e.message)
        }
    }

    // ── Cancel active download ────────────────────────────────
    @ReactMethod
    fun cancelDownload(promise: Promise) {
        try {
            if (downloadId != -1L) {
                val dm = reactApplicationContext.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                dm.remove(downloadId)
                downloadId = -1
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_CANCEL", e.message)
        }
    }

    // ── Helper: Send events to JS layer ──────────────────────
    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    // ── Cleanup ──────────────────────────────────────────────
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        try {
            downloadReceiver?.let {
                reactApplicationContext.unregisterReceiver(it)
            }
        } catch (_: Exception) {}
    }
}
