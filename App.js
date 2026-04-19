import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator, StatusBar, Alert } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from './src/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startAstraService, stopAstraService } from './src/services/foregroundService';

import AuthScreen from './src/screens/AuthScreen';
import RoleSelectionScreen from './src/screens/RoleSelectionScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import StudentDirectoryScreen from './src/screens/StudentDirectoryScreen';
import QRScreen from './src/screens/QRScreen';
import TrackerScreen from './src/screens/TrackerScreen';
import ZoneManagementScreen from './src/screens/ZoneManagementScreen';
import ToolsScreen from './src/screens/ToolsScreen';
import RealTimeMapScreen from './src/screens/RealTimeMapScreen';
import VerificationScreen from './src/screens/VerificationScreen';
import AIChatbotScreen from './src/screens/AIChatbotScreen';
import MarketplaceScreen from './src/screens/MarketplaceScreen';
import MarketplaceChatScreen from './src/screens/MarketplaceChatScreen';
import MarketplaceChatsScreen from './src/screens/MarketplaceChatsScreen';
import FeedbackScreen from './src/screens/FeedbackScreen';
import OrchestrationScreen from './src/screens/OrchestrationScreen';
import TestLottieScreen from './src/screens/TestLottieScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import NotificationCenterScreen from './src/screens/NotificationCenterScreen';
import AttendanceAnalyticsScreen from './src/screens/AttendanceAnalyticsScreen';
import AcademicCalendarScreen from './src/screens/AcademicCalendarScreen';
import VersionChecker from './src/components/VersionChecker';
import ErrorBoundary from './src/components/ErrorBoundary';
import { Colors as ThemeColors } from './src/theme/colors';
import { navigationRef, navigate } from './src/navigation/navigationService';
import io from 'socket.io-client';
import { API_BASE } from './src/api/config';

const colors = ThemeColors;

const Stack = createNativeStackNavigator();

