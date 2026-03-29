/**
 * ASTRA Notification Service
 * Handles Firebase Cloud Messaging for class reminders
 */

import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://astra-backend-production-e996.up.railway.app/api';

class NotificationService {
  constructor() {
    this.configured = false;
  }

  /**
   * Initialize notification service
   */
  async initialize() {
    if (this.configured) return;

    try {
      // Configure local notifications
      PushNotification.configure({
        onRegister: function (token) {
          console.log('📱 Local notification token:', token.token);
        },
        onNotification: function (notification) {
          console.log('🔔 Notification received:', notification);
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

      // Create notification channel for Android
      if (Platform.OS === 'android') {
        PushNotification.createChannel(
          {
            channelId: 'astra-class-reminders',
            channelName: 'Class Reminders',
            channelDescription: 'Notifications for upcoming classes',
            playSound: true,
            soundName: 'default',
            importance: 4,
            vibrate: true,
          },
          (created) => console.log(`📱 Channel created: ${created}`)
        );
      }

      this.configured = true;
      console.log('✅ Notification service initialized');
    } catch (error) {
      console.error('❌ Notification initialization error:', error);
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
        console.log('✅ Notification permission granted:', authStatus);
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
      console.log('🔑 FCM Token:', fcmToken);

      // Save token locally
      await AsyncStorage.setItem('fcm_token', fcmToken);

      // Register token with backend
      const response = await axios.post(`${API_URL}/notifications/register`, {
        user_id: userId,
        fcm_token: fcmToken,
        device_type: Platform.OS,
      });

      console.log('✅ Token registered with backend:', response.data);
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

      // Show local notification when app is in foreground
      PushNotification.localNotification({
        channelId: 'astra-class-reminders',
        title: remoteMessage.notification?.title || 'ASTRA',
        message: remoteMessage.notification?.body || '',
        playSound: true,
        soundName: 'default',
        importance: 'high',
        vibrate: true,
        vibration: 300,
        data: remoteMessage.data,
      });
    });
  }

  /**
   * Set up background message handler
   */
  setupBackgroundHandler() {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('🔔 Background notification:', remoteMessage);
    });
  }

  /**
   * Set up notification tap handler
   */
  setupNotificationOpenedHandler(navigation) {
    // Handle notification when app is opened from quit state
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('🔔 Notification opened app:', remoteMessage);
          this.handleNotificationNavigation(remoteMessage.data, navigation);
        }
      });

    // Handle notification when app is in background
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('🔔 Notification opened app from background:', remoteMessage);
      this.handleNotificationNavigation(remoteMessage.data, navigation);
    });
  }

  /**
   * Handle navigation based on notification data
   */
  handleNotificationNavigation(data, navigation) {
    if (!data || !navigation) return;

    const { type, class_name, start_time, room } = data;

    if (type === 'class_reminder' || type === 'class_start') {
      // Navigate to timetable or attendance screen
      navigation.navigate('Main', {
        screen: 'Timetable',
        params: {
          highlight_class: class_name,
        },
      });
    }
  }

  /**
   * Show local notification (for testing or offline)
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
   * Get notification history from backend
   */
  async getNotificationHistory(userId) {
    try {
      const response = await axios.get(`${API_URL}/notifications/history/${userId}`);
      return response.data.notifications || [];
    } catch (error) {
      console.error('❌ Failed to fetch notification history:', error);
      return [];
    }
  }

  /**
   * Check if user has granted permissions
   */
  async hasPermission() {
    const authStatus = await messaging().hasPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  }

  /**
   * Cancel all local notifications
   */
  cancelAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
  }
}

export default new NotificationService();
