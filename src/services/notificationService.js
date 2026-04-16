/**
 * ASTRA Notification Service
 * Handles Firebase Cloud Messaging + Local Notifications for Class Reminders
 */

import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../api/config';

class NotificationService {
  constructor() {
    this.configured = false;
  }

  /**
   * Initialize notification system
   */
  async initialize() {
    if (this.configured) return;

    try {
      // Configure local notifications
      PushNotification.configure({
        onRegister: (token) => {
          console.log('📱 Device token:', token.token);
        },

        onNotification: (notification) => {
          console.log('🔔 Notification received:', notification);
          
          // Handle notification tap
          if (notification.userInteraction) {
            this.handleNotificationTap(notification.data);
          }
          
          notification.finish(PushNotification.FetchResult.NoData);
        },

        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },

        popInitialNotification: true,
        requestPermissions: Platform.OS === 'ios',
      });

      // Create Android notification channel
      if (Platform.OS === 'android') {
        PushNotification.createChannel(
          {
            channelId: 'astra-class-reminders',
            channelName: 'Class Reminders',
            channelDescription: 'Notifications for upcoming and ongoing classes',
            playSound: true,
            soundName: 'default',
            importance: 4, // HIGH
            vibrate: true,
          },
          (created) => console.log(`📱 Notification channel created: ${created}`)
        );
      }

      this.configured = true;
      console.log('✅ Notification service initialized');
      return true;
    } catch (error) {
      console.error('❌ Notification init error:', error);
      return false;
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermission() {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ Notification permission granted');
        return true;
      } else {
        console.log('❌ Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('❌ Permission request error:', error);
      return false;
    }
  }

  /**
   * Get FCM token and register with backend
   */
  async registerToken(userId) {
    try {
      const fcmToken = await messaging().getToken();
      console.log('🔑 FCM Token obtained:', fcmToken.substring(0, 20) + '...');

      // Save token locally
      await AsyncStorage.setItem('fcm_token', fcmToken);
      await AsyncStorage.setItem('fcm_token_user', userId);

      // Register with backend
      const response = await fetch(`${API_BASE}/api/notifications/register-fcm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          fcm_token: fcmToken,
          device_type: Platform.OS,
        }),
      });

      const result = await response.json();
      console.log('✅ FCM token registered with backend:', result);
      return fcmToken;
    } catch (error) {
      console.error('❌ Token registration error:', error);
      return null;
    }
  }

  /**
   * Set up foreground message handler
   */
  setupForegroundHandler() {
    return messaging().onMessage(async (remoteMessage) => {
      console.log('🔔 Foreground notification:', remoteMessage);

      const { title, body } = remoteMessage.notification || {};
      const data = remoteMessage.data || {};

      // Show local notification when app is in foreground
      PushNotification.localNotification({
        channelId: 'astra-class-reminders',
        title: title || 'ASTRA',
        message: body || 'You have a new notification',
        playSound: true,
        soundName: 'default',
        importance: 'high',
        priority: 'high',
        vibrate: true,
        vibration: 300,
        data: data,
        userInfo: data, // iOS
      });
    });
  }

  /**
   * Set up background message handler
   */
  static setupBackgroundHandler() {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('🔔 Background notification:', remoteMessage);
      // Process notification in background
    });
  }

  /**
   * Handle notification opened (app was closed/background)
   */
  setupNotificationOpenedHandler(navigation) {
    // Handle notification when app is opened from quit state
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('🔔 Notification opened app from quit state:', remoteMessage);
          this.handleNotificationTap(remoteMessage.data, navigation);
        }
      });

    // Handle notification when app is in background
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('🔔 Notification opened app from background:', remoteMessage);
      this.handleNotificationTap(remoteMessage.data, navigation);
    });
  }

  /**
   * Handle notification tap navigation
   */
  handleNotificationTap(data, navigation) {
    if (!data || !navigation) return;

    const { type, class_name, start_time } = data;

    switch (type) {
      case 'class_reminder':
      case 'class_start':
        // Navigate to Timetable
        navigation.navigate('Main', {
          screen: 'Timetable',
          params: {
            highlightClass: class_name,
            highlightTime: start_time,
          },
        });
        break;

      case 'announcement':
        navigation.navigate('Main', {
          screen: 'Announcements',
        });
        break;

      default:
        navigation.navigate('Main', { screen: 'Dashboard' });
    }
  }

  /**
   * Show local notification (for testing)
   */
  showLocalNotification(title, message, data = {}) {
    PushNotification.localNotification({
      channelId: 'astra-class-reminders',
      title: title,
      message: message,
      playSound: true,
      soundName: 'default',
      importance: 'high',
      vibrate: true,
      data: data,
    });
  }

  /**
   * Schedule a local notification
   */
  scheduleNotification(title, message, date, data = {}) {
    PushNotification.localNotificationSchedule({
      channelId: 'astra-class-reminders',
      title: title,
      message: message,
      date: date, // Date object
      playSound: true,
      soundName: 'default',
      data: data,
    });
  }

  /**
   * Cancel all scheduled notifications
   */
  cancelAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
  }

  /**
   * Check if notifications are enabled
   */
  async hasPermission() {
    try {
      const authStatus = await messaging().hasPermission();
      return (
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get notification settings
   */
  async getSettings() {
    try {
      const fcmToken = await AsyncStorage.getItem('fcm_token');
      const hasPermission = await this.hasPermission();
      
      return {
        fcmToken,
        hasPermission,
        configured: this.configured,
      };
    } catch (error) {
      return null;
    }
  }
}

export default new NotificationService();
