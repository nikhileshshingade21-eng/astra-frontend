import React from 'react';
import { View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { Colors } from '../theme/colors';

import DashboardScreen from '../screens/DashboardScreen';
import TimetableScreen from '../screens/TimetableScreen';
import AIChatbotScreen from '../screens/AIChatbotScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FacultyDashboard from '../screens/FacultyDashboard';
import ToolsScreen from '../screens/ToolsScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator({ route }) {
    const { user } = route.params || {};
    const role = user?.role || 'student';

    return (
        <Tab.Navigator
            screenOptions={({ route: tabRoute }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.bgSheet,
                    borderTopColor: Colors.border,
                    borderTopWidth: 1,
                    height: Platform.OS === 'ios' ? 88 : 64,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
                    paddingTop: 10,
                    elevation: 0,
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textMuted,
                tabBarLabelStyle: {
                    fontFamily: 'Satoshi-Bold',
                    fontSize: 10,
                    letterSpacing: 0.3,
                },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    const routeName = tabRoute.name;

                    if (routeName === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
                    else if (routeName === 'Timetable') iconName = focused ? 'calendar' : 'calendar-outline';
                    else if (routeName === 'AstrAI') iconName = focused ? 'sparkles' : 'sparkles-outline';
                    else if (routeName === 'Profile') iconName = focused ? 'person' : 'person-outline';
                    else if (routeName === 'Monitor') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                    else if (routeName === 'Tools') iconName = focused ? 'construct' : 'construct-outline';
                    else iconName = 'ellipse-outline';

                    // Special styling for the center AI tab
                    if (routeName === 'AstrAI' && focused) {
                        return (
                            <View style={{
                                width: 42, height: 42, borderRadius: 21,
                                overflow: 'hidden', marginTop: -4,
                            }}>
                                <LinearGradient
                                    colors={Colors.gradientPrimary}
                                    style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                                >
                                    <Ionicons name={iconName} size={22} color="#fff" />
                                </LinearGradient>
                            </View>
                        );
                    }

                    return <Ionicons name={iconName} size={routeName === 'AstrAI' ? 24 : 22} color={color} />;
                },
            })}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                initialParams={{ user }}
                options={{ tabBarLabel: 'Home' }}
            />
            <Tab.Screen
                name="Timetable"
                component={TimetableScreen}
                initialParams={{ user }}
                options={{ tabBarLabel: 'Schedule' }}
            />
            <Tab.Screen
                name="AstrAI"
                component={AIChatbotScreen}
                initialParams={{ user }}
                options={{ tabBarLabel: 'ASTRA' }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                initialParams={{ user }}
                options={{ tabBarLabel: 'Profile' }}
            />
            {(role === 'faculty' || role === 'admin') && (
                <Tab.Screen
                    name="Monitor"
                    component={FacultyDashboard}
                    initialParams={{ user }}
                    options={{ tabBarLabel: 'Monitor' }}
                />
            )}
            {(role === 'faculty' || role === 'admin') && (
                <Tab.Screen
                    name="Tools"
                    component={ToolsScreen}
                    initialParams={{ user }}
                    options={{ tabBarLabel: 'Tools' }}
                />
            )}
        </Tab.Navigator>
    );
}
