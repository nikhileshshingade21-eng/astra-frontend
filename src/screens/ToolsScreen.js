import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Platform, UIManager } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
// import { BlurView } from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as SecureStore from '../utils/storage';
import { fetchWithTimeout } from '../utils/api';

const { width } = Dimensions.get('window');

const colors = {
    bg: '#020617',
    glass: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(255, 255, 255, 0.08)',
    textDim: 'rgba(255, 255, 255, 0.4)',
    neonBlue: '#00f2ff',
    neonPink: '#ff00e5',
    neonGreen: '#00ffaa',
    neonPurple: '#bf00ff',
    hot: '#ff3d71'
};

export default function ToolsScreen({ route, navigation }) {
    const { user } = route.params || { user: { role: 'faculty' } };
    const role = user.role || 'faculty';
    const roleColor = role === 'admin' ? colors.neonBlue : colors.neonPurple;

    const tools = [
        { id: 'map', name: 'Campus Map', desc: 'See live campus activity', icon: 'map-outline', color: colors.neonBlue, screen: 'RealTimeMap' },
        { id: 'directory', name: 'Students', desc: 'Search student records', icon: 'people-outline', color: colors.neonPurple, screen: 'StudentDirectory' },
        { id: 'tracker', name: 'Tracker', desc: 'Movement and attendance logs', icon: 'trail-sign-outline', color: colors.neonGreen, screen: 'Tracker' },
        { id: 'calendar', name: 'Academic Calendar', desc: 'Institutional events and holidays', icon: 'calendar-outline', color: '#ff8c00', screen: 'AcademicCalendar' },
        { id: 'verification', name: 'Verification', desc: 'Manually verify attendance', icon: 'shield-checkmark-outline', color: colors.hot, screen: 'Verification' },
        { id: 'zones', name: 'Campus Zones', desc: 'Manage location areas', icon: 'grid-outline', color: colors.neonBlue, screen: 'ZoneManagement', adminOnly: true },
        { id: 'reports', name: 'Reports', desc: 'Generate data reports', icon: 'document-text-outline', color: colors.neonGreen, action: 'report' },
        { id: 'alerts', name: 'Announcements', desc: 'Send campus-wide alerts', icon: 'megaphone-outline', color: colors.hot, action: 'alert' },
        { id: 'diag', name: 'Test Mode', desc: 'Test app components', icon: 'flask-outline', color: colors.neonBlue, screen: 'TestLottie', adminOnly: true },
    ];

    const handlePress = async (tool) => {
        if (tool.screen) {
            navigation.navigate(tool.screen, { user });
        } else if (tool.action === 'report') {
            try {
                const token = await SecureStore.getItemAsync('token');
                const res = await fetchWithTimeout('/api/admin/generate-report', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) alert(res.data?.message || 'Report sent');
                else alert(res.data?.error || 'Failed to send report');
            } catch (e) {
                alert('Connection error');
            }
        } else if (tool.action === 'alert') {
            navigation.navigate('Board', { user });
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />
            
            {/* Ambient Role Glow */}
            <View style={[styles.ambientGlow, { backgroundColor: roleColor + '10' }]} />

            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <Text style={styles.title}>Tools</Text>
                    <View style={styles.authBadge}>
                        <Text style={[styles.authText, { color: roleColor }]}>{role.toUpperCase()}</Text>
                    </View>
                </View>
                <Text style={styles.sub}>Manage and control campus features.</Text>
            </View>

            <View style={styles.grid}>
                {tools.map((tool, i) => {
                    if (tool.adminOnly && role !== 'admin') return null;
                    return (
                        <TouchableOpacity 
                            key={tool.id} 
                            style={styles.toolWrapper} 
                            onPress={() => handlePress(tool)}
                            activeOpacity={0.8}
                        >
                            <View blurType="dark" blurAmount={3} style={styles.toolCard}>
                                <View style={[styles.iconBox, { backgroundColor: tool.color + '15' }]}>
                                    <Ionicons name={tool.icon} size={28} color={tool.color} />
                                </View>
                                <View style={styles.toolContent}>
                                    <View style={styles.statusRow}>
                                        <Text style={styles.toolName}>{tool.name}</Text>
                                        <View style={[styles.statusDot, { backgroundColor: tool.color }]} />
                                    </View>
                                    <Text style={styles.toolDesc}>{tool.desc}</Text>
                                </View>
                                <View style={[styles.cardAccent, { backgroundColor: tool.color }]} />
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>ASTRA v2.0.0</Text>
                <View style={styles.footerLine} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scrollContent: { paddingBottom: 100 },
    ambientGlow: { position: 'absolute', width: width * 1.5, height: width * 1.5, top: -width * 0.5, left: -width * 0.25, borderRadius: width, blurRadius: 100 },
    
    header: { paddingHorizontal: 24, paddingTop: 60, marginBottom: 30 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    title: { fontFamily: 'Tanker', fontSize: 32, color: '#fff', letterSpacing: 1 },
    authBadge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    authText: { fontFamily: 'Satoshi-Black', fontSize: 8, letterSpacing: 2 },
    sub: { fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.textDim, letterSpacing: 1, lineHeight: 18 },

    grid: { paddingHorizontal: 24, gap: 16 },
    toolWrapper: { borderRadius: 24, overflow: 'hidden' },
    toolCard: { padding: 24, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 20 },
    iconBox: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    toolContent: { flex: 1 },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    toolName: { fontFamily: 'Tanker', fontSize: 20, color: '#fff', letterSpacing: 1 },
    statusDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.8 },
    toolDesc: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: colors.textDim, letterSpacing: 0.5 },
    cardAccent: { position: 'absolute', right: 0, top: '25%', bottom: '25%', width: 3, borderTopLeftRadius: 3, borderBottomLeftRadius: 3, opacity: 0.5 },

    footer: { marginTop: 60, alignItems: 'center', gap: 15 },
    footerText: { fontFamily: 'Satoshi-Black', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 3 },
    footerLine: { width: 40, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' }
});

