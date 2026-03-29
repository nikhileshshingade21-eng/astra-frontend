import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DashboardScreen from '../screens/DashboardScreen';
import TimetableScreen from '../screens/TimetableScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LeaveScreen from '../screens/LeaveScreen';
import ToolsScreen from '../screens/ToolsScreen';
import InsightsScreen from '../screens/InsightsScreen';
import MarksScreen from '../screens/MarksScreen';
import FacultyDashboard from '../screens/FacultyDashboard';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';

const Tab = createBottomTabNavigator();

const colors = {
    bg1: '#0b0614',
    hot: '#3b82f6',
    cyan: '#0ea5e9',
    border: 'rgba(255, 255, 255, 0.12)'
};

export default function MainTabNavigator({ route }) {
    const { user } = route.params || {};
    const role = user?.role || 'student';

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.bg1,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    height: 60,
                    paddingBottom: 10,
                    paddingTop: 10
                },
                tabBarActiveTintColor: colors.hot,
                tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
                tabBarLabelStyle: { fontFamily: 'Satoshi-Bold', fontSize: 10 }
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                initialParams={{ user }}
                options={{ 
                    tabBarLabel: 'HOME',
                    tabBarIcon: ({ color }) => <Ionicons name="home" size={20} color={color} />
                }}
            />
            <Tab.Screen
                name="Timetable"
                component={TimetableScreen}
                initialParams={{ user }}
                options={{ 
                    tabBarLabel: 'TIMETABLE',
                    tabBarIcon: ({ color }) => <Ionicons name="calendar" size={20} color={color} />
                }}
            />
            {role === 'student' && (
                <Tab.Screen
                    name="Attendance"
                    component={AttendanceScreen}
                    initialParams={{ user }}
                    options={{ 
                        tabBarLabel: 'MARK',
                        tabBarIcon: ({ color }) => <Ionicons name="finger-print" size={24} color={color} />
                    }}
                />
            )}
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                initialParams={{ user }}
                options={{ 
                    tabBarLabel: 'PROFILE',
                    tabBarIcon: ({ color }) => <Ionicons name="person" size={20} color={color} />
                }}
            />
            {(role === 'faculty' || role === 'admin') && (
                <Tab.Screen
                    name="Monitor"
                    component={FacultyDashboard}
                    initialParams={{ user }}
                    options={{ 
                        tabBarLabel: 'MONITOR',
                        tabBarIcon: ({ color }) => <Ionicons name="stats-chart" size={20} color={color} />
                    }}
                />
            )}
            {(role === 'faculty' || role === 'admin') && (
                <Tab.Screen
                    name="Tools"
                    component={ToolsScreen}
                    initialParams={{ user }}
                    options={{ 
                        tabBarLabel: 'TOOLS',
                        tabBarIcon: ({ color }) => <Ionicons name="construct" size={20} color={color} />
                    }}
                />
            )}
            <Tab.Screen
                name="Board"
                component={AnnouncementsScreen}
                initialParams={{ user }}
                options={{ 
                    tabBarLabel: 'BOARD',
                    tabBarIcon: ({ color }) => <Ionicons name="newspaper" size={20} color={color} />
                }}
            />
            <Tab.Screen
                name="Marks"
                component={MarksScreen}
                initialParams={{ user }}
                options={{ 
                    tabBarLabel: 'GRADES',
                    tabBarIcon: ({ color }) => <Ionicons name="ribbon" size={20} color={color} />
                }}
            />
        </Tab.Navigator>
    );
}
