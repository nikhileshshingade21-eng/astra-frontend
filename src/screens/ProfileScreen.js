import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ScrollView, 
    StatusBar, 
    Dimensions,
    Platform,
    UIManager,
    RefreshControl
} from 'react-native';
import * as SecureStore from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { 
    FadeInDown,
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming 
} from 'react-native-reanimated';
import { fetchWithTimeout } from '../utils/api';
import Colors from '../theme/colors';
import { startAstraService, stopAstraService } from '../services/foregroundService';

const { width } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BADGES = [
    { id: 'first_step', icon: '🎯', title: 'First Step', desc: 'Marked first attendance' },
    { id: 'week_warrior', icon: '🔥', title: 'Week Warrior', desc: '7-day streak' },
    { id: 'epic_streak', icon: '⚡', title: 'Epic Streak', desc: '14-day streak' },
    { id: 'centurion', icon: '👑', title: 'Centurion', desc: 'Rank #1 Student' }
];

export default function ProfileScreen({ route, navigation }) {
    const [user, setUser] = useState(route.params?.user || { role: 'student', name: 'Student' });
    const roleColor = user.role === 'admin' ? Colors.admin : (user.role === 'faculty' ? Colors.faculty : Colors.student);
    
    const [stats, setStats] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [highReliability, setHighReliability] = useState(true);

    const pulse = useSharedValue(1);

    const loadProfileAndStats = useCallback(async () => {
        try {
            const userStr = await SecureStore.getItemAsync('user');
            if (userStr) setUser(JSON.parse(userStr));

            const token = await SecureStore.getItemAsync('token');
            if (token) {
                const res = await fetchWithTimeout(`/api/dashboard/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok && res.data) {
                    setStats(res.data);
                }
            }

            const hiRelStr = await AsyncStorage.getItem('high_reliability_mode');
            setHighReliability(hiRelStr !== 'false'); // true by default

        } catch (e) {
            console.error('Failed to load profile stats', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadProfileAndStats();
        pulse.value = withRepeat(withTiming(1.05, { duration: 1500 }), -1, true);
    }, [loadProfileAndStats]);

    const onRefresh = () => {
        setRefreshing(true);
        loadProfileAndStats();
    };

    const avatarStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
        borderColor: roleColor,
        shadowColor: roleColor,
    }));

    const toggleHighReliability = async () => {
        const newVal = !highReliability;
        setHighReliability(newVal);
        await AsyncStorage.setItem('high_reliability_mode', newVal.toString());
        
        // Immediate UI feedback
        const hour = new Date().getHours();
        if (newVal && hour >= 8 && hour < 17) {
            startAstraService();
        } else {
            stopAstraService();
        }
    };

    const handleLogout = async () => {
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('user');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        navigation.reset({
            index: 0,
            routes: [{ name: 'RoleSelection' }],
        });
    };

    // Extract badges dynamically from the backend dashboard stats response
    const getUnlockedBadges = () => {
        if (!stats || !stats.badges) return [];
        return stats.badges.map(b => b.id);
    };

    const unlockedBadges = getUnlockedBadges();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
            <LinearGradient colors={Colors.gradientBg} style={StyleSheet.absoluteFill} />
            
            <View style={[styles.ambientTop, { backgroundColor: roleColor }]} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                {/* Profile Identity */}
                <View style={styles.profileSection}>
                    <Animated.View style={[styles.avatarWrapper, avatarStyle]}>
                        <LinearGradient colors={[roleColor, Colors.bg]} style={styles.avatarInner}>
                            <Text style={styles.avatarText}>{(user.name || 'S')[0].toUpperCase()}</Text>
                        </LinearGradient>
                    </Animated.View>
                    <Text style={styles.name}>{user.name}</Text>
                    
                    <View style={styles.badgeContainer}>
                        <View style={[styles.roleLabel, { backgroundColor: roleColor + '20' }]}>
                            <Text style={[styles.roleText, { color: roleColor }]}>{user.role?.toUpperCase()}</Text>
                        </View>
                        {user.programme && (
                            <View style={[styles.roleLabel, { backgroundColor: Colors.glass }]}>
                                <Text style={styles.roleText}>{user.programme} • SEC {user.section}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Academic Performance (Student only) */}
                {user.role === 'student' && stats && (
                    <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
                        <Text style={styles.sectionTitle}>Academic Performance</Text>
                        <View style={styles.statsCard}>
                            <View style={styles.statCol}>
                                <Text style={styles.statValue}>{stats.percentage}%</Text>
                                <Text style={styles.statLabel}>Attendance</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.statCol}>
                                <Text style={[styles.statValue, { color: Colors.gold }]}>{stats.points}</Text>
                                <Text style={styles.statLabel}>Points</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.statCol}>
                                <Text style={[styles.statValue, { color: Colors.primaryLight }]}>#{stats.rank}</Text>
                                <Text style={styles.statLabel}>Rank</Text>
                            </View>
                        </View>

                        {/* Recent Grades/Marks Mini-view */}
                        <TouchableOpacity 
                            style={styles.gradesCard}
                            onPress={() => navigation.navigate('Marks')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.gradesHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={styles.iconCircle}>
                                        <Ionicons name="school" size={16} color={Colors.primary} />
                                    </View>
                                    <Text style={styles.gradesTitle}>Current Semester Grades</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                            </View>
                            <View style={styles.gradesContent}>
                                <Text style={styles.gradesOverall}>0.0 CGPA</Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Achievements (Student only) */}
                {user.role === 'student' && (
                    <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
                        <Text style={styles.sectionTitle}>Achievements</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeScroll}>
                            {BADGES.map((badge, idx) => {
                                const isUnlocked = unlockedBadges.includes(badge.id);
                                return (
                                    <View key={idx} style={[styles.badgeItem, !isUnlocked && styles.badgeLocked]}>
                                        <View style={[styles.badgeIconBg, isUnlocked ? { backgroundColor: Colors.primaryGlass } : {}]}>
                                            <Text style={[styles.badgeEmoji, !isUnlocked && { opacity: 0.3 }]}>{badge.icon}</Text>
                                        </View>
                                        <Text style={styles.badgeTitle}>{badge.title}</Text>
                                        <Text style={styles.badgeDesc} numberOfLines={2}>{badge.desc}</Text>
                                        {!isUnlocked && <Ionicons name="lock-closed" size={12} color={Colors.textDisabled} style={styles.lockIcon} />}
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </Animated.View>
                )}

                {/* Personal Information */}
                <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Details</Text>
                    <View style={styles.detailsContainer}>
                        <DETAIL_ROW icon="wallet-outline" label="Roll Number" val={user.roll_number || 'N/A'} />
                        <DETAIL_ROW icon="mail-outline" label="Email Address" val={user.email || 'N/A'} />
                        <DETAIL_ROW icon="call-outline" label="Phone Number" val={user.phone || 'N/A'} />
                        <DETAIL_ROW icon="calendar-outline" label="Joined Date" val={user.created_at?.split('T')[0] || 'N/A'} isLast />
                    </View>
                </Animated.View>

                {/* Settings & Preferences */}
                <Animated.View entering={FadeInDown.delay(350)} style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <View style={styles.detailsContainer}>
                        <View style={[styles.detailRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                            <View style={styles.detailIcon}>
                                <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.detailLabel}>High Reliability Mode</Text>
                                <Text style={[styles.detailVal, { fontSize: 12, color: Colors.textMuted, marginTop: 2 }]}>
                                    Prevents OS from killing ASTRA notifications. Requires a persistent icon during college hours.
                                </Text>
                            </View>
                            <TouchableOpacity 
                                onPress={toggleHighReliability}
                                style={[
                                    styles.toggleTrack, 
                                    { backgroundColor: highReliability ? Colors.success : Colors.surfaceLight }
                                ]}
                            >
                                <View style={[styles.toggleThumb, highReliability ? styles.toggleThumbOn : styles.toggleThumbOff]} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>

                {/* Actions */}
                <Animated.View entering={FadeInDown.delay(400)} style={styles.actionSection}>
                    <TouchableOpacity 
                        style={styles.menuBtn} 
                        onPress={() => navigation.navigate('Feedback')}
                    >
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.textPrimary} />
                        <Text style={styles.menuText}>Give Feedback</Text>
                        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </Animated.View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>ASTRA Platform v2.0.0</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const DETAIL_ROW = ({ icon, label, val, isLast }) => (
    <View style={[styles.detailRow, !isLast && styles.detailRowBorder]}>
        <View style={styles.detailLeft}>
            <Ionicons name={icon} size={18} color={Colors.textMuted} />
            <Text style={styles.detailLab}>{label}</Text>
        </View>
        <Text style={styles.detailVal}>{val}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    ambientTop: { position: 'absolute', width: width, height: 200, top: -100, opacity: 0.1, blurRadius: 80, borderRadius: 100 },
    
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 15, flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontFamily: 'Tanker', fontSize: 28, color: '#fff', letterSpacing: 0.5 },

    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    
    profileSection: { alignItems: 'center', marginVertical: 30 },
    avatarWrapper: { width: 100, height: 100, borderRadius: 32, borderWidth: 2, padding: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg, elevation: 10, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    avatarInner: { width: '100%', height: '100%', borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontFamily: 'Tanker', fontSize: 40, color: '#fff' },
    name: { fontFamily: 'Tanker', fontSize: 26, marginTop: 16, color: '#fff', letterSpacing: 0.5 },
    
    badgeContainer: { flexDirection: 'row', gap: 8, marginTop: 10 },
    roleLabel: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    roleText: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: Colors.textSecondary },

    section: { marginBottom: 30 },
    sectionTitle: { fontFamily: 'Satoshi-Bold', fontSize: 13, color: Colors.textMuted, marginBottom: 12, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 },
    
    statsCard: { flexDirection: 'row', backgroundColor: Colors.bgCard, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
    statCol: { flex: 1, alignItems: 'center' },
    statValue: { fontFamily: 'Tanker', fontSize: 28, color: '#fff' },
    statLabel: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: Colors.textMuted, marginTop: 4 },
    divider: { width: 1, height: '80%', backgroundColor: Colors.border, alignSelf: 'center' },

    gradesCard: { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: Colors.border },
    gradesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    iconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryGlass, justifyContent: 'center', alignItems: 'center' },
    gradesTitle: { fontFamily: 'Satoshi-Bold', fontSize: 14, color: '#fff' },
    gradesContent: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingLeft: 40 },
    gradesOverall: { fontFamily: 'Tanker', fontSize: 24, color: '#fff' },
    trendTag: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.successGlass, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    trendText: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: Colors.success },

    badgeScroll: { gap: 12 },
    badgeItem: { width: 110, backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
    badgeLocked: { opacity: 0.6, backgroundColor: Colors.glass },
    badgeIconBg: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.glass, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    badgeEmoji: { fontSize: 20 },
    badgeTitle: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: '#fff', textAlign: 'center', marginBottom: 4 },
    badgeDesc: { fontFamily: 'Satoshi-Medium', fontSize: 9, color: Colors.textMuted, textAlign: 'center' },
    lockIcon: { position: 'absolute', top: 10, right: 10 },

    detailsContainer: { backgroundColor: Colors.bgCard, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
    detailRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    detailLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    detailLab: { fontFamily: 'Satoshi-Medium', fontSize: 13, color: Colors.textSecondary },
    detailVal: { fontFamily: 'Satoshi-Bold', fontSize: 13, color: '#fff' },

    actionSection: { gap: 12, marginTop: 10 },
    menuBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
    menuText: { flex: 1, fontFamily: 'Satoshi-Bold', fontSize: 14, color: '#fff', marginLeft: 12 },
    
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.dangerGlass, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.danger + '40', marginTop: 10 },
    logoutText: { fontFamily: 'Satoshi-Bold', fontSize: 14, color: Colors.danger, marginLeft: 8 },

    footer: { marginTop: 40, alignItems: 'center' },
    footerText: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: Colors.textMuted }
});
