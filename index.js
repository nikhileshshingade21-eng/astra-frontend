import 'react-native-reanimated';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';

import ForegroundService from '@supersami/rn-foreground-service';

import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { navigate } from './src/navigation/navigationService';

/**
 * ─────────────────────────────────────────────────────────────
 *  NOTIFICATION TAP ROUTER
 * ─────────────────────────────────────────────────────────────
 *  Maps notification data.type → screen name in the navigator.
 *  When a user taps a notification, we route them to the
 *  most relevant screen based on the notification content.
 * ─────────────────────────────────────────────────────────────
 */
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
            // Update notifications just open the app — the VersionChecker
            // modal will handle showing the update dialog
            return { screen: 'Main', params: {} };

        case 'admin_broadcast':
        case 'announcement':
        case 'smart_alert':
        case 'achievement':
        case 'manual':
        default:
            // Default: open the Notification Center so the user
            // can see the full notification + all their history
            return { screen: 'Board', params: { fromNotification: true } };
    }
}

/**
 * ─────────────────────────────────────────────────────────────
 *  NOTIFEE BACKGROUND EVENT HANDLER
 * ─────────────────────────────────────────────────────────────
 *  This runs even when the app is killed/in background.
 *  It handles notification taps (PRESS events) and navigates
 *  the user to the correct screen.
 *
 *  IMPORTANT: This MUST be registered at the top-level before
 *  AppRegistry.registerComponent — otherwise Android won't
 *  have a handler ready when the user taps the notification.
 * ─────────────────────────────────────────────────────────────
 */
notifee.onBackgroundEvent(async ({ type, detail }) => {
    console.log('[NOTIFEE-BG] Event type:', type, 'Detail:', detail?.notification?.data);

    if (type === EventType.PRESS) {
        // User tapped the notification
        const data = detail?.notification?.data || {};
        const { screen, params } = getScreenForNotification(data);

        console.log('[NOTIFEE-BG] Tapped → Navigating to:', screen);
        navigate(screen, params);
    }

    if (type === EventType.DISMISSED) {
        // User swiped away the notification — no action needed
        console.log('[NOTIFEE-BG] Notification dismissed');
    }
});

/**
 * ─────────────────────────────────────────────────────────────
 *  FCM BACKGROUND MESSAGE HANDLER
 * ─────────────────────────────────────────────────────────────
 *  Receives data-only FCM messages when the app is in background
 *  or killed. Creates a local Notifee notification with the
 *  correct data payload so tap-to-navigate works.
 * ─────────────────────────────────────────────────────────────
 */
messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('[FCM-BACKGROUND] Data Payload received:', remoteMessage.data);
    const { title, body, type, template } = remoteMessage.data || {};

    // Create a Notifee notification with the data attached
    // so when the user taps it, onBackgroundEvent can read the type
    await notifee.displayNotification({
        title: title || "ASTRA System Alert",
        body: body || "You have a new event.",
        data: remoteMessage.data || {},  // ← CRITICAL: Pass data through for tap routing
        android: {
            channelId: 'astra-class-reminders',
            importance: AndroidImportance.HIGH,
            pressAction: {
                id: 'default',
                launchActivity: 'default',
            },
        },
    });
});

// Register the foreground service headless task to keep the app alive
ForegroundService.register({
    config: {
        alert: false,
        onServiceErrorCallBack: function() {
            console.warn('ASTRA Foreground Service Error');
        }
    }
});

AppRegistry.registerComponent(appName, () => App);
