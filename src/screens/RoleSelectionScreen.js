import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const colors = {
    bg: '#0f172a',
    hot: '#3b82f6',
    purp: '#6366f1',
    cyan: '#0ea5e9',
    green: '#10b981',
    surf: 'rgba(255, 255, 255, 0.05)',
    border: 'rgba(255, 255, 255, 0.12)'
};

const roles = [
    { id: 'student', title: 'STUDENT', icon: '👨‍🎓', desc: 'Mark attendance, view timetable & stats', color: colors.hot },
    { id: 'faculty', title: 'FACULTY', icon: '👨‍🏫', desc: 'Monitor live classes & manage attendance', color: colors.purp },
    { id: 'admin', title: 'ADMIN', icon: '🛡️', desc: 'Campus-wide analytics & system control', color: colors.cyan }
];

export default function RoleSelectionScreen({ navigation }) {
    const handleRoleSelect = (role) => {
        navigation.navigate('Auth', { role });
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1a0b2e', '#0f172a']} style={StyleSheet.absoluteFill} />

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <Image source={require('../../assets/logo.png')} style={styles.logoImage} />
                    <Text style={styles.tagline}>CHOOSE YOUR ACCESS PROTOCOL</Text>
                </View>

                <View style={styles.grid}>
                    {roles.map((role) => (
                        <TouchableOpacity
                            key={role.id}
                            style={styles.card}
                            onPress={() => handleRoleSelect(role.id)}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[role.color + '20', 'transparent']}
                                style={styles.cardGlow}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <Text style={styles.cardIcon}>{role.icon}</Text>
                            <View style={styles.cardTitleBox}>
                                <Text style={[styles.cardTitle, { color: role.color }]}>{role.title}</Text>
                                <View style={[styles.badge, { backgroundColor: role.color + '30' }]}>
                                    <Text style={[styles.badgeText, { color: role.color }]}>ACTIVE</Text>
                                </View>
                            </View>
                            <Text style={styles.cardDesc}>{role.desc}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.footer}>v2.0 — SECURE CAMPUS PROTOCOL</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scroll: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
    header: { alignItems: 'center', marginBottom: 40 },
    logoImage: { width: 250, height: 150, resizeMode: 'contain', marginBottom: 10 },
    tagline: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: colors.hot, letterSpacing: 3, marginTop: 4 },
    grid: { width: '100%', gap: 16 },
    card: {
        backgroundColor: colors.surf,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 24,
        padding: 24,
        overflow: 'hidden',
        position: 'relative'
    },
    cardGlow: { ...StyleSheet.absoluteFillObject },
    cardIcon: { fontSize: 32, marginBottom: 12 },
    cardTitleBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    cardTitle: { fontFamily: 'Tanker', fontSize: 24, letterSpacing: 1 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontFamily: 'Satoshi-Bold', fontSize: 8, letterSpacing: 1 },
    cardDesc: { fontFamily: 'Satoshi', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 18 },
    footer: { marginTop: 40, fontFamily: 'Satoshi-Bold', fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }
});
