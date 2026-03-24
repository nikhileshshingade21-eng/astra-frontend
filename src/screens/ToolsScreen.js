import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const colors = {
    bg0: '#0f172a', surf: 'rgba(255, 255, 255, 0.05)',
    hot: '#3b82f6', green: '#10b981', cyan: '#0ea5e9', purp: '#6366f1', border: 'rgba(255, 255, 255, 0.12)'
};

export default function ToolsScreen({ route, navigation }) {
    const { user } = route.params || { user: { role: 'faculty' } };
    const role = user.role || 'faculty';

    const tools = [
        { id: 'map', name: 'REAL-TIME MAP', desc: 'Live classroom visualizer', icon: 'map', color: colors.cyan, screen: 'RealTimeMap' },
        { id: 'directory', name: 'STUDENT DIRECTORY', desc: 'Comprehensive student registry', icon: 'people-outline', color: colors.hot, screen: 'StudentDirectory' },
        { id: 'tracker', name: 'STUDENT TRACKER', desc: 'Audit student campus movement', icon: 'trail-sign-outline', color: colors.cyan, screen: 'Tracker' },
        { id: 'verification', name: 'VERIFICATION PROTOCOL', desc: 'Trigger identity countdown', icon: 'scan-outline', color: colors.hot, screen: 'Verification' },
        { id: 'zones', name: 'GEO ZONES', desc: 'Manage campus geofences', icon: 'map-outline', color: colors.green, screen: 'ZoneManagement', adminOnly: true },
        { id: 'reports', name: 'DAILY REPORTS', desc: 'Automated email summaries', icon: 'mail-outline', color: colors.purp, action: 'report' },
        { id: 'alerts', name: 'SYSTEM ALERTS', desc: 'Broadcast urgent messages', icon: 'notifications-outline', color: colors.hot, action: 'alert' },
    ];

    const handlePress = (tool) => {
        if (tool.screen) {
            navigation.navigate(tool.screen, { user });
        } else if (tool.action === 'report') {
            alert('Daily report triggered. Dispatching to faculty emails.');
        } else if (tool.action === 'alert') {
            alert('Emergency broadcast initiated. All active sessions notified.');
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.header}>
                <Text style={styles.title}>INSTITUTIONAL TOOLS</Text>
                <Text style={styles.sub}>Centralized management & analytics protocol</Text>
            </View>

            <View style={styles.grid}>
                {tools.map(tool => {
                    if (tool.adminOnly && role !== 'admin') return null;
                    return (
                        <TouchableOpacity key={tool.id} style={styles.toolCard} onPress={() => handlePress(tool)}>
                            <View style={[styles.iconBox, { backgroundColor: tool.color + '20', borderColor: tool.color }]}>
                                <Ionicons name={tool.icon} size={28} color={tool.color} />
                            </View>
                            <Text style={styles.toolName}>{tool.name}</Text>
                            <Text style={styles.toolDesc}>{tool.desc}</Text>
                            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" style={styles.arrow} />
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>ASTRA v2.1 • INSTITUTIONAL BUILD</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg0 },
    header: { padding: 24, paddingTop: 60 },
    title: { fontFamily: 'Tanker', fontSize: 32, color: '#fff', letterSpacing: 1 },
    sub: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
    grid: { padding: 20, gap: 15 },
    toolCard: { backgroundColor: colors.surf, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.border, position: 'relative' },
    iconBox: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 1 },
    toolName: { fontFamily: 'Tanker', fontSize: 18, color: '#fff', letterSpacing: 1 },
    toolDesc: { fontFamily: 'Satoshi', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
    arrow: { position: 'absolute', right: 20, top: '50%', marginTop: -8 },
    footer: { marginTop: 40, alignItems: 'center', opacity: 0.3 },
    footerText: { fontFamily: 'Satoshi-Bold', fontSize: 9, color: '#fff', letterSpacing: 2 }
});
