import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    Dimensions,
    Platform,
    LayoutAnimation,
    UIManager,
    StatusBar
} from 'react-native';
import * as SecureStore from '../utils/storage';
import LinearGradient from 'react-native-linear-gradient';
// // import { BlurView } from '@react-native-community/blur'; // Removed for universal stability
import Ionicons from 'react-native-vector-icons/Ionicons';
import { API_BASE } from '../api/config';
import { fetchWithTimeout } from '../utils/api';
import AstraLottie from '../components/AstraLottie';
import WeatherWidget from '../components/WeatherWidget';

const { width } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const colors = {
    bg: '#020617',
    glass: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(255, 255, 255, 0.08)',
    textDim: 'rgba(255, 255, 255, 0.4)',
    neonBlue: '#00f2ff',
    neonPink: '#ff00e5',
    neonGreen: '#00ffaa',
    neonPurple: '#bf00ff',
    hot: '#ff3d71',
    admin: '#00f2ff',
    faculty: '#bf00ff',
    student: '#0066ff'
};

export default function DashboardScreen({ route, navigation }) {
    const { user } = route.params || { user: { name: 'Institutional User', role: 'student' } };
    const role = user.role || 'student';
    const roleColor = role === 'admin' ? colors.admin : role === 'faculty' ? colors.faculty : colors.student;

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const loadDashboard = useCallback(async () => {
        setError(null);
        try {
            const token = await SecureStore.getItemAsync('token');
            if (!token) {
                navigation.replace('Auth');
                return;
            }
            const res = await fetchWithTimeout(`/api/dashboard/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.status === 401) {
                // fetchWithTimeout already clears the token on 401
                navigation.replace('Auth');
                return;
            }

            if (res.ok && res.data) {
                setStats(res.data);
            } else {
                setError(res.data?.error || 'FAILED_TO_LOAD_STATS');
            }
        } catch (e) {
            setError('NETWORK_FAILURE');
            console.error('Dashboard Load Error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [navigation]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const onRefresh = () => {
        setRefreshing(true);
        loadDashboard();
    };

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />
                <AstraLottie type="loading" size={200} />
                <Text style={styles.loadingPulseText}>SYNCHRONIZING_CORE...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.loaderContainer}>
                <LinearGradient colors={['#020617', '#1e293b']} style={StyleSheet.absoluteFill} />
                <AstraLottie type="error" size={180} />
                <Text style={{ color: '#fff', marginTop: 20, fontFamily: 'Satoshi-Bold' }}>
                    {error === 'Invalid token' ? 'SESSION_EXPIRED' : 'CONNECTION_LOST'}
                </Text>
                <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 5 }}>
                    {error === 'Invalid token' ? 'Your identity link has expired. Please re-authenticate.' : error}
                </Text>
                <TouchableOpacity 
                    style={[styles.toolCard, { width: 180, height: 50, marginTop: 30, borderColor: colors.neonBlue }]} 
                    onPress={error === 'Invalid token' ? () => navigation.replace('Auth') : loadDashboard}
                >
                    <Text style={{ color: colors.neonBlue, fontFamily: 'Tanker' }}>
                        {error === 'Invalid token' ? 'RE-AUTHENTICATE' : 'RETRY_LINK'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    const calculateBunkStrategy = (p, t) => {
        const target = 0.75;
        if (!t || t === 0) return { safe: 0, needed: 0, status: 'INSUFFICIENT_DATA' };
        const currentPct = p / t;

        if (currentPct >= target) {
            const safe = Math.floor(p / target - t);
            return { safe: Math.max(0, safe), needed: 0, status: 'SAFE_ZONE' };
        } else {
            const needed = Math.ceil((target * t - p) / (1 - target));
            return { safe: 0, needed: Math.max(0, needed), status: 'RECOVERY_PROTOCOL' };
        }
    };

    const renderStudentView = () => {
        const strategy = calculateBunkStrategy(stats?.present_count || 0, stats?.total_sessions || stats?.total || 0);
        return (
            <>
            <View style={styles.ringHub}>
                <View style={styles.circleOuter}>
                    <LinearGradient colors={[roleColor + '40', 'transparent']} style={styles.glowRing} />
                    <View style={styles.statsInner}>
                        <Text style={styles.pctText}>{stats?.percentage || '0'}%</Text>
                        <Text style={styles.pctLabel}>INSTITUTIONAL SCORE</Text>
                    </View>
                </View>
            </View>

            <View style={styles.quickGrid}>
                <View style={[styles.gameGlass, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                    <Text style={styles.gameSymbol}>⚡</Text>
                    <View>
                        <Text style={styles.gameVal}>{stats?.points || '0'}</Text>
                        <Text style={styles.gameLab}>NODAL_POINTS</Text>
                    </View>
                </View>
                <View style={[styles.gameGlass, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                    <Text style={[styles.gameSymbol, { color: colors.neonPink }]}>🏆</Text>
                    <View>
                        <Text style={[styles.gameVal, { color: colors.neonPink }]}>#{stats?.rank || '--'}</Text>
                        <Text style={styles.gameLab}>TIER_RANK</Text>
                    </View>
                </View>
            </View>

            <View style={styles.bunkModule}>
                <View style={[styles.bunkGlass, { backgroundColor: 'rgba(2, 6, 23, 0.7)' }]}>
                    <View style={styles.bunkHeader}>
                        <Ionicons name="calculator-outline" size={16} color={colors.neonGreen} />
                        <Text style={styles.bunkTitle}>BUNK_CALC_V2.0</Text>
                    </View>
                    <View style={styles.bunkStats}>
                        <View style={styles.bunkStat}>
                            <Text style={[styles.bunkVal, strategy.status === 'SAFE_ZONE' && { color: colors.neonGreen }]}>
                                {strategy.safe}
                            </Text>
                            <Text style={styles.bunkLab}>SAFE_BUNKS</Text>
                        </View>
                        <View style={[styles.vLine, { backgroundColor: roleColor }]} />
                        <View style={styles.bunkStat}>
                            <Text style={[styles.bunkVal, strategy.status === 'RECOVERY_PROTOCOL' && { color: colors.hot }]}>
                                {strategy.needed}
                            </Text>
                            <Text style={styles.bunkLab}>RECOVERY_REQUIRED</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.aiModule}>
                <LinearGradient colors={['rgba(0, 242, 255, 0.1)', 'transparent']} style={styles.aiSurface}>
                    <View style={styles.aiHead}>
                        <Ionicons name="sparkles" size={18} color={colors.neonBlue} />
                        <Text style={styles.aiTitle}>ASTRA COGNITIVE INSIGHTS</Text>
                    </View>
                    <View style={styles.aiGrid}>
                        <View style={styles.aiItem}>
                            <Text style={styles.aiLab}>PREDICTED IMPACT</Text>
                            <Text style={styles.aiVal}>{(stats?.percentage - 0.4).toFixed(1)}%</Text>
                        </View>
                        <View style={styles.aiItem}>
                            <Text style={styles.aiLab}>STABILITY SCORE</Text>
                            <Text style={[styles.aiVal, { color: strategy.status === 'SAFE_ZONE' ? colors.neonGreen : colors.hot }]}>
                                {strategy.status === 'SAFE_ZONE' ? 'STABLE' : 'UNSTABLE'}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </View>

            <Text style={styles.secTitle}>INSTITUTIONAL TIMELINE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ribbonScroll}>
                {(stats?.daily_stats || []).map((day, i) => (
                    <View key={i} style={[styles.ribbonDay, day.isToday && styles.ribbonActive]}>
                        <Text style={styles.ribbonLabel}>{day.dayLabel}</Text>
                        <View style={[
                            styles.ribbonCircle,
                            day.status === 'present' ? styles.ribbonPresent : 
                            day.status === 'absent' ? styles.ribbonAbsent : null,
                            day.isToday && { borderColor: roleColor, backgroundColor: 'rgba(255,255,255,0.08)' }
                        ]}>
                            {day.status === 'present' || day.status === 'late' ? (
                                <Ionicons name="checkmark" size={14} color="#fff" />
                            ) : day.status === 'absent' ? (
                                <Ionicons name="close" size={14} color="#fff" />
                            ) : (
                                <View style={styles.ribbonDot} />
                            )}
                        </View>
                        <Text style={styles.ribbonNum}>{day.dayNum}</Text>
                    </View>
                ))}
            </ScrollView>
        </>
    );
};

    const renderFacultyView = () => (
        <>
            <View style={styles.staffHub}>
                <View style={[styles.activeSessionCard, { backgroundColor: 'rgba(2, 6, 23, 0.7)' }]}>
                    <Text style={styles.sessionLabel}>CURRENT LIVE SESSION</Text>
                    <Text style={styles.sessionTitle}>Advanced Cyber-Sec (CS-402)</Text>
                    <View style={styles.sessionGrid}>
                        <View style={styles.sessionStat}>
                            <Text style={styles.sessionVal}>42/45</Text>
                            <Text style={styles.sessionLab}>VERIFIED</Text>
                        </View>
                        <View style={[styles.vLine, { backgroundColor: roleColor }]} />
                        <View style={styles.sessionStat}>
                            <Text style={[styles.sessionVal, { color: colors.neonPink }]}>03</Text>
                            <Text style={styles.sessionLab}>PENDING</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.monitorTrigger} onPress={() => navigation.navigate('Monitor', { user })}>
                        <LinearGradient colors={[colors.neonPurple, '#8a00ff']} style={styles.monitorGradient}>
                            <Text style={styles.monitorText}>OPEN COMMAND CENTER</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.statsGrid}>
                <View style={[styles.statBox, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                    <Ionicons name="people-outline" size={24} color={colors.neonBlue} />
                    <Text style={styles.statBoxVal}>1,240</Text>
                    <Text style={styles.statBoxLab}>TOTAL STUDENTS</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                    <Ionicons name="calendar-outline" size={24} color={colors.neonGreen} />
                    <Text style={styles.statBoxVal}>06</Text>
                    <Text style={styles.statBoxLab}>SESSIONS TODAY</Text>
                </View>
            </View>
        </>
    );

    const renderAdminView = () => (
        <>
            <View style={styles.adminPulse}>
                <View style={[styles.pulseCard, { backgroundColor: 'rgba(0, 242, 255, 0.05)' }]}>
                    <View style={styles.pulseHeaderRow}>
                        <Text style={styles.pulseTitleText}>INSTITUTIONAL PULSE</Text>
                        <View style={styles.liveIndicator}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveLabel}>LIVE</Text>
                        </View>
                    </View>
                    <View style={styles.pulseGrid}>
                        <View style={styles.pulseItem}>
                            <Text style={styles.pulseVal}>{stats?.admin_data?.system_stats?.total_users || '...'}</Text>
                            <Text style={styles.pulseLab}>ACTIVE_NODES</Text>
                        </View>
                        <View style={styles.pulseItem}>
                            <Text style={[styles.pulseVal, { color: colors.neonGreen }]}>{stats?.admin_data?.system_stats?.today_att || '...'}</Text>
                            <Text style={styles.pulseLab}>PRESENCE_LOAD</Text>
                        </View>
                    </View>
                </View>
            </View>

            <Text style={styles.secTitle}>SECURITY FEED</Text>
            <View style={styles.securityFeed}>
                {(stats?.admin_data?.security_feed || []).slice(0, 3).map((log, i) => (
                    <View key={i} style={[styles.logCard, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                        <Ionicons name={log.severity === 'critical' ? "alert-circle" : "warning"} size={20} color={log.severity === 'critical' ? colors.hot : colors.neonPink} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.logMsg}>{log.user_name}: {log.type}</Text>
                            <Text style={styles.logTime}>{new Date(log.time).toLocaleTimeString()}</Text>
                        </View>
                    </View>
                ))}
            </View>

            <TouchableOpacity style={styles.toolsAction} onPress={() => navigation.navigate('Tools', { user })}>
                <LinearGradient colors={[colors.neonBlue, '#00b4ff']} style={styles.toolsGradient}>
                    <Text style={styles.toolsText}>MANAGE GLOBAL SYSTEMS</Text>
                </LinearGradient>
            </TouchableOpacity>
        </>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#1e293b']} style={StyleSheet.absoluteFill} />
            
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={roleColor} />}
            >
                {/* --- ULTRA HEADER --- */}
                <View style={styles.header}>
                    <View>
                        <View style={styles.roleTag}>
                            <View style={[styles.statusDot, { backgroundColor: roleColor }]} />
                            <Text style={[styles.roleLabel, { color: roleColor }]}>SESSION_AUTH: {(role || 'GUEST').toUpperCase()}</Text>
                        </View>
                        <Text style={styles.userName}>{(user.name || 'Astra User').toUpperCase()}</Text>
                    </View>
                    <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile', { user })}>
                        <View style={[styles.profileGlass, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                            <Ionicons name="person-outline" size={20} color="#fff" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* --- CONTEXTUAL DATA --- */}
                <WeatherWidget />
                {role === 'student' && renderStudentView()}
                {role === 'faculty' && renderFacultyView()}
                {role === 'admin' && renderAdminView()}

                {/* --- UNIVERSAL TOOLS --- */}
                <Text style={styles.secTitle}>SYSTEM_EXTENSIONS</Text>
                <View style={styles.toolsGrid}>
                    <TouchableOpacity style={styles.toolCard} onPress={() => navigation.navigate('AIChatbot', { user })}>
                        <View style={[styles.toolGlass, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                            <Ionicons name="chatbox-ellipses-outline" size={24} color={colors.neonBlue} />
                            <Text style={styles.toolTitle}>ASTRA AI</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolCard} onPress={() => navigation.navigate('Marketplace', { user })}>
                        <View style={[styles.toolGlass, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                            <Ionicons name="cube-outline" size={24} color={colors.neonPink} />
                            <Text style={styles.toolTitle}>MARKET</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* --- SYSTEM PULSE --- */}
                <View style={styles.pulseContainer}>
                    <Text style={styles.pulseHeader}>ENCRYPTED_PULSE_FEED</Text>
                    <View style={styles.pulseItem}>
                        <View style={[styles.pulseDot, { backgroundColor: colors.neonGreen }]} />
                        <Text style={styles.pulseText}>LINK_STATUS: HYPER-SECURE PROTOCOL ACTIVE</Text>
                    </View>
                    {role === 'student' && stats?.percentage < 75 && (
                        <View style={styles.pulseItem}>
                            <View style={[styles.pulseDot, { backgroundColor: colors.hot }]} />
                            <Text style={styles.pulseText}>THREAT_LEVEL: Attendance breach imminent.</Text>
                        </View>
                    )}
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    loadingPulseText: { color: colors.textDim, fontFamily: 'Satoshi-Black', fontSize: 10, letterSpacing: 3, marginTop: -20 },
    scrollContent: { paddingBottom: 100 },
    
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    roleTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    statusDot: { width: 5, height: 5, borderRadius: 2.5 },
    roleLabel: { fontFamily: 'Satoshi-Black', fontSize: 10, letterSpacing: 1 },
    userName: { fontFamily: 'Tanker', fontSize: 36, color: '#fff', letterSpacing: 1 },
    profileBtn: { borderRadius: 12, overflow: 'hidden' },
    profileGlass: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },

    // Student Specific
    ringHub: { alignItems: 'center', marginVertical: 20 },
    circleOuter: { width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },
    glowRing: { ...StyleSheet.absoluteFillObject, borderRadius: 120, opacity: 0.2 },
    statsInner: { alignItems: 'center' },
    pctText: { fontFamily: 'Tanker', fontSize: 84, color: '#fff' },
    pctLabel: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.textDim, letterSpacing: 2 },

    quickGrid: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 20 },
    gameGlass: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    gameSymbol: { fontSize: 24, color: '#fff' },
    gameVal: { fontFamily: 'Tanker', fontSize: 20, color: '#fff' },
    gameLab: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, letterSpacing: 1 },

    bunkModule: { paddingHorizontal: 24, marginBottom: 20 },
    bunkGlass: { padding: 20, borderRadius: 24, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    bunkHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
    bunkTitle: { fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.textDim, letterSpacing: 2 },
    bunkStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    bunkStat: { alignItems: 'center' },
    bunkVal: { fontFamily: 'Tanker', fontSize: 28, color: '#fff' },
    bunkLab: { fontFamily: 'Satoshi-Bold', fontSize: 8, color: colors.textDim, letterSpacing: 0.5 },
    vLine: { width: 2, height: 36, opacity: 0.3 },

    aiModule: { marginHorizontal: 24, marginBottom: 25 },
    aiSurface: { padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(0, 242, 255, 0.2)', overflow: 'hidden' },
    aiHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
    aiTitle: { fontFamily: 'Tanker', fontSize: 14, color: colors.neonBlue, letterSpacing: 1 },
    aiGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    aiItem: { gap: 4 },
    aiLab: { fontFamily: 'Satoshi-Black', fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5 },
    aiVal: { fontFamily: 'Tanker', fontSize: 18, color: '#fff' },

    // Faculty Specific
    staffHub: { paddingHorizontal: 24, marginBottom: 20 },
    activeSessionCard: { padding: 24, borderRadius: 32, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    sessionLabel: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.textDim, letterSpacing: 2, marginBottom: 10 },
    sessionTitle: { fontFamily: 'Tanker', fontSize: 28, color: '#fff', marginBottom: 20 },
    sessionGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    sessionStat: { alignItems: 'center' },
    sessionVal: { fontFamily: 'Tanker', fontSize: 32, color: '#fff' },
    sessionLab: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, letterSpacing: 1 },
    monitorTrigger: { height: 54, borderRadius: 16, overflow: 'hidden' },
    monitorGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    monitorText: { fontFamily: 'Tanker', fontSize: 15, color: '#fff', letterSpacing: 1 },

    statsGrid: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 20 },
    statBox: { flex: 1, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 10, overflow: 'hidden' },
    statBoxVal: { fontFamily: 'Tanker', fontSize: 24, color: '#fff' },
    statBoxLab: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, letterSpacing: 1 },

    // Admin Specific
    adminPulse: { paddingHorizontal: 24, marginBottom: 20 },
    pulseCard: { padding: 24, borderRadius: 32, borderWidth: 1, borderColor: colors.neonBlue + '40', overflow: 'hidden' },
    pulseHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    pulseTitleText: { fontFamily: 'Tanker', fontSize: 16, color: colors.neonBlue, letterSpacing: 1 },
    liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,255,170,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.neonGreen },
    liveLabel: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.neonGreen },
    pulseGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    pulseVal: { fontFamily: 'Tanker', fontSize: 42, color: '#fff' },
    pulseLab: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.textDim, letterSpacing: 2 },
    securityFeed: { paddingHorizontal: 24, gap: 12 },
    logCard: { flexDirection: 'row', items: 'center', gap: 15, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    logMsg: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: '#fff' },
    logTime: { fontFamily: 'Satoshi', fontSize: 10, color: colors.textDim, marginTop: 2 },
    toolsAction: { margin: 24, height: 60, borderRadius: 20, overflow: 'hidden' },
    toolsGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    toolsText: { fontFamily: 'Tanker', fontSize: 16, color: '#000', letterSpacing: 1 },

    // Universal
    secTitle: { fontFamily: 'Tanker', fontSize: 16, color: '#fff', letterSpacing: 1, marginLeft: 24, marginTop: 10, marginBottom: 15 },
    ribbonScroll: { paddingLeft: 24, paddingRight: 10, paddingBottom: 10 },
    ribbonDay: { alignItems: 'center', marginRight: 18, opacity: 0.4 },
    ribbonActive: { opacity: 1 },
    ribbonLabel: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, marginBottom: 10 },
    ribbonCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    ribbonPresent: { backgroundColor: 'rgba(0, 214, 143, 0.2)', borderColor: colors.neonGreen },
    ribbonAbsent: { backgroundColor: 'rgba(255, 61, 113, 0.2)', borderColor: colors.neonPink },
    ribbonDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
    ribbonNum: { fontFamily: 'Satoshi-Black', fontSize: 11, color: '#fff', marginTop: 10 },

    actionHub: { padding: 24 },
    primaryAction: { height: 74, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    actionGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 16 },
    actionText: { fontFamily: 'Tanker', fontSize: 20, color: '#fff', letterSpacing: 1 },
    actionSub: { fontFamily: 'Satoshi-Black', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },

    toolsGrid: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 30 },
    toolCard: { flex: 1, height: 80, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    toolGlass: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6 },
    toolTitle: { fontFamily: 'Tanker', fontSize: 14, color: '#fff', letterSpacing: 1 },

    pulseContainer: { marginHorizontal: 24, gap: 10 },
    pulseHeader: { fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.textDim, letterSpacing: 3, marginBottom: 10 },
    pulseItem: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    pulseDot: { width: 6, height: 6, borderRadius: 3 },
    pulseText: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: 'rgba(255,255,255,0.4)' }
});

