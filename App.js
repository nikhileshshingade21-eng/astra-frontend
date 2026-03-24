import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [isLoadingSession, setIsLoadingSession] = React.useState(true);

  const [fontsLoaded] = useFonts({
    'Tanker': require('./assets/fonts/Tanker-Regular.ttf'),
    'Satoshi': require('./assets/fonts/Satoshi-Regular.ttf'),
    'Satoshi-Medium': require('./assets/fonts/Satoshi-Medium.ttf'),
    'Satoshi-Bold': require('./assets/fonts/Satoshi-Bold.ttf'),
  });

  React.useEffect(() => {
    const bootstrapAsync = async () => {
      let token;
      let user;
      try {
        token = await AsyncStorage.getItem('token');
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) user = JSON.parse(userJson);
      } catch (e) {
        console.log('Restoration failed');
      }
      setUserToken(token);
      setInitialUser(user);
      setIsLoadingSession(false);
    };

    bootstrapAsync();
  }, []);

  if (!fontsLoaded || isLoadingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.hot} />
      </View>
    );
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
    <NavigationContainer theme={MyTheme}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg0} />
      <Stack.Navigator 
        initialRouteName={userToken ? "Main" : "RoleSelection"} 
        screenOptions={{ headerShown: false }}
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
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
