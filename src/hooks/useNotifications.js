import { useEffect, useRef } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { fetchWithTimeout } from '../utils/api';
import * as SecureStore from '../utils/storage';

/**
 * useNotifications
 * Manages FCM permissions, token lifecycle, and foreground message handling.
 * Call this in DashboardScreen after login.
 */
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

                // 5. Create High Priority Channel for Notifee
                await notifee.createChannel({
                    id: 'astra-class-reminders',
                    name: 'ASTRA System Alerts',
                    importance: AndroidImportance.HIGH,
                });

                // 6. Foreground message handler
                const unsubMessage = messaging().onMessage(async (remoteMessage) => {
                    console.log('[FCM-FOREGROUND] Data payload:', remoteMessage.data);
                    const { title, body } = remoteMessage.data || {};
                    
                    if (title && body) {
                        await notifee.displayNotification({
                            title,
                            body,
                            android: {
                                channelId: 'astra-class-reminders',
                                importance: AndroidImportance.HIGH,
                            },
                        });
                    }
                });

                unsubscribeRef.current = () => {
                    unsubTokenRefresh();
                    unsubMessage();
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
