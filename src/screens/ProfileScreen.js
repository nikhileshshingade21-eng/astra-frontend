import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const colors = { bg0: '#0f172a', hot: '#3b82f6', danger: '#ff3b5c', surf: 'rgba(255, 255, 255, 0.05)' };

export default function ProfileScreen({ route, navigation }) {
    const { user } = route.params;

    const handleLogout = async () => {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        navigation.reset({
            index: 0,
            routes: [{ name: 'RoleSelection' }],
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>PROFILE</Text>

            <View style={styles.card}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{user.name[0]}</Text>
                </View>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.roll}>{user.roll_number}</Text>

                <View style={styles.detailsGrid}>
                    <View style={styles.detailBox}>
                        <Text style={styles.label}>PROGRAMME</Text>
                        <Text style={styles.val}>{user.programme || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailBox}>
                        <Text style={styles.label}>SECTION</Text>
                        <Text style={styles.val}>{user.section || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailBox}>
                        <Text style={styles.label}>EMAIL</Text>
                        <Text style={styles.val}>{user.email || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailBox}>
                        <Text style={styles.label}>PHONE</Text>
                        <Text style={styles.val}>{user.phone || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailBox}>
                        <Text style={styles.label}>ROLE</Text>
                        <Text style={styles.val}>{user.role?.toUpperCase()}</Text>
                    </View>
                    <View style={styles.detailBox}>
                        <Text style={styles.label}>MEMBER SINCE</Text>
                        <Text style={styles.val}>{user.created_at || 'Mar 2026'}</Text>
                    </View>
                </View>

                <TouchableOpacity 
                    style={styles.btnFeedback} 
                    onPress={() => navigation.navigate('Feedback')}
                >
                    <Ionicons name="bug-outline" size={16} color={colors.hot} />
                    <Text style={styles.feedbackText}>BETA FEEDBACK</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
                    <Text style={styles.logoutText}>LOGOUT</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg0, padding: 24, paddingTop: 60 },
    header: { fontFamily: 'Tanker', fontSize: 28, color: '#fff', marginBottom: 20, letterSpacing: 1 },
    card: { alignItems: 'center', backgroundColor: colors.surf, borderRadius: 18, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    avatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.hot, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    avatarText: { fontFamily: 'Tanker', fontSize: 28, color: '#fff' },
    name: { fontFamily: 'Satoshi-Bold', fontSize: 18, color: '#fff' },
    roll: { fontFamily: 'Satoshi', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
    detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20, width: '100%' },
    detailBox: { flex: 1, minWidth: '45%', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    label: { fontFamily: 'Satoshi-Bold', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },
    val: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: '#fff', marginTop: 2 },
    btnFeedback: { flexDirection: 'row', gap: 8, width: '100%', marginTop: 24, padding: 14, borderRadius: 12, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)', alignItems: 'center', justifyContent: 'center' },
    feedbackText: { fontFamily: 'Satoshi-Bold', color: colors.hot, fontSize: 12, letterSpacing: 1 },
    btnLogout: { width: '100%', marginTop: 12, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255, 59, 92, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 59, 92, 0.3)', alignItems: 'center' },
    logoutText: { fontFamily: 'Satoshi-Bold', color: colors.danger, fontSize: 12, letterSpacing: 1 }
});
