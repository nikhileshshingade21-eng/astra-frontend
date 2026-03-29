import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator, StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from './src/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notificationService from './src/services/notificationService';

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
import FeedbackScreen from './src/screens/FeedbackScreen';
import OrchestrationScreen from './src/screens/OrchestrationScreen';
import TestLottieScreen from './src/screens/TestLottieScreen';
import VersionChecker from './src/components/VersionChecker';
import ErrorBoundary from './src/components/ErrorBoundary';

const colors = {
  bg0: '#0f172a',
  bg1: '#1e293b',
  surf: 'rgba(255, 255, 255, 0.05)',
  surf2: 'rgba(255, 255, 255, 0.08)',
  hot: '#3b82f6',
  purp: '#6366f1',
  oran: '#f59e0b',
  acid: '#84cc16',
  green: '#10b981',
  danger: '#ef4444',
  cyan: '#0ea5e9',
  border: 'rgba(255, 255, 255, 0.1)',
};

const Stack = createNativeStackNavigator();

export default function App() {
  const [userToken, setUserToken] = React.useState(null);
  const [initialUser, setInitialUser] = React.useState(null);
  const [isSystemInitialized, setIsSystemInitialized] = React.useState(false);
  const navigationRef = React.useRef();

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
        if (userJson) {
          const user = JSON.parse(userJson);
          setInitialUser(user);
          
          // 🔔 Initialize notifications if user is logged in
          if (token && user._id) {
            try {
              await notificationService.initialize();
              const hasPermission = await notificationService.requestPermission();
              if (hasPermission) {
                await notificationService.registerToken(user._id);
                notificationService.setupForegroundHandler();
                notificationService.setupBackgroundHandler();
                console.log('✅ Notifications initialized for user:', user._id);
              }
            } catch (e) {
              console.error('⚠️ Notification setup failed:', e);
            }
          }
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

  if (!isSystemInitialized || !fontsLoaded) {
    return <OrchestrationScreen />;
  }

  const MyTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.bg0,
      text: '#ffffff',
    },
  };

  return (
    <ErrorBoundary>
      <NavigationContainer 
        theme={MyTheme}
        ref={navigationRef}
        onReady={() => {
          // Setup notification opened handler when navigation is ready
          if (userToken && initialUser) {
            notificationService.setupNotificationOpenedHandler(navigationRef.current);
          }
        }}
      >
        <VersionChecker />
        <StatusBar barStyle="light-content" backgroundColor={colors.bg0} />
        <Stack.Navigator 
          initialRouteName={userToken ? "Main" : "RoleSelection"} 
          screenOptions={{ 
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 200,
            gestureEnabled: true
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
              <Stack.Screen name="Feedback" component={FeedbackScreen} />
              <Stack.Screen name="TestLottie" component={TestLottieScreen} />
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
              <Stack.Screen name="Feedback" component={FeedbackScreen} />
              <Stack.Screen name="TestLottie" component={TestLottieScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg0,
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
    color: colors.hot,
    marginTop: 8,
    letterSpacing: 2,
  }
});
