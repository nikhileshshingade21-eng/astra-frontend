import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Dimensions,
    StatusBar,
} from 'react-native';
import * as SecureStore from '../utils/storage';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { fetchWithTimeout, fetchWithCache } from '../utils/api';
import AstraLottie from '../components/AstraLottie';
import WeatherWidget from '../components/WeatherWidget';
import { io } from 'socket.io-client';
import { API_BASE } from '../api/config';
import Animated, {
    FadeInUp,
    FadeOutUp,
    FadeInDown,
    FadeInRight,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence
} from 'react-native-reanimated';
import { Colors } from '../theme/colors';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import { useNotifications } from '../hooks/useNotifications';
import AstraTouchable from '../components/AstraTouchable';

const { width } = Dimensions.get('window');

// V3.2.7 FIX: Removed Experimental LayoutAnimation to prevent conflicts with Reanimated 3

// ── Time Helpers ─────────────────────────────────
const formatTime = (time) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    let hours = parseInt(h);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${m} ${ampm}`;
};

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
};

const getStatusColor = (status) => {
    switch (status) {
        case 'attended': return Colors.success;
        case 'live': return Colors.primary;
        case 'missed': return Colors.danger;
        default: return Colors.textMuted;
    }
};

const getStatusIcon = (status) => {
    switch (status) {
        case 'attended': return 'checkmark-circle';
        case 'live': return 'radio';
        case 'missed': return 'close-circle';
        default: return 'time-outline';
    }
};

export default function DashboardScreen({ route, navigation }) {
    const { user } = route.params || { user: { name: 'Student', role: 'student' } };
    const role = user.role || 'student';

    // Initialize FCM push notifications
    useNotifications(user?.id);
    const roleColor = role === 'admin' ? Colors.admin : role === 'faculty' ? Colors.faculty : Colors.student;

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [activeNotification, setActiveNotification] = useState(null);

    // Animations
    const streakPulse = useSharedValue(1);

    useEffect(() => {
        streakPulse.value = withRepeat(
            withSequence(
                withTiming(1.15, { duration: 800 }),
                withTiming(1, { duration: 800 })
            ), -1, false
        );
    }, []);

    const loadDashboard = useCallback(async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithCache(`/api/dashboard/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }, (cachedResponse) => {
                if (cachedResponse.ok && cachedResponse.data) {
                    setStats(cachedResponse.data);
                    if (!cachedResponse.data.subjects) setStats(old => ({ ...old, subjects: [] }));
                    if (!cachedResponse.data.today_classes) setStats(old => ({ ...old, today_classes: [] }));
                    if (!cachedResponse.data.weekly_pulse) setStats(old => ({ ...old, weekly_pulse: [] }));
                }
            });

            if (res.status === 401) {
                navigation.replace('Auth');
                return;
            }
            if (res.ok && res.data) {
                setStats({
                    ...res.data,
                    subjects: res.data.subjects || [],
                    today_classes: res.data.today_classes || [],
                    weekly_pulse: res.data.weekly_pulse || []
                });
            }
        } catch (e) {
            console.warn('[Dashboard] Fetch error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [navigation]);

    useEffect(() => {
        loadDashboard();

        let socket;
        if (user?.id) {
            const initSocket = async () => {
                const socketToken = await SecureStore.getItemAsync('token');
                socket = io(API_BASE, {
                    transports: ['websocket'],
                    query: { token: socketToken || '' }
                });

                socket.on('connect', () => {
                    socket.emit('join_user', user.id);
                });

                socket.on('LIVE_NOTIFICATION', (payload) => {
                    setActiveNotification(payload);
                    setTimeout(() => setActiveNotification(null), 6000);
                });
            };
            initSocket();
        }
        return () => { if (socket) socket.disconnect(); };
    }, [loadDashboard, user?.id]);

    const streakStyle = useAnimatedStyle(() => ({
        transform: [{ scale: (stats?.streak > 0) ? streakPulse.value : 1 }],
    }));

    const onRefresh = () => {
        setRefreshing(true);
        loadDashboard();
    };

    // ── Loading ──────────────────────────────────
    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: 60 }}>
                <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
                <LinearGradient colors={Colors.gradientBg} style={StyleSheet.absoluteFill} />
                <DashboardSkeleton />
            </View>
        );
    }

    // ── Error ────────────────────────────────────
    if (error) {
        return (
            <View style={styles.loaderContainer}>
                <LinearGradient colors={Colors.gradientBg} style={StyleSheet.absoluteFill} />
                <AstraLottie type="error" size={180} />
                <Text style={{ color: '#fff', marginTop: 20, fontFamily: 'Tanker', fontSize: 18 }}>
                    {error === 'Invalid token' ? 'Session Expired' : 'Connection Lost'}
                </Text>
                <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 5, fontFamily: 'Satoshi-Medium' }}>
                    {error === 'Invalid token' ? 'Please log in again.' : 'Check your connection and try again.'}
                </Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={error === 'Invalid token' ? () => navigation.replace('Auth') : loadDashboard}
                >
                    <LinearGradient colors={Colors.gradientPrimary} style={styles.retryGradient}>
                        <Text style={{ color: '#fff', fontFamily: 'Satoshi-Bold', fontSize: 14 }}>
                            {error === 'Invalid token' ? 'Log In' : 'Retry'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Bunk Strategy ────────────────────────────
    const getBunkInsight = () => {
        const p = stats?.present_count || 0;
        const t = stats?.total_attended || 0;
        const target = 0.75;
        if (!t || t === 0) return null;
        const currentPct = p / t;
        if (currentPct >= target) {
            const safe = Math.floor(p / target - t);
            if (safe > 0) return { type: 'safe', message: `You can safely skip ${safe} more class${safe > 1 ? 'es' : ''}`, icon: 'shield-checkmark', color: Colors.success };
            return { type: 'borderline', message: `You're right at 75% — attend every class`, icon: 'warning', color: Colors.warning };
        } else {
            const needed = Math.ceil((target * t - p) / (1 - target));
            return { type: 'danger', message: `Attend ${needed} more class${needed > 1 ? 'es' : ''} to reach 75%`, icon: 'alert-circle', color: Colors.danger };
        }
    };



    // ── Student Dashboard ────────────────────────
    const renderStudentView = () => {
        const insight = getBunkInsight();
        const todayClasses = stats?.today_classes || [];
        const nextClassIn = stats?.next_class_in_min;

        return (
            <>
                {/* ── Quick Stats Row ──────────────── */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { flex: 1 }]}>
                        <Text style={styles.statValue}>{stats?.percentage || 0}%</Text>
                        <Text style={styles.statLabel}>Attendance</Text>
                    </View>
                    <Animated.View style={[styles.statCard, { flex: 1 }, streakStyle]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={{ fontSize: 18 }}>🔥</Text>
                            <Text style={[styles.statValue, { color: Colors.streak }]}>{stats?.streak || 0}</Text>
                        </View>
                        <Text style={styles.statLabel}>Day Streak</Text>
                    </Animated.View>
                    <View style={[styles.statCard, { flex: 1 }]}>
                        <Text style={[styles.statValue, { color: Colors.primaryLight }]}>#{stats?.rank || '--'}</Text>
                        <Text style={styles.statLabel}>Rank</Text>
                    </View>
                </View>

                {/* ── Smart Insight Card ────────────── */}
                {insight && (
                    <Animated.View entering={FadeInDown.delay(200)} style={[styles.insightCard, { backgroundColor: insight.color + '12', borderColor: insight.color + '30' }]}>
                        <Ionicons name={insight.icon} size={20} color={insight.color} />
                        <Text style={[styles.insightText, { color: insight.color }]}>{insight.message}</Text>
                    </Animated.View>
                )}

                {/* ── Today's Schedule ─────────────── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Today's Classes</Text>
                    {nextClassIn != null && nextClassIn > 0 && (
                        <View style={styles.countdownBadge}>
                            <Ionicons name="time-outline" size={12} color={Colors.primary} />
                            <Text style={styles.countdownText}>Next in {nextClassIn} min</Text>
                        </View>
                    )}
                </View>

                {todayClasses.length > 0 ? (
                    todayClasses.map((cls, i) => (
                        <Animated.View key={cls.id || i} entering={FadeInRight.delay(i * 80)}>
                            <AstraTouchable
                                style={[
                                    styles.classCard,
                                    cls.live_status === 'live' && { borderColor: Colors.primary + '60', backgroundColor: Colors.primaryGlass }
                                ]}
                                onPress={() => {
                                    if (cls.live_status === 'upcoming' || cls.live_status === 'live') {
                                        navigation.navigate('Attendance', { user, classId: cls.id });
                                    }
                                }}
                            >
                                {/* Time Column */}
                                <View style={styles.timeColumn}>
                                    <Text style={styles.classTime}>{formatTime(cls.start_time)}</Text>
                                    <View style={[styles.timeLine, { backgroundColor: getStatusColor(cls.live_status) }]} />
                                    <Text style={styles.classTimeEnd}>{formatTime(cls.end_time)}</Text>
                                </View>

                                {/* Info Column */}
                                <View style={styles.classInfo}>
                                    <View style={styles.classHeader}>
                                        <Text style={[styles.classCode, { color: getStatusColor(cls.live_status) }]}>{cls.code}</Text>
                                        {cls.live_status === 'live' && (
                                            <View style={styles.liveBadge}>
                                                <View style={styles.liveDot} />
                                                <Text style={styles.liveText}>LIVE</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.className} numberOfLines={1}>
                                        {(cls.name || 'Class').replace(/_/g, ' ')}
                                    </Text>
                                    <View style={styles.classMeta}>
                                        <View style={styles.metaItem}>
                                            <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
                                            <Text style={styles.metaText}>{cls.room || 'TBA'}</Text>
                                        </View>
                                        <View style={styles.metaItem}>
                                            <Ionicons name="person-outline" size={11} color={Colors.textMuted} />
                                            <Text style={styles.metaText}>{cls.faculty || 'TBA'}</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Status Icon */}
                                <View style={styles.statusIcon}>
                                    <Ionicons name={getStatusIcon(cls.live_status)} size={22} color={getStatusColor(cls.live_status)} />
                                </View>
                            </AstraTouchable>
                        </Animated.View>
                    ))
                ) : (
                    <View style={styles.emptySchedule}>
                        <Ionicons name="sunny-outline" size={40} color={Colors.textMuted} />
                        <Text style={styles.emptyTitle}>No classes today</Text>
                        <Text style={styles.emptySubtitle}>Enjoy your free day!</Text>
                    </View>
                )}

                {/* ── Weekly Pulse (attendance dots) ──── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>This Week</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekPulse}>
                    {(stats?.daily_stats || []).map((day, i) => (
                        <View key={i} style={[styles.weekDay, day.isToday && styles.weekDayActive]}>
                            <Text style={[styles.weekDayLabel, day.isToday && { color: Colors.primary }]}>{day.dayLabel}</Text>
                            <View style={[
                                styles.weekDot,
                                day.status === 'present' || day.status === 'late' ? { backgroundColor: Colors.success } :
                                day.status === 'absent' ? { backgroundColor: Colors.danger } :
                                day.isToday ? { backgroundColor: Colors.primary, borderWidth: 0 } :
                                null
                            ]}>
                                {(day.status === 'present' || day.status === 'late') && (
                                    <Ionicons name="checkmark" size={12} color="#fff" />
                                )}
                                {day.status === 'absent' && (
                                    <Ionicons name="close" size={12} color="#fff" />
                                )}
                            </View>
                            <Text style={[styles.weekDayNum, day.isToday && { color: '#fff' }]}>{day.dayNum}</Text>
                        </View>
                    ))}
                </ScrollView>

                {/* ── Quick Actions ──────────────────── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                </View>
                <View style={styles.actionsGrid}>
                    <AstraTouchable style={styles.actionCard} onPress={() => navigation.navigate('Attendance', { user })}>
                        <LinearGradient colors={['rgba(251, 191, 36, 0.15)', 'rgba(251, 191, 36, 0.05)']} style={styles.actionGradient}>
                            <Ionicons name="finger-print-outline" size={26} color={Colors.student} />
                            <Text style={styles.actionLabel}>Mark{'\n'}Attendance</Text>
                        </LinearGradient>
                    </AstraTouchable>
                    <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('AIChatbot', { user })}>
                        <LinearGradient colors={['rgba(0,210,255,0.15)', 'rgba(0,210,255,0.05)']} style={styles.actionGradient}>
                            <Ionicons name="sparkles-outline" size={26} color={Colors.accent} />
                            <Text style={styles.actionLabel}>ASTRA{'\n'}AI</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Marketplace', { user })}>
                        <LinearGradient colors={['rgba(0,230,118,0.15)', 'rgba(0,230,118,0.05)']} style={styles.actionGradient}>
                            <Ionicons name="storefront-outline" size={26} color={Colors.success} />
                            <Text style={styles.actionLabel}>Campus{'\n'}Exchange</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Board', { user })}>
                        <LinearGradient colors={['rgba(255,183,77,0.15)', 'rgba(255,183,77,0.05)']} style={styles.actionGradient}>
                            <Ionicons name="megaphone-outline" size={26} color={Colors.warning} />
                            <Text style={styles.actionLabel}>Announce-{'\n'}ments</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* ── Points & XP ───────────────────── */}
                <View style={styles.pointsBar}>
                    <View style={styles.pointsLeft}>
                        <Text style={{ fontSize: 16 }}>⚡</Text>
                        <Text style={styles.pointsValue}>{stats?.points || 0}</Text>
                        <Text style={styles.pointsLabel}>points</Text>
                    </View>
                    <View style={styles.pointsDivider} />
                    <View style={styles.pointsRight}>
                        <Text style={styles.pointsSubLabel}>Today attended</Text>
                        <Text style={styles.pointsSubValue}>{stats?.today_count || 0} classes</Text>
                    </View>
                </View>
            </>
        );
    };

    // ── Faculty Dashboard ────────────────────────
    const renderFacultyView = () => (
        <>
            <View style={[styles.statCard, { marginHorizontal: 0, marginBottom: 16 }]}>
                <Text style={styles.sectionTitle}>Faculty Command Center</Text>
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={styles.statValue}>{stats?.faculty_data?.total_students || 0}</Text>
                        <Text style={styles.statLabel}>Total Students</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={[styles.statValue, { color: Colors.success }]}>{stats?.faculty_data?.sessions_today || 0}</Text>
                        <Text style={styles.statLabel}>Sessions Today</Text>
                    </View>
                </View>
            </View>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Monitor', { user })}>
                <LinearGradient colors={Colors.gradientPrimary} style={styles.actionButtonGrad}>
                    <Ionicons name="stats-chart-outline" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Open Monitoring Dashboard</Text>
                </LinearGradient>
            </TouchableOpacity>
        </>
    );

    // ── Admin Dashboard ──────────────────────────
    const renderAdminView = () => (
        <>
            <View style={[styles.statCard, { marginHorizontal: 0, marginBottom: 16, borderColor: Colors.accent + '30' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={styles.sectionTitle}>System Overview</Text>
                    <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={[styles.statValue, { fontSize: 32 }]}>{stats?.admin_data?.system_stats?.total_users || '...'}</Text>
                        <Text style={styles.statLabel}>Total Users</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={[styles.statValue, { fontSize: 32, color: Colors.success }]}>{stats?.admin_data?.system_stats?.today_att || '...'}</Text>
                        <Text style={styles.statLabel}>Today's Attendance</Text>
                    </View>
                </View>
            </View>

            {(stats?.admin_data?.security_feed || []).length > 0 && (
                <>
                    <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Recent Activity</Text>
                    {(stats?.admin_data?.security_feed || []).slice(0, 3).map((log, i) => (
                        <View key={i} style={styles.logCard}>
                            <Ionicons name={log.severity === 'critical' ? "alert-circle" : "information-circle"} size={18} color={log.severity === 'critical' ? Colors.danger : Colors.warning} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.logMsg}>{log.user_name}: {log.type}</Text>
                                <Text style={styles.logTime}>{new Date(log.time).toLocaleTimeString()}</Text>
                            </View>
                        </View>
                    ))}
                </>
            )}

            <TouchableOpacity style={[styles.actionButton, { marginTop: 16 }]} onPress={() => navigation.navigate('Tools', { user })}>
                <LinearGradient colors={Colors.gradientAccent} style={styles.actionButtonGrad}>
                    <Ionicons name="construct-outline" size={20} color="#fff" />
                    <Text style={[styles.actionButtonText, { color: '#fff' }]}>System Administration</Text>
                </LinearGradient>
            </TouchableOpacity>
        </>
    );

    // ── Main Render ──────────────────────────────
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
            <LinearGradient colors={Colors.gradientBg} style={StyleSheet.absoluteFill} />

            {/* ── Notification Toast ──────────── */}
            {activeNotification && (
                <Animated.View entering={FadeInUp.springify().damping(15)} exiting={FadeOutUp} style={styles.toastContainer}>
                    <TouchableOpacity style={styles.toast} onPress={() => setActiveNotification(null)} activeOpacity={0.9}>
                        <LinearGradient colors={['rgba(26,32,53,0.95)', 'rgba(10,14,26,0.98)']} style={styles.toastGrad}>
                            <View style={[styles.toastAccent, { backgroundColor: Colors.primary }]} />
                            <Ionicons name="notifications" size={20} color={Colors.primary} />
                            <View style={styles.toastContent}>
                                <Text style={styles.toastTitle}>{activeNotification.title}</Text>
                                <Text style={styles.toastBody} numberOfLines={2}>{activeNotification.body}</Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            )}

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                {/* ── Header ─────────────────────── */}
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.greeting}>{getGreeting()},</Text>
                        <Text style={styles.userName}>{(user.name || 'Student').split(' ')[0]}</Text>
                    </View>
                    <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile', { user })}>
                        <LinearGradient colors={[roleColor + '40', roleColor + '15']} style={styles.profileGradient}>
                            <Text style={[styles.profileInitial, { color: roleColor }]}>{(user.name || 'S')[0].toUpperCase()}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* ── Weather ─────────────────────── */}
                <WeatherWidget />

                {/* ── Role-Based Content ──────────── */}
                {role === 'student' && renderStudentView()}
                {role === 'faculty' && renderFacultyView()}
                {role === 'admin' && renderAdminView()}

            </ScrollView>
        </View>
    );
}

