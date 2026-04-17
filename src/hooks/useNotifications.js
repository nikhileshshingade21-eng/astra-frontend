import { useEffect, useRef } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { fetchWithTimeout } from '../utils/api';
import * as SecureStore from '../utils/storage';
import { navigate } from '../navigation/navigationService';

/**
 * ─────────────────────────────────────────────────────────────
 *  useNotifications
 * ─────────────────────────────────────────────────────────────
 *  Manages FCM permissions, token lifecycle, foreground message
 *  handling, AND notification tap handling.
 *
 *  When a user taps a notification:
 *    - Foreground: Notifee onForegroundEvent catches PRESS
 *    - Background: Notifee onBackgroundEvent (in index.js)
 *    - Cold start: Firebase getInitialNotification
 *
 *  All paths route through getScreenForNotification() to
 *  navigate to the correct screen.
 *
 *  Call this in DashboardScreen after login.
 * ─────────────────────────────────────────────────────────────
 */

// Notification type → screen mapping (same as index.js)
function getScreenForNotification(data) {
    if (!data) return { screen: 'Board', params: {} };
    const type = data.type || '';

    switch (type) {
        case 'attendance_reminder':
        case 'class_reminder':
            return { screen: 'Attendance', params: {} };
        case 'attendance_report':
        case 'analytics':
            return { screen: 'AttendanceAnalytics', params: {} };
        case 'calendar_event':
            return { screen: 'AcademicCalendar', params: {} };
        case 'update_alert':
            return { screen: 'Main', params: {} };
        case 'admin_broadcast':
        case 'announcement':
        case 'smart_alert':
        case 'achievement':
        case 'manual':
        default:
            return { screen: 'Board', params: { fromNotification: true } };
    }
}

export function useNotifications(userId) {
    const unsubscribeRef = useRef(null);

    useEffect(() => {
        if (!userId) return;

        const setup = async () => {
            try {
                // 1. Request permission (iOS needs explicit ask, Android 13+ needs POST_NOTIFICATIONS)
                if (Platform.OS === 'android' && Platform.Version >= 33) {
                    await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                    );
                }

                const authStatus = await messaging().requestPermission();
                const enabled =
                    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

                if (!enabled) {
                    console.log('[FCM] Permission denied');
                    return;
                }

                // 2. Get FCM token and sync to backend
                const fcmToken = await messaging().getToken();
                if (fcmToken) {
                    console.log('[FCM] Token acquired:', fcmToken.substring(0, 20) + '...');
                    await syncTokenToBackend(fcmToken);
                }

                // 3. Listen for token refresh
                const unsubTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
                    console.log('[FCM] Token refreshed');
                    await syncTokenToBackend(newToken);
                });

                // 4. Create High Priority Channel for Notifee
                await notifee.createChannel({
                    id: 'astra-class-reminders',
                    name: 'ASTRA System Alerts',
                    importance: AndroidImportance.HIGH,
                });

                // 5. Foreground message handler — display notification with DATA attached
                const unsubMessage = messaging().onMessage(async (remoteMessage) => {
                    console.log('[FCM-FOREGROUND] Data payload:', remoteMessage.data);
                    const { title, body } = remoteMessage.data || {};
                    
                    if (title && body) {
                        await notifee.displayNotification({
                            title,
                            body,
                            data: remoteMessage.data || {},  // ← Pass data for tap routing
                            android: {
                                channelId: 'astra-class-reminders',
                                importance: AndroidImportance.HIGH,
                                pressAction: {
                                    id: 'default',
                                    launchActivity: 'default',
                                },
                            },
                        });
                    }
                });

                // 6. FOREGROUND TAP HANDLER — when user taps notification while app is open
                const unsubForegroundEvent = notifee.onForegroundEvent(({ type, detail }) => {
                    if (type === EventType.PRESS) {
                        const data = detail?.notification?.data || {};
                        const { screen, params } = getScreenForNotification(data);
                        console.log('[NOTIFEE-FG] Tapped → Navigating to:', screen);
                        navigate(screen, params);
                    }
                });

                // 7. COLD START — Check if app was opened by tapping a notification
                const initialNotification = await messaging().getInitialNotification();
                if (initialNotification) {
                    console.log('[FCM] App opened from killed state via notification tap');
                    const data = initialNotification.data || {};
                    const { screen, params } = getScreenForNotification(data);
                    // Delay slightly to ensure navigation is ready
                    setTimeout(() => navigate(screen, params), 1500);
                }

                // 8. BACKGROUND→FOREGROUND — Check if app was brought to foreground by notification tap
                const unsubOpenedApp = messaging().onNotificationOpenedApp((remoteMessage) => {
                    console.log('[FCM] App brought to foreground via notification tap');
                    const data = remoteMessage.data || {};
                    const { screen, params } = getScreenForNotification(data);
                    navigate(screen, params);
                });

                unsubscribeRef.current = () => {
                    unsubTokenRefresh();
                    unsubMessage();
                    unsubForegroundEvent();
                    unsubOpenedApp();
                };

            } catch (err) {
                console.warn('[FCM] Setup error:', err.message);
            }
        };

        setup();

        return () => {
            if (unsubscribeRef.current) unsubscribeRef.current();
        };
    }, [userId]);
}

/**
 * Get the current FCM token (for use during auth flows)
 */
export async function getFCMToken() {
    try {
        const token = await messaging().getToken();
        return token;
    } catch (e) {
        console.warn('[FCM] Could not get token:', e.message);
        return null;
    }
}

/**
 * Sync FCM token to backend
 */
async function syncTokenToBackend(fcmToken) {
    try {
        const tokenStr = await SecureStore.getItemAsync('token');
        if (!tokenStr) return;

        await fetchWithTimeout('/api/user/fcm-token', {
            method: 'POST',
            body: JSON.stringify({ fcm_token: fcmToken }),
            headers: { Authorization: `Bearer ${tokenStr}` }
        });
        console.log('[FCM] Token synced to backend');
    } catch (e) {
        console.warn('[FCM] Token sync failed:', e.message);
    }
}