export default function App() {
  const [userToken, setUserToken] = React.useState(null);
  const [initialUser, setInitialUser] = React.useState(null);
  const [isSystemInitialized, setIsSystemInitialized] = React.useState(false);

  // In pure RN CLI, fonts are handled by native configuration
  // We'll assume they are linked via assets and used by fontFamily name directly
  const [fontsLoaded] = React.useState(true); 

  React.useEffect(() => {
    const bootstrapAsync = async () => {
      // 🛡️ CRITICAL_BOOT_OVERRIDE: Force start after 8s even if tasks hang
      const timer = setTimeout(() => {
         console.warn('CRITICAL: Boot tasks timeout. Bypassing...');
         setIsSystemInitialized(true);
      }, 8000);
      
      try {
        // Hydrate Session
        const [token, userJson] = await Promise.all([
          SecureStore.getItemAsync('token').catch(() => null),
          SecureStore.getItemAsync('user').catch(() => null)
        ]);
        
        setUserToken(token);
        if (userJson) setInitialUser(JSON.parse(userJson));

        // 🧹 ONE-TIME CACHE PURGE: Clear stale timetable cache from broken server era
        const cacheVersion = await AsyncStorage.getItem('@astra_cache_version').catch(() => null);
        if (cacheVersion !== 'v2') {
          const allKeys = await AsyncStorage.getAllKeys();
          const staleKeys = allKeys.filter(k => k.startsWith('@astra_cache_'));
          if (staleKeys.length > 0) await AsyncStorage.multiRemove(staleKeys);
          await AsyncStorage.setItem('@astra_cache_version', 'v2');
          console.log('[BOOT] Purged stale cache entries:', staleKeys.length);
        }
        
        clearTimeout(timer);
        setIsSystemInitialized(true);
      } catch (e) {
        console.error('SYSTEM_BOOT_EXCEPTION:', e);
        setIsSystemInitialized(true); // Don't block boot on non-fatal errors
      }
    };
    bootstrapAsync();
  }, []);

  // 🔔 GLOBAL MARKETPLACE CHAT LISTENER
  React.useEffect(() => {
    if (!userToken || !initialUser) return;
    
    const socket = io(API_BASE, { transports: ['websocket'] });
    
    socket.on('connect', () => {
      socket.emit('join_user', initialUser.id);
      console.log('[GLOBAL_SOCKET] Connected and joined user room:', initialUser.id);
    });

    socket.on('marketplace_message', (data) => {
      // Show an alert if we receive a marketplace message
      const payload = data?.data || data;
      const msg = payload?.message;
      if (msg && msg.sender_id !== initialUser.id) {
        Alert.alert(
          '💬 New Marketplace Message',
          msg.message || 'You have a new message',
          [
            { text: 'Dismiss', style: 'cancel' },
            { text: 'Open Chat', onPress: () => {
              navigate('MarketplaceChats', { user: initialUser });
            }}
          ]
        );
      }
    });

    socket.on('disconnect', () => {
      console.log('[GLOBAL_SOCKET] Disconnected');
    });

    return () => socket.disconnect();
  }, [userToken, initialUser]);

  const [highReliabilityEnabled, setHighReliabilityEnabled] = React.useState(null);

  // 🛡️ ASTRA SHIELD: Hybrid Foreground Service Controller
  React.useEffect(() => {
    const fetchSettingAndCheckTime = async () => {
      const hiRelStr = await AsyncStorage.getItem('high_reliability_mode');
      const isEnabled = hiRelStr !== 'false';
      setHighReliabilityEnabled(isEnabled);

      const hour = new Date().getHours();
      if (isEnabled && hour >= 8 && hour < 17) {
        startAstraService();
      } else {
        stopAstraService();
      }
    };

    fetchSettingAndCheckTime();
    const interval = setInterval(fetchSettingAndCheckTime, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isSystemInitialized || !fontsLoaded) {
    return <OrchestrationScreen />;
  }

  const MyTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.bg,
      text: '#ffffff',
    },
  };

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <NavigationContainer theme={MyTheme} ref={navigationRef}>
          <VersionChecker />
          <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
          <Stack.Navigator 
            initialRouteName={userToken ? "Main" : "RoleSelection"} 
            screenOptions={{ 
              headerShown: false,
              animation: 'fade_from_bottom',
              animationDuration: 350,
              gestureEnabled: true,
              contentStyle: { backgroundColor: colors.bg }
            }}
          >
            {userToken ? (
              <>
                <Stack.Screen name="Main" component={MainTabNavigator} initialParams={{ user: initialUser }} />
                <Stack.Screen name="StudentDirectory" component={StudentDirectoryScreen} />
                <Stack.Screen name="QR" component={QRScreen} />
                <Stack.Screen name="Tracker" component={TrackerScreen} />
                <Stack.Screen name="ZoneManagement" component={ZoneManagementScreen} />
                <Stack.Screen name="Tools" component={ToolsScreen} />
                <Stack.Screen name="RealTimeMap" component={RealTimeMapScreen} />
                <Stack.Screen name="Verification" component={VerificationScreen} />
                <Stack.Screen name="AIChatbot" component={AIChatbotScreen} />
                <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
                <Stack.Screen name="MarketplaceChat" component={MarketplaceChatScreen} />
                <Stack.Screen name="MarketplaceChats" component={MarketplaceChatsScreen} />
                <Stack.Screen name="Feedback" component={FeedbackScreen} />
                <Stack.Screen name="TestLottie" component={TestLottieScreen} />
                <Stack.Screen name="Attendance" component={AttendanceScreen} />
                <Stack.Screen name="AttendanceAnalytics" component={AttendanceAnalyticsScreen} />
                <Stack.Screen name="Board" component={NotificationCenterScreen} />
                <Stack.Screen name="AcademicCalendar" component={AcademicCalendarScreen} />
                {/* Allow going back to Auth if needed, though usually redirected by navigation actions */}
                <Stack.Screen name="Auth" component={AuthScreen} />
                <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
              </>
            ) : (
              <>
                <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
                <Stack.Screen name="Auth" component={AuthScreen} />
                <Stack.Screen name="Main" component={MainTabNavigator} />
                <Stack.Screen name="StudentDirectory" component={StudentDirectoryScreen} />
                <Stack.Screen name="QR" component={QRScreen} />
                <Stack.Screen name="Tracker" component={TrackerScreen} />
                <Stack.Screen name="ZoneManagement" component={ZoneManagementScreen} />
                <Stack.Screen name="Tools" component={ToolsScreen} />
                <Stack.Screen name="RealTimeMap" component={RealTimeMapScreen} />
                <Stack.Screen name="Verification" component={VerificationScreen} />
                <Stack.Screen name="AIChatbot" component={AIChatbotScreen} />
                <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
                <Stack.Screen name="MarketplaceChat" component={MarketplaceChatScreen} />
                <Stack.Screen name="MarketplaceChats" component={MarketplaceChatsScreen} />
                <Stack.Screen name="Feedback" component={FeedbackScreen} />
                <Stack.Screen name="TestLottie" component={TestLottieScreen} />
                <Stack.Screen name="Attendance" component={AttendanceScreen} />
                <Stack.Screen name="AttendanceAnalytics" component={AttendanceAnalyticsScreen} />
                <Stack.Screen name="Board" component={NotificationCenterScreen} />
                <Stack.Screen name="AcademicCalendar" component={AcademicCalendarScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: ThemeColors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: ThemeColors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Tanker',
    fontSize: 42,
    color: '#fff',
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    color: ThemeColors.primary,
    marginTop: 8,
    letterSpacing: 2,
  }
});
