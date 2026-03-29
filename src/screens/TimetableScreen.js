import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    RefreshControl, 
    TouchableOpacity, 
    Alert, 
    StatusBar, 
    Dimensions,
    Platform,
    UIManager
} from 'react-native';
import * as SecureStore from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
// import { BlurView } from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming, 
    LayoutAnimation 
} from 'react-native-reanimated';
import { API_BASE } from '../api/config';
import { fetchWithTimeout } from '../utils/api';

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
    neonGreen: '#00ffaa',
    neonPink: '#ff00e5',
    neonPurple: '#bf00ff',
    hot: '#ff3d71'
};

const getCurrentWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const MondayDate = new Date(today);
    MondayDate.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const dates = [];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (let i = 0; i < 6; i++) {
        const d = new Date(MondayDate);
        d.setDate(MondayDate.getDate() + i);
        dates.push({
            day: days[i],
            label: `${days[i].substring(0, 3).toUpperCase()}`,
            num: String(d.getDate()).padStart(2, '0'),
            date: d.toISOString().split('T')[0]
        });
    }
    return dates;
};

const formatTime = (time) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    let hours = parseInt(h);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    return `${hours}:${m} ${ampm}`;
};

const WEEK_DATES = getCurrentWeekDates();

export default function TimetableScreen({ route, navigation }) {
    const { user } = route.params || { user: { role: 'student' } };
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDay, setSelectedDay] = useState(WEEK_DATES[Math.min(5, Math.max(0, new Date().getDay() - 1))].day);
    const [stats, setStats] = useState({ attended: 0, total: 0 });

    const livePulse = useSharedValue(1);

    useEffect(() => {
        livePulse.value = withRepeat(withTiming(1.2, { duration: 1000 }), -1, true);
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/attendance/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) {
                navigation.replace('Auth');
                return;
            }
            if (res.ok && res.data) {
                setStats({ attended: res.data.attended || 0, total: res.data.total || 0 });
            }
        } catch (e) {}
    };

    const loadTimetable = useCallback(async (day, force = false) => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const prog = (user.programme || 'all').trim();
            const sec = (user.section || 'all').trim();
            const url = `/api/timetable/today?day=${day}&programme=${encodeURIComponent(prog)}&section=${encodeURIComponent(sec)}${force ? '&refresh=true' : ''}`;
            const res = await fetchWithTimeout(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.status === 401) {
                navigation.replace('Auth');
                return;
            }
            if (res.ok && res.data) {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setClasses(res.data.classes || []);
            }
        } catch (e) {}
        setLoading(false);
        setRefreshing(false);
    }, [user.programme, user.section]);

    useFocusEffect(useCallback(() => { loadTimetable(selectedDay, true); }, [selectedDay, loadTimetable]));

    const onRefresh = () => {
        setRefreshing(true);
        loadTimetable(selectedDay, true); // Force refresh to bypass stale cache
        fetchStats();
    };

    const bunkingData = useMemo(() => {
        const { attended: A, total: T } = stats;
        if (T === 0) return { canBunk: 0, needAttend: 0 };
        const canBunk = Math.floor((A / 0.75) - T);
        const needAttend = Math.max(0, Math.ceil((0.75 * T - A) / 0.25));
        return { canBunk: Math.max(0, canBunk), needAttend };
    }, [stats]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>CHRONO_GRAPH</Text>
                    <Text style={styles.sub}>SEQUENCE_SYNC_MODE_ v2.0</Text>
                </View>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{user.role?.toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.tabSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                    {WEEK_DATES.map(item => (
                        <TouchableOpacity 
                            key={item.day} 
                            onPress={() => setSelectedDay(item.day)}
                            style={[styles.dayTab, selectedDay === item.day && styles.dayTabActive]}
                        >
                            <Text style={[styles.dayNum, selectedDay === item.day && { color: colors.neonBlue }]}>{item.num}</Text>
                            <Text style={[styles.dayLabel, selectedDay === item.day && { color: colors.neonBlue }]}>{item.label}</Text>
                            {selectedDay === item.day && <View style={[styles.tabDot, { backgroundColor: colors.neonBlue }]} />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neonBlue} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Bunking Engine Card */}
                {user.role === 'student' && (
                    <View blurType="dark" blurAmount={8} style={styles.bunkCard}>
                        <LinearGradient colors={['rgba(0, 242, 255, 0.1)', 'transparent']} style={StyleSheet.absoluteFill} />
                        <View style={styles.bunkHeader}>
                            <Ionicons name="calculator-outline" size={16} color={colors.neonBlue} />
                            <Text style={styles.bunkTitle}>BUNKING_ENGINE_v2</Text>
                        </View>
                        <View style={styles.bunkStats}>
                            <View style={styles.bunkStat}>
                                <Text style={styles.bunkVal}>{bunkingData.canBunk}</Text>
                                <Text style={styles.bunkLab}>CLASSES_SAFE_TO_BUNK</Text>
                            </View>
                            <View style={styles.vLine} />
                            <View style={styles.bunkStat}>
                                <Text style={[styles.bunkVal, { color: bunkingData.needAttend > 0 ? colors.hot : colors.neonGreen }]}>
                                    {bunkingData.needAttend > 0 ? bunkingData.needAttend : '75%_STABLE'}
                                </Text>
                                <Text style={styles.bunkLab}>{bunkingData.needAttend > 0 ? 'RECOVER_REQUIRED' : 'STATUS_NOMINAL'}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {classes.length > 0 ? (
                    classes.map((c, i) => {
                        const subColor = i % 3 === 0 ? colors.neonBlue : (i % 3 === 1 ? colors.neonPurple : colors.neonGreen);
                        return (
                            <TouchableOpacity 
                                key={c.id} 
                                style={[styles.slot, { borderColor: subColor + '30' }]}
                                onPress={() => user.role === 'student' ? navigation.navigate('Attendance', { classId: c.id }) : navigation.navigate('Monitor', { classId: c.id })}
                            >
                                <View style={styles.timeCluster}>
                                    <Text style={styles.startTime}>{formatTime(c.start_time).split(' ')[0]}</Text>
                                    <View style={[styles.bridge, { backgroundColor: subColor }]} />
                                    <Text style={styles.endTime}>{formatTime(c.end_time).split(' ')[0]}</Text>
                                    <Text style={styles.ampm}>{formatTime(c.start_time).split(' ')[1]}</Text>
                                </View>
                                <View style={styles.infoBox}>
                                    <View style={styles.infoHead}>
                                        <Text style={[styles.subCode, { color: subColor }]}>{c.code}</Text>
                                        <Text style={styles.roomBadge}>ROOM_{c.room}</Text>
                                    </View>
                                    <Text style={styles.subName}>{(c.name || 'UNNAMED_SEQ').toUpperCase()}</Text>
                                    <View style={styles.metaBox}>
                                        <Ionicons name="person-outline" size={10} color={colors.textDim} />
                                        <Text style={styles.metaText}>INSTR_VEC_7</Text>
                                    </View>
                                </View>
                                <View style={styles.statusCol}>
                                    {c.attendance_status === 'present' ? (
                                        <Ionicons name="checkmark-shield" size={20} color={colors.neonGreen} />
                                    ) : (
                                        <Ionicons name="ellipsis-horizontal-circle" size={20} color={colors.textDim} />
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })
                ) : (
                    <View style={styles.emptyBox}>
                        <Ionicons name="calendar-outline" size={60} color={colors.textDim} />
                        <Text style={styles.emptyText}>CHRONO_GAP_DETECTED</Text>
                        <Text style={styles.emptySub}>No academic sequences scheduled for this period.</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontFamily: 'Tanker', fontSize: 28, color: '#fff', letterSpacing: 1 },
    sub: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.neonBlue, letterSpacing: 2 },
    roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border },
    roleText: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim },

    tabSection: { marginBottom: 10 },
    tabScroll: { paddingHorizontal: 24, gap: 15 },
    dayTab: { width: 60, height: 80, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    dayTabActive: { borderColor: colors.neonBlue, backgroundColor: 'rgba(0, 242, 255, 0.05)' },
    dayNum: { fontFamily: 'Tanker', fontSize: 22, color: colors.textDim },
    dayLabel: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, marginTop: 4 },
    tabDot: { position: 'absolute', bottom: 10, width: 4, height: 4, borderRadius: 2 },

    scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
    bunkCard: { padding: 24, borderRadius: 28, borderWidth: 1, borderColor: colors.neonBlue + '30', overflow: 'hidden', marginBottom: 25 },
    bunkHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    bunkTitle: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.neonBlue, letterSpacing: 2 },
    bunkStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    bunkStat: { flex: 1, alignItems: 'center' },
    bunkVal: { fontFamily: 'Tanker', fontSize: 28, color: '#fff' },
    bunkLab: { fontFamily: 'Satoshi-Black', fontSize: 7, color: colors.textDim, letterSpacing: 1, marginTop: 5 },
    vLine: { width: 1, height: 40, backgroundColor: colors.border },

    slot: { flexDirection: 'row', padding: 20, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, marginBottom: 12, alignItems: 'center' },
    timeCluster: { width: 50, alignItems: 'center', gap: 4 },
    startTime: { fontFamily: 'Satoshi-Black', fontSize: 10, color: '#fff' },
    endTime: { fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.textDim },
    ampm: { fontFamily: 'Satoshi-Black', fontSize: 7, color: colors.neonBlue, marginTop: 2 },
    bridge: { width: 2, height: 20, borderRadius: 1, opacity: 0.3 },
    infoBox: { flex: 1, paddingHorizontal: 20 },
    infoHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    subCode: { fontFamily: 'Satoshi-Black', fontSize: 9, letterSpacing: 1 },
    roomBadge: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim },
    subName: { fontFamily: 'Tanker', fontSize: 16, color: '#fff', letterSpacing: 0.5 },
    metaBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    metaText: { fontFamily: 'Satoshi-Bold', fontSize: 9, color: colors.textDim },
    statusCol: { paddingLeft: 10 },

    emptyBox: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontFamily: 'Tanker', fontSize: 24, color: '#fff', marginTop: 20 },
    emptySub: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: colors.textDim, textAlign: 'center', marginTop: 10, paddingHorizontal: 40 }
});

