import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Animated, Image, ImageBackground } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE } from '../api/config';
import { Ionicons } from '@expo/vector-icons';
import SilentPingComponent from '../components/SilentPingComponent';

const colors = {
    bg0: '#0f172a', surf: 'rgba(255, 255, 255, 0.05)',
    hot: '#3b82f6', green: '#10b981', oran: '#ff8a1f', cyan: '#0ea5e9', purp: '#6366f1', border: 'rgba(255, 255, 255, 0.12)'
};

export default function DashboardScreen({ route, navigation }) {
    const { user } = route.params || { user: { name: 'Student', role: 'student' } };
    const role = user.role || 'student';
    const roleColor = role === 'admin' ? colors.cyan : role === 'faculty' ? colors.purp : colors.hot;

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeAlert, setActiveAlert] = useState(null); // { title: string, msg: string, timer: number }

    const loadDashboard = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/dashboard/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) {
            console.log('Dashboard stats err:', e);
        }
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        loadDashboard();

        // Removed simulated Silent Ping demo
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadDashboard();
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={roleColor} />
            </View>
        );
    }

    // --- STUDENT VIEW ---
    if (role === 'student') {
        return (
            <View style={styles.container}>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={roleColor} />}
                >
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
                            <View>
                                <View style={styles.liveIndicator}>
                                    <View style={styles.liveDot} />
                                    <Text style={styles.liveText}>LIVE SESSION ACTIVE</Text>
                                </View>
                                <Text style={styles.userName}>{user.name.toUpperCase()}</Text>
                            </View>
                        </View>
                        <View style={[styles.roleBadge, { backgroundColor: roleColor + '20', borderColor: roleColor }]}>
                            <Text style={[styles.roleBadgeText, { color: roleColor }]}>{role.toUpperCase()}</Text>
                        </View>
                    </View>

                {activeAlert && (
                    <TouchableOpacity
                        style={styles.urgentAlertOverlay}
                        onPress={() => {
                            if (role === 'faculty' || role === 'admin') {
                                navigation.navigate('Monitor', { classId: activeAlert.classId });
                            } else {
                                navigation.navigate('Attendance', { user, prefilledClass: activeAlert.classId });
                            }
                        }}
                    >
                        <LinearGradient colors={['#ff3b5c', '#ff6b35']} style={styles.urgentAlertBox}>
                            <View style={styles.alertHeader}>
                                <Ionicons name="warning" size={24} color="#fff" />
                                <Text style={styles.urgentTitle}>URGENT VERIFICATION</Text>
                            </View>
                            <Text style={styles.urgentMsg}>{activeAlert.msg}</Text>
                            <View style={styles.timerBar}>
                                <Animated.View style={[styles.timerFill, { width: '100%' }]} />
                            </View>
                            <Text style={styles.tapToVerify}>TAP TO VERIFY NOW</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                <View style={styles.mainStatsContainer}>
                    <LinearGradient colors={[roleColor + '40', 'transparent']} style={styles.statsCircle}>
                        <Text style={styles.percentageText}>{stats?.percentage || '0'}%</Text>
                        <Text style={styles.percentageLabel}>CHALLENGE SCORE</Text>
                        <View style={styles.streakBadge}>
                            <Text style={styles.streakText}>🔥 {stats?.streak || '0'} DAY STREAK</Text>
                        </View>
                    </LinearGradient>

                    <View style={styles.gamificationRow}>
                        <View style={styles.gameCard}>
                            <Text style={styles.gameEmoji}>⭐</Text>
                            <View>
                                <Text style={styles.gameVal}>{stats?.points ?? '0'}</Text>
                                <Text style={styles.gameLab}>POINTS</Text>
                            </View>
                        </View>
                        <View style={styles.gameCard}>
                            <Text style={styles.gameEmoji}>🏆</Text>
                            <View>
                                <Text style={[styles.gameVal, { color: colors.oran }]}>#{stats?.rank ?? '--'}</Text>
                                <Text style={styles.gameLab}>RANK</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.statsGrid}>
                        <View style={styles.smallStat}>
                            <Text style={styles.smallStatVal}>{stats?.present_count || '0'}</Text>
                            <Text style={styles.smallStatLab}>PRESENT</Text>
                        </View>
                        <View style={styles.smallStat}>
                            <Text style={styles.smallStatVal}>{stats?.today_count || '0'}</Text>
                            <Text style={styles.smallStatLab}>TODAY</Text>
                        </View>
                        <View style={styles.smallStat}>
                            <Text style={styles.smallStatVal}>{stats?.total_classes || '0'}</Text>
                            <Text style={styles.smallStatLab}>TOTAL</Text>
                        </View>
                    </View>
                </View>
                
                {stats?.predictive_insights && (
                    <View style={styles.aiInsightsBox}>
                        <LinearGradient colors={['rgba(14, 165, 233, 0.1)', 'transparent']} style={styles.aiInsightsGradient} />
                        <View style={styles.aiHeader}>
                            <Ionicons name="sparkles" size={18} color={colors.cyan} />
                            <Text style={styles.aiTitle}>ASTRA V2 PREDICTIVE INSIGHTS</Text>
                        </View>
                        
                        <View style={styles.insightRow}>
                            <View style={styles.insightItem}>
                                <Text style={styles.insightLabel}>PREDICTED MARKS</Text>
                                <Text style={styles.insightVal}>{stats.predictive_insights.predicted_marks?.predicted_marks || '--'} / 100</Text>
                                <Text style={styles.insightSub}>Confidence: {Math.round((stats.predictive_insights.predicted_marks?.confidence_score || 0) * 100)}%</Text>
                            </View>
                            <View style={[styles.statusLine, { height: 40, marginHorizontal: 15 }]} />
                            <View style={styles.insightItem}>
                                <Text style={styles.insightLabel}>BEHAVIORAL DRIFT</Text>
                                <Text style={[styles.insightVal, { color: stats.predictive_insights.drift_analysis?.drift_risk === 'Critical' ? colors.hot : colors.green }]}>
                                    {stats.predictive_insights.drift_analysis?.drift_risk || 'Stable'}
                                </Text>
                                <Text style={styles.insightSub}>{stats.predictive_insights.drift_analysis?.message || 'Pattern is stable'}</Text>
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.milestoneBox}>
                    <View style={styles.milestoneHeader}>
                        <Text style={styles.milestoneTag}>NEXT MILESTONE</Text>
                        <Text style={styles.milestoneTitle}>🎯 30-Day Streak</Text>
                    </View>
                    <View style={styles.milestoneBarOuter}>
                        <LinearGradient
                            colors={[colors.oran, colors.green]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={[styles.milestoneBarFill, { width: '40%' }]}
                        />
                    </View>
                    <Text style={styles.milestoneSub}>12 / 30 days complete · 18 days away</Text>
                </View>

                <Text style={styles.sectionTitle}>ASTRA ECOSYSTEM & COMMERCE</Text>
                <View style={styles.advancedGrid}>
                    <TouchableOpacity style={styles.advCard} onPress={() => navigation.navigate('AIChatbot', { user })}>
                        <LinearGradient colors={[colors.cyan + '40', 'transparent']} style={StyleSheet.absoluteFill} />
                        <Ionicons name="hardware-chip" size={28} color={colors.cyan} />
                        <Text style={styles.advTitle}>AI ASSISTANT</Text>
                        <Text style={styles.advDesc}>Chat with Astra Intel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.advCard} onPress={() => navigation.navigate('Marketplace', { user })}>
                        <LinearGradient colors={[colors.purp + '40', 'transparent']} style={StyleSheet.absoluteFill} />
                        <Ionicons name="cart-outline" size={28} color={colors.purp} />
                        <Text style={styles.advTitle}>MARKETPLACE</Text>
                        <Text style={styles.advDesc}>Peer Trading Hub</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>SUBJECT BREAKDOWN</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Attendance', { user })}>
                        <Text style={styles.sectionLink}>View All →</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.subjectGrid}>
                    {(stats?.subjects || []).map((sub, i) => (
                        <View key={i} style={styles.subjectCard}>
                            <View style={styles.subTop}>
                                <Text style={styles.subCode}>{sub.code}</Text>
                                <Text style={[styles.subPct, { color: sub.pct < 75 ? colors.hot : colors.green }]}>{sub.pct}%</Text>
                            </View>
                            <Text style={styles.subName} numberOfLines={1}>{sub.name}</Text>
                            <View style={styles.subBarOuter}>
                                <View style={[styles.subBarFill, { width: `${sub.pct}%`, backgroundColor: sub.color }]} />
                            </View>
                        </View>
                    ))}
                    {!stats?.subjects?.length && !loading && (
                        <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', width: '100%', marginTop: 10 }}>
                            No subjects found for your profile.
                        </Text>
                    )}
                </View>

                <Text style={styles.sectionTitle}>ATTENDANCE HEATMAP (30 DAYS)</Text>
                <View style={styles.heatmapBox}>
                    {[...Array(4)].map((_, r) => (
                        <View key={r} style={styles.heatmapRow}>
                            {[...Array(7)].map((_, c) => {
                                const index = r * 7 + c;
                                // Simple logic: Light up past days if percentage is decent
                                // For a full system, we would map an array of dates from backend
                                const active = index < 25 && (stats?.percentage > 70 ? index % 3 !== 0 : index % 2 !== 0);
                                return (
                                    <View
                                        key={c}
                                        style={[
                                            styles.heatmapBlock,
                                            active && { backgroundColor: roleColor, opacity: 0.6 }
                                        ]}
                                    />
                                );
                            })}
                        </View>
                    ))}
                </View>

                <TouchableOpacity style={[styles.verifyTrigger, { borderColor: roleColor }]} onPress={() => navigation.navigate('Attendance', { user })}>
                    <LinearGradient colors={[roleColor + '30', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    <Text style={styles.verifyIcon}>⚡</Text>
                    <View>
                        <Text style={[styles.verifyText, { color: roleColor }]}>VERIFY PRESENCE</Text>
                        <Text style={styles.verifySub}>Tap to broadcast GPS & Biometrics</Text>
                    </View>
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
                <View style={styles.activityBox}>
                    {(!stats?.recent || stats.recent.length === 0) ? (
                        <Text style={[styles.activityName, { padding: 10, opacity: 0.5, textAlign: 'center' }]}>No recent activity yet.</Text>
                    ) : (
                        stats.recent.map(item => (
                            <View key={item.id} style={styles.activityItem}>
                                <View style={[styles.statusDot, { backgroundColor: item.status === 'present' ? colors.green : colors.oran }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.activityName}>{item.name}</Text>
                                    <Text style={styles.activityTime}>{item.time}</Text>
                                </View>
                                <Text style={[styles.activityStatus, { color: item.status === 'present' ? colors.green : colors.oran }]}>
                                    {item.status.toUpperCase()}
                                </Text>
                            </View>
                        ))
                    )}
                </View>

                <View style={styles.alertBox}>
                    <Text style={styles.alertTitle}>SYSTEM ALERTS</Text>
                    {stats?.percentage < 75 && (
                        <View style={styles.alertItem}>
                            <Text style={styles.alertIcon}>⚠️</Text>
                            <Text style={styles.alertMsg}>Attendance below threshold (75%). Protocol breach imminent.</Text>
                        </View>
                    )}
                    <View style={styles.alertItem}>
                        <Text style={styles.alertIcon}>📡</Text>
                        <Text style={styles.alertMsg}>Secure connection established with Campus Hub.</Text>
                    </View>

                </View>
                </ScrollView>
            </View>
        );
    }

    // --- FACULTY VIEW ---
    if (role === 'faculty') {
        return (
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <View>
                        <View style={styles.liveIndicator}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>LIVE SESSION MONITORING</Text>
                        </View>
                        <Text style={styles.userName}>{user.name.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: roleColor + '20', borderColor: roleColor }]}>
                        <Text style={[styles.roleBadgeText, { color: roleColor }]}>STAFF</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.facultyQrBar} onPress={() => navigation.navigate('QR', { user })}>
                    <Ionicons name="camera-outline" size={18} color={colors.purp} />
                    <Text style={styles.facultyQrText}>LAUNCH BACKUP SCANNER</Text>
                </TouchableOpacity>

                <View style={[styles.activeClassCard, { borderColor: roleColor }]}>
                    <Text style={styles.activeLabel}>CURRENTLY TEACHING</Text>
                    <Text style={styles.activeSubject}>Advanced Cyber-Sec (CS-402)</Text>
                    <View style={styles.activeStats}>
                        <View>
                            <Text style={styles.activeVal}>42/45</Text>
                            <Text style={styles.activeSub}>PRESENT</Text>
                        </View>
                        <View style={[styles.statusLine, { backgroundColor: roleColor }]} />
                        <View>
                            <Text style={styles.activeVal}>03</Text>
                            <Text style={styles.activeSub}>LATE</Text>
                        </View>
                    </View>

                    <View style={{ marginTop: 20 }}>
                        <SilentPingComponent
                            className="Advanced Cyber-Sec"
                            onPingComplete={() => console.log('Ping complete')}
                        />
                    </View>
                </View>

                <Text style={styles.sectionTitle}>STUDENT TRACKER (QUICK ACCESS)</Text>
                <View style={styles.studentGrid}>
                    <TouchableOpacity style={styles.studentMini} onPress={() => navigation.navigate('Tracker')}>
                        <Ionicons name="search" size={24} color={colors.cyan} />
                        <Text style={[styles.studentId, { marginTop: 6 }]}>OPEN TRACKER</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.controlCenter}>
                    <TouchableOpacity style={[styles.controlBtn, { backgroundColor: roleColor }]}>
                        <Text style={styles.btnText}>MARK ATTENDANCE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.controlBtn, { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border }]}>
                        <Text style={styles.btnText}>REPORT BREACH</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView >
        );
    }

    // --- ADMIN VIEW ---
    if (role === 'admin') {
        return (
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <View>
                        <View style={styles.liveIndicator}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>SYSTEM HEALTH: OPTIMAL</Text>
                        </View>
                        <Text style={styles.userName}>CAMPUS MASTER</Text>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: roleColor + '20', borderColor: roleColor }]}>
                        <Text style={[styles.roleBadgeText, { color: roleColor }]}>ADMIN</Text>
                    </View>
                </View>

                <View style={styles.adminStatsRow}>
                    <View style={styles.adminStatCard}>
                        <Text style={styles.adminStatVal}>94%</Text>
                        <Text style={styles.adminStatLab}>CAMPUS LOAD</Text>
                    </View>
                    <View style={styles.adminStatCard}>
                        <Text style={styles.adminStatVal}>12</Text>
                        <Text style={[styles.adminStatLab, { color: colors.oran }]}>ACTIVE ALERTS</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>SECURITY FEED</Text>
                <View style={styles.alertFeed}>
                    <View style={styles.alertItem}>
                        <Text style={styles.alertIcon}>🚨</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.alertMsg}>Zone 4: Geofence breach detected (Unknown ID)</Text>
                            <Text style={styles.alertTime}>Just now</Text>
                        </View>
                    </View>
                    <View style={styles.alertItem}>
                        <Text style={styles.alertIcon}>⚠️</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.alertMsg}>Server Load: Database latency spikes (80ms)</Text>
                            <Text style={styles.alertTime}>2m ago</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity style={[styles.btn, { margin: 24, backgroundColor: roleColor }]}>
                    <Text style={styles.btnText}>SYSTEM OVERVIEW</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    }
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg0 },
    logo: { width: 40, height: 40, borderRadius: 10, marginRight: 12 },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    centerContainer: { flex: 1, backgroundColor: colors.bg0, justifyContent: 'center', alignItems: 'center', padding: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: 'rgba(7,5,12,0.6)' },
    welcomeText: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 },
    userName: { fontFamily: 'Tanker', fontSize: 32, color: '#fff', letterSpacing: 1 },
    roleBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
    roleBadgeText: { fontFamily: 'Satoshi-Bold', fontSize: 10, letterSpacing: 1 },
    mainStatsContainer: { alignItems: 'center', marginTop: 10 },
    statsCircle: { width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    percentageText: { fontFamily: 'Tanker', fontSize: 62, color: '#fff' },
    percentageLabel: { fontFamily: 'Satoshi-Bold', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 },
    streakBadge: { marginTop: 15, backgroundColor: 'rgba(255, 138, 31, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 138, 31, 0.3)' },
    streakText: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: '#ff8a1f', letterSpacing: 1 },
    statsGrid: { flexDirection: 'row', gap: 20, marginTop: 30, paddingHorizontal: 20 },
    smallStat: { flex: 1, alignItems: 'center', backgroundColor: colors.surf, paddingVertical: 15, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
    smallStatVal: { fontFamily: 'Tanker', fontSize: 24, color: '#fff' },
    smallStatLab: { fontFamily: 'Satoshi-Bold', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 },
    sectionTitle: { fontFamily: 'Tanker', fontSize: 16, color: '#fff', letterSpacing: 1, marginLeft: 24, marginTop: 40, marginBottom: 16 },
    heatmapBox: { backgroundColor: colors.surf, marginHorizontal: 24, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border },
    heatmapRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    heatmapBlock: { width: 30, height: 30, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.03)' },
    verifyTrigger: { flexDirection: 'row', alignItems: 'center', gap: 16, marginHorizontal: 24, padding: 24, borderRadius: 24, borderWidth: 1, marginTop: 24, overflow: 'hidden' },
    verifyIcon: { fontSize: 32 },
    verifyText: { fontFamily: 'Tanker', fontSize: 20, letterSpacing: 1 },
    verifySub: { fontFamily: 'Satoshi', fontSize: 11, color: 'rgba(255,255,255,0.4)' },
    activityBox: { marginHorizontal: 24, backgroundColor: colors.surf, borderRadius: 20, padding: 10, borderWidth: 1, borderColor: colors.border },
    activityItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    activityName: { fontFamily: 'Satoshi-Bold', fontSize: 13, color: '#fff' },
    activityTime: { fontFamily: 'Satoshi', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
    activityStatus: { fontFamily: 'Satoshi-Bold', fontSize: 10, letterSpacing: 1 },
    alertBox: { marginHorizontal: 24, marginTop: 40 },
    alertTitle: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 16 },
    alertItem: { flexDirection: 'row', gap: 12, backgroundColor: colors.surf, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    alertIcon: { fontSize: 16 },
    alertMsg: { flex: 1, fontFamily: 'Satoshi', fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 18 },
    btn: { paddingHorizontal: 30, paddingVertical: 18, borderRadius: 16 },
    btnText: { fontFamily: 'Tanker', fontSize: 16, color: '#fff', letterSpacing: 1 },

    // Faculty Styles
    activeClassCard: { backgroundColor: colors.surf, margin: 24, borderRadius: 24, padding: 24, borderWidth: 2 },
    activeLabel: { fontFamily: 'Satoshi-Bold', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 8 },
    activeSubject: { fontFamily: 'Tanker', fontSize: 24, color: '#fff', marginBottom: 20 },
    activeStats: { flexDirection: 'row', alignItems: 'center', gap: 24 },
    activeVal: { fontFamily: 'Tanker', fontSize: 28, color: '#fff' },
    activeSub: { fontFamily: 'Satoshi-Bold', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 },
    statusLine: { width: 2, height: 30, opacity: 0.3 },
    studentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 24 },
    studentMini: { width: '30%', backgroundColor: colors.surf, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    studentDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 6 },
    studentId: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: '#fff', opacity: 0.5 },
    controlCenter: { flexDirection: 'row', gap: 12, padding: 24 },
    controlBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },

    // Admin Styles
    adminStatsRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 24, marginTop: 10 },
    adminStatCard: { flex: 1, backgroundColor: colors.surf, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    adminStatVal: { fontFamily: 'Tanker', fontSize: 32, color: '#fff' },
    adminStatLab: { fontFamily: 'Satoshi-Bold', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 4 },
    alertFeed: { paddingHorizontal: 24 },
    alertTime: { fontFamily: 'Satoshi', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 },

    liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
    liveText: { fontFamily: 'Satoshi-Bold', fontSize: 9, color: colors.green, letterSpacing: 1 },

    gamificationRow: { flexDirection: 'row', gap: 12, marginTop: 20, paddingHorizontal: 24 },
    gameCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surf, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
    gameEmoji: { fontSize: 20 },
    gameVal: { fontFamily: 'Tanker', fontSize: 18, color: '#fff' },
    gameLab: { fontFamily: 'Satoshi-Bold', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 },

    milestoneBox: { marginHorizontal: 24, marginTop: 24, backgroundColor: 'rgba(0, 255, 179, 0.03)', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0, 255, 179, 0.15)' },
    milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    milestoneTag: { fontFamily: 'Satoshi-Bold', fontSize: 8, color: colors.green, letterSpacing: 1.5 },
    milestoneTitle: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: '#fff' },
    milestoneBarOuter: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
    milestoneBarFill: { height: '100%', borderRadius: 3 },
    milestoneSub: { fontFamily: 'Satoshi', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 8 },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginTop: 40, marginBottom: 16 },
    sectionLink: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: colors.cyan },

    subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 24 },
    subjectCard: { width: '48%', backgroundColor: colors.surf, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border },
    subTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    subCode: { fontFamily: 'Satoshi-Bold', fontSize: 9, color: 'rgba(255,255,255,0.3)' },
    subPct: { fontFamily: 'Tanker', fontSize: 16 },
    subName: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: '#fff', marginBottom: 12 },
    subBarOuter: { height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' },
    subBarFill: { height: '100%', borderRadius: 2 },

    urgentAlertOverlay: { marginHorizontal: 24, marginBottom: 20 },
    urgentAlertBox: { padding: 20, borderRadius: 20, elevation: 10, shadowColor: '#ff3b5c', shadowOpacity: 0.5, shadowRadius: 10 },
    alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    urgentTitle: { color: '#fff', fontFamily: 'Tanker', fontSize: 18, letterSpacing: 1 },
    urgentMsg: { color: '#fff', fontSize: 12, opacity: 0.9, marginBottom: 15, lineHeight: 18 },
    timerBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
    timerFill: { height: '100%', backgroundColor: '#fff' },
    tapToVerify: { color: '#fff', fontFamily: 'Satoshi-Bold', fontSize: 10, textAlign: 'center', letterSpacing: 1 },

    emergencyQr: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.hot + '10', borderWidth: 1, borderColor: colors.hot + '30' },
    emergencyText: { color: colors.hot, fontFamily: 'Satoshi-Bold', fontSize: 10, letterSpacing: 1 },

    facultyQrBar: { marginHorizontal: 24, marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 15, borderRadius: 15, backgroundColor: colors.purp + '10', borderWidth: 1, borderColor: colors.purp + '30' },
    facultyQrText: { color: colors.purp, fontFamily: 'Tanker', fontSize: 14, letterSpacing: 1 },

    advancedGrid: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingBottom: 10 },
    advCard: { flex: 1, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.surf },
    advTitle: { fontFamily: 'Tanker', fontSize: 18, color: '#fff', letterSpacing: 1, marginTop: 12 },
    advDesc: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4, letterSpacing: 1 },
    
    // AI Insights Styles
    aiInsightsBox: { marginHorizontal: 24, marginTop: 24, backgroundColor: colors.surf, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(14, 165, 233, 0.3)', overflow: 'hidden' },
    aiInsightsGradient: { ...StyleSheet.absoluteFillObject },
    aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
    aiTitle: { fontFamily: 'Tanker', fontSize: 14, color: colors.cyan, letterSpacing: 1 },
    insightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    insightItem: { flex: 1 },
    insightLabel: { fontFamily: 'Satoshi-Bold', fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, marginBottom: 4 },
    insightVal: { fontFamily: 'Tanker', fontSize: 20, color: '#fff' },
    insightSub: { fontFamily: 'Satoshi', fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }
});
