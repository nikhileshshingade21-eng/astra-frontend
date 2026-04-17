import { useState, useEffect, useCallback, useRef } from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../api/config';

/**
 * ─────────────────────────────────────────────────────────────
 *  useAppUpdate() — ASTRA In-App Auto Update Hook
 * ─────────────────────────────────────────────────────────────
 *  Handles the complete update lifecycle:
 *    1. Version check against backend (with caching)
 *    2. Download APK via native DownloadManager
 *    3. Monitor download progress
 *    4. Trigger APK installation
 *    5. Handle permissions for unknown sources
 *
 *  Usage:
 *    const update = useAppUpdate();
 *    // update.updateAvailable, update.showModal, update.startDownload(), etc.
 * ─────────────────────────────────────────────────────────────
 */

const CACHE_KEY = '@astra_update_check';
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
const APK_FILENAME = 'astra_update.apk';

// Get native module (will be null on iOS or if not linked)
const { AppUpdateModule } = NativeModules;

export default function useAppUpdate() {
    // ── State ────────────────────────────────────────────────
    const [updateInfo, setUpdateInfo] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadComplete, setDownloadComplete] = useState(false);
    const [installing, setInstalling] = useState(false);
    const [error, setError] = useState(null);

    // Track if we've already dismissed this version
    const dismissedRef = useRef(false);

    // Current app version from native BuildConfig
    const currentVersionCode = AppUpdateModule?.versionCode || 1;
    const currentVersionName = AppUpdateModule?.versionName || '1.0';

    // ── Check for Updates (with caching) ─────────────────────
    const checkForUpdate = useCallback(async (force = false) => {
        // Skip on non-Android
        if (Platform.OS !== 'android' || !AppUpdateModule) return;

        try {
            // Check cache to avoid hammering the server
            if (!force) {
                const cached = await AsyncStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { timestamp, data } = JSON.parse(cached);
                    const age = Date.now() - timestamp;
                    if (age < CACHE_DURATION) {
                        // Cache is still fresh — use cached data
                        if (data.versionCode > currentVersionCode) {
                            setUpdateInfo(data);
                            if (!dismissedRef.current) setShowModal(true);
                        }
                        return;
                    }
                }
            }

            // Fetch from server
            const response = await fetch(`${API_BASE}/api/version?platform=android&currentVersionCode=${currentVersionCode}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const json = await response.json();
            const data = json.data || json;

            // Cache the result
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                data
            }));

            // Check if update is available
            if (data.versionCode > currentVersionCode) {
                setUpdateInfo(data);
                if (!dismissedRef.current) setShowModal(true);
            }
        } catch (err) {
            // Fail silently — don't bother the user if version check fails
            console.log('[AppUpdate] Version check failed (silent):', err.message);
        }
    }, [currentVersionCode]);

    // ── Start APK Download ───────────────────────────────────
    const startDownload = useCallback(async () => {
        if (!updateInfo?.apkUrl || !AppUpdateModule) return;

        try {
            setError(null);
            setDownloading(true);
            setDownloadProgress(0);
            setDownloadComplete(false);

            // Check install permission first (Android 8+)
            const canInstall = await AppUpdateModule.canInstallApks();
            if (!canInstall) {
                // Open settings to enable unknown sources
                await AppUpdateModule.openInstallPermissionSettings();
                setDownloading(false);
                setError('Please enable "Install unknown apps" for ASTRA, then try again.');
                return;
            }

            // Start native download
            await AppUpdateModule.downloadApk(updateInfo.apkUrl, APK_FILENAME);
        } catch (err) {
            setDownloading(false);
            setError('Download failed. Please check your connection and try again.');
            console.error('[AppUpdate] Download error:', err);
        }
    }, [updateInfo]);

    // ── Install Downloaded APK ───────────────────────────────
    const installUpdate = useCallback(async () => {
        if (!AppUpdateModule) return;

        try {
            setInstalling(true);
            setError(null);

            // Double-check install permission
            const canInstall = await AppUpdateModule.canInstallApks();
            if (!canInstall) {
                await AppUpdateModule.openInstallPermissionSettings();
                setInstalling(false);
                setError('Please enable "Install unknown apps" for ASTRA first.');
                return;
            }

            await AppUpdateModule.installApk(APK_FILENAME);
        } catch (err) {
            setInstalling(false);
            setError('Installation failed. Please try again.');
            console.error('[AppUpdate] Install error:', err);
        }
    }, []);

    // ── Cancel Download ──────────────────────────────────────
    const cancelDownload = useCallback(async () => {
        if (!AppUpdateModule) return;
        try {
            await AppUpdateModule.cancelDownload();
            setDownloading(false);
            setDownloadProgress(0);
        } catch (err) {
            console.log('[AppUpdate] Cancel error:', err);
        }
    }, []);

    // ── Dismiss Modal (Later button) ─────────────────────────
    const dismissUpdate = useCallback(() => {
        dismissedRef.current = true;
        setShowModal(false);
    }, []);

    // ── Listen to Native Download Events ─────────────────────
    useEffect(() => {
        if (Platform.OS !== 'android' || !AppUpdateModule) return;

        const eventEmitter = new NativeEventEmitter(AppUpdateModule);

        // Download progress events (every 500ms from native)
        const progressSub = eventEmitter.addListener('downloadProgress', (event) => {
            setDownloadProgress(event.progress || 0);
        });

        // Download complete event
        const completeSub = eventEmitter.addListener('downloadComplete', (event) => {
            setDownloading(false);
            setDownloadProgress(100);
            setDownloadComplete(true);
            console.log('[AppUpdate] Download complete:', event.fileName);
        });

        // Download failed event  
        const failSub = eventEmitter.addListener('downloadFailed', (event) => {
            setDownloading(false);
            setDownloadProgress(0);
            setError('Download failed. Please try again.');
            console.error('[AppUpdate] Download failed:', event.error);
        });

        return () => {
            progressSub.remove();
            completeSub.remove();
            failSub.remove();
        };
    }, []);

    // ── Auto-check on mount ──────────────────────────────────
    useEffect(() => {
        // Delay version check by 3 seconds so it doesn't compete with app boot
        const timer = setTimeout(() => {
            checkForUpdate();
        }, 3000);

        return () => clearTimeout(timer);
    }, [checkForUpdate]);

    // ── Periodic background check (every 6 hours) ────────────
    useEffect(() => {
        const interval = setInterval(() => {
            checkForUpdate();
        }, CACHE_DURATION);

        return () => clearInterval(interval);
    }, [checkForUpdate]);

    // ── Auto-install when download completes ─────────────────
    useEffect(() => {
        if (downloadComplete) {
            // Small delay so the user sees "100%" before install prompt
            const timer = setTimeout(() => {
                installUpdate();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [downloadComplete, installUpdate]);

    // ── Public API ───────────────────────────────────────────
    return {
        // State
        updateAvailable: !!updateInfo && (updateInfo.versionCode > currentVersionCode),
        updateInfo,
        showModal,
        downloading,
        downloadProgress,
        downloadComplete,
        installing,
        error,
        currentVersionCode,
        currentVersionName,
        isForceUpdate: updateInfo?.forceUpdate || false,

        // Actions
        checkForUpdate,
        startDownload,
        installUpdate,
        cancelDownload,
        dismissUpdate,
        setShowModal,
    };
}