// ── Styles ───────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    loadingText: { color: Colors.textMuted, fontFamily: 'Satoshi-Bold', fontSize: 14, marginTop: -10 },
    scrollContent: { paddingBottom: 100 },

    // Header
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
    greeting: { fontFamily: 'Satoshi-Medium', fontSize: 16, color: Colors.textSecondary },
    userName: { fontFamily: 'Tanker', fontSize: 34, color: '#fff', marginTop: 2 },
    profileBtn: { width: 48, height: 48, borderRadius: 16, overflow: 'hidden' },
    profileGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    profileInitial: { fontFamily: 'Tanker', fontSize: 22 },

    // Stats Row
    statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, marginTop: 8, marginBottom: 16 },
    statCard: {
        backgroundColor: Colors.bgCard,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    statValue: { fontFamily: 'Tanker', fontSize: 24, color: '#fff' },
    statLabel: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: Colors.textMuted, marginTop: 4, letterSpacing: 0.3 },

    // Insight Card
    insightCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginHorizontal: 24,
        marginBottom: 20,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    insightText: { fontFamily: 'Satoshi-Bold', fontSize: 13, flex: 1 },

    // Section Headers
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginTop: 8, marginBottom: 14 },
    sectionTitle: { fontFamily: 'Tanker', fontSize: 18, color: '#fff' },
    countdownBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: Colors.primaryGlass, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    },
    countdownText: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: Colors.primary },

    // Class Cards
    classCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 24,
        marginBottom: 10,
        padding: 16,
        backgroundColor: Colors.bgCard,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    timeColumn: { width: 50, alignItems: 'center' },
    classTime: { fontFamily: 'Satoshi-Black', fontSize: 11, color: '#fff' },
    classTimeEnd: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: Colors.textMuted },
    timeLine: { width: 2, height: 18, borderRadius: 1, marginVertical: 3, opacity: 0.5 },
    classInfo: { flex: 1, paddingHorizontal: 14 },
    classHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    classCode: { fontFamily: 'Satoshi-Black', fontSize: 10, letterSpacing: 0.5 },
    className: { fontFamily: 'Tanker', fontSize: 16, color: '#fff' },
    classMeta: { flexDirection: 'row', gap: 14, marginTop: 6 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: Colors.textMuted },
    statusIcon: { paddingLeft: 8 },

    // Live Badge
    liveBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(108,92,231,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
    liveText: { fontFamily: 'Satoshi-Black', fontSize: 8, color: Colors.success, letterSpacing: 1 },

    // Empty Schedule
    emptySchedule: { alignItems: 'center', paddingVertical: 40, marginHorizontal: 24, backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
    emptyTitle: { fontFamily: 'Tanker', fontSize: 18, color: '#fff', marginTop: 12 },
    emptySubtitle: { fontFamily: 'Satoshi-Medium', fontSize: 13, color: Colors.textMuted, marginTop: 4 },

    // Week Pulse
    weekPulse: { paddingHorizontal: 24, gap: 14, paddingBottom: 8 },
    weekDay: { alignItems: 'center', opacity: 0.5 },
    weekDayActive: { opacity: 1 },
    weekDayLabel: { fontFamily: 'Satoshi-Black', fontSize: 9, color: Colors.textMuted, marginBottom: 8 },
    weekDot: {
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1, borderColor: Colors.border,
    },
    weekDayNum: { fontFamily: 'Satoshi-Black', fontSize: 11, color: Colors.textMuted, marginTop: 6 },

    // Quick Actions
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24, gap: 10, marginBottom: 20 },
    actionCard: { width: (width - 58) / 2, height: 90, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
    actionGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
    actionLabel: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: '#fff', lineHeight: 17 },

    // Points Bar
    pointsBar: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 24, marginBottom: 20, padding: 16,
        backgroundColor: Colors.bgCard, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.border,
    },
    pointsLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
    pointsValue: { fontFamily: 'Tanker', fontSize: 22, color: Colors.gold },
    pointsLabel: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: Colors.textMuted },
    pointsDivider: { width: 1, height: 30, backgroundColor: Colors.border, marginHorizontal: 16 },
    pointsRight: { flex: 1 },
    pointsSubLabel: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: Colors.textMuted },
    pointsSubValue: { fontFamily: 'Tanker', fontSize: 16, color: '#fff', marginTop: 2 },

    // Action Button (faculty/admin)
    actionButton: { marginHorizontal: 24, height: 56, borderRadius: 16, overflow: 'hidden' },
    actionButtonGrad: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    actionButtonText: { fontFamily: 'Satoshi-Bold', fontSize: 15, color: '#fff' },

    // Log Cards (admin)
    logCard: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 24, paddingVertical: 12,
        marginHorizontal: 24, marginBottom: 8,
        backgroundColor: Colors.bgCard, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.border,
    },
    logMsg: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: '#fff' },
    logTime: { fontFamily: 'Satoshi-Medium', fontSize: 10, color: Colors.textMuted, marginTop: 2 },

    // Notification Toast
    toastContainer: { position: 'absolute', top: 60, left: 20, right: 20, zIndex: 9999, elevation: 30 },
    toast: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
    toastGrad: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    toastAccent: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2 },
    toastContent: { flex: 1, marginLeft: 12 },
    toastTitle: { fontFamily: 'Satoshi-Bold', fontSize: 13, color: '#fff' },
    toastBody: { fontFamily: 'Satoshi-Medium', fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

    // Retry
    retryButton: { marginTop: 24, borderRadius: 14, overflow: 'hidden', width: 160, height: 48 },
    retryGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
