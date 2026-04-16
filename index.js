import 'react-native-reanimated';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';

import ForegroundService from '@supersami/rn-foreground-service';

import notifee, { AndroidImportance } from '@notifee/react-native';

// Register background handler for live push notifications (Data-Only wakeup)
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM-BACKGROUND] Data Payload received:', remoteMessage.data);
  const { title, body } = remoteMessage.data || {};

  // Bypass the Android OS drop mechanisms and manually construct the system alert
  await notifee.displayNotification({
    title: title || "ASTRA System Alert",
    body: body || "You have a new background event.",
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
