import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Animated, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE } from '../api/config';
import { Ionicons } from '@expo/vector-icons';
import { fetchWithTimeout } from '../utils/api';

const colors = {
    bg0: '#0f172a', surf: 'rgba(255, 255, 255, 0.05)',
    hot: '#3b82f6', green: '#10b981', oran: '#ff8a1f', cyan: '#0ea5e9', purp: '#6366f1', border: 'rgba(255, 255, 255, 0.12)'
};

// Helper to get current week dates
const getCurrentWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday
    const MondayDate = new Date(today);
    MondayDate.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    const dates = [];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    for (let i = 0; i < 6; i++) {
        const d = new Date(MondayDate);
        d.setDate(MondayDate.getDate() + i);
        const dayNum = String(d.getDate()).padStart(2, '0');
        dates.push({
            day: days[i],
            label: `${days[i].substring(0, 3).toUpperCase()} ${dayNum}`,
            date: d.toISOString().split('T')[0],
            displayMonth: months[d.getMonth()]
        });
    }
    return dates;
};

const WEEK_DATES = getCurrentWeekDates();

export default function TimetableScreen({ route, navigation }) {
    const { user } = route.params || { user: { programme: 'B.Tech CSC', section: 'CS' } };
    const programme = user.programme || 'B.Tech CSC';
    const section = user.section || 'CS';
    const role = user?.role || 'student';
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // Auto-select today or fallback to Monday
    const todayIndex = new Date().getDay() - 1;
    const initialDay = (todayIndex >= 0 && todayIndex < 6) ? WEEK_DATES[todayIndex].day : 'Monday';
    const [selectedDay, setSelectedDay] = useState(initialDay);
    
    const [pulseAnim] = useState(new Animated.Value(1));

    const loadTimetable = async (day, forceRefresh = false) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const url = `/api/timetable/today?programme=${encodeURIComponent(programme)}&section=${encodeURIComponent(section)}${forceRefresh ? '&refresh=true' : ''}`;
            
            const res = await fetchWithTimeout(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setClasses(data);
            }
        } catch (e) {
            console.log('Timetable err:', e);
        }
        setLoading(false);
        setRefreshing(false);
    };

    // Refresh data when screen gains focus
    useFocusEffect(
        useCallback(() => {
            loadTimetable(selectedDay);
        }, [selectedDay])
    );

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
            ])
        ).start();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadTimetable(selectedDay, true); // Force refresh from DB
        setRefreshing(false);
    };

    const getSubjectColor = (code) => {
        const c = code.toUpperCase();
        if (c.includes('DS')) return colors.cyan;
        if (c.includes('AEP')) return colors.purp;
        if (c.includes('BEE')) return colors.oran;
        if (c.includes('ODE')) return colors.green;
        if (c.includes('PYTHON') || c.includes('PY')) return '#eab308'; // Yellow
        if (c.includes('CAD') || c.includes('ED')) return '#ec4899'; // Pink
        if (c.includes('SS') || c.includes('SOFT')) return '#8b5cf6'; // Violet
        return colors.hot;
    };

    const weekRange = `${WEEK_DATES[0].displayMonth} ${WEEK_DATES[0].label.split(' ')[1]} – ${WEEK_DATES[5].displayMonth} ${WEEK_DATES[5].label.split(' ')[1]}, 2026`;

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.headerSection}>
                <View style={{ paddingTop: 60, paddingBottom: 20 }}>
                    <Text style={styles.header}>TIMETABLE</Text>
                    <View style={styles.weekLabelBox}>
                        <Text style={styles.weekLabelText}>{weekRange}</Text>
                        <View style={styles.liveBadge}>
                            <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
                            <Text style={styles.liveText}>LIVE</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <View style={styles.tabBar}>
                {WEEK_DATES.map(item => (
                    <TouchableOpacity
                        key={item.day}
                        onPress={() => setSelectedDay(item.day)}
                        style={[styles.tab, selectedDay === item.day && styles.tabActive]}
                    >
                        <Text style={[styles.tabText, selectedDay === item.day && styles.tabTextActive]}>{item.label}</Text>
                        {selectedDay === item.day && <View style={styles.tabIndicator} />}
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.hot} />}
            >
                {classes.length > 0 ? (
                    classes.map((c, i) => {
                        const now = new Date();
                        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
                        let isLive = false;
                        let isEnded = false;
                        let isLocked = selectedDay !== currentDay;

                        if (c.start_time) {
                            const [startHourStr, startMinStr] = c.start_time.split(':');
                            const [endHourStr, endMinStr] = (c.end_time || '23:59').split(':');

                            const todayStr = now.toISOString().split('T')[0];
                            const startTime = new Date(`${todayStr}T${startHourStr.padStart(2, '0')}:${startMinStr.padStart(2, '0')}:00`);
                            const endTime = new Date(`${todayStr}T${endHourStr.padStart(2, '0')}:${endMinStr.padStart(2, '0')}:00`);

                            if (!isLocked) {
                                isLive = now >= startTime && now <= endTime;
                                isEnded = now > endTime;

                                const tenMinsBeforeEnd = new Date(endTime.getTime() - 10 * 60000);
                                c.isAttendanceOpen = isLive && now >= tenMinsBeforeEnd;
                            }
                        }

                        const subColor = getSubjectColor(c.code);
                        return (
                            <TouchableOpacity
                                key={c.id}
                                style={[styles.slot, isLive && { borderColor: subColor, borderWidth: 1.5, backgroundColor: subColor + '08' }]}
                                onPress={() => {
                                    if (role === 'faculty' || role === 'admin') {
                                        navigation.navigate('Monitor', { classId: c.id });
                                    } else {
                                        if (isLocked) {
                                            Alert.alert('Restricted', 'Attendance can only be marked on the day of the class.');
                                            return;
                                        }
                                        if (isEnded) {
                                            Alert.alert('Session Ended', 'Attendance portal is closed for this session.');
                                            return;
                                        }
                                        navigation.navigate('Attendance', { classId: c.id });
                                    }
                                }}
                            >
                                <View style={styles.timeCol}>
                                    <Text style={styles.timeText}>{c.start_time.substring(0,5)}</Text>
                                    <View style={[styles.timeLine, { backgroundColor: subColor }]} />
                                    <Text style={styles.timeText}>{c.end_time.substring(0,5)}</Text>
                                </View>

                                <View style={styles.infoCol}>
                                    <View style={styles.subHeader}>
                                        <Text style={[styles.subCode, { color: subColor }]}>{c.code}</Text>
                                        {isLive && (
                                            <View style={[styles.nowBadge, { backgroundColor: subColor }]}>
                                                <Text style={styles.nowText}>NOW</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.className}>{c.name}</Text>
                                    <View style={styles.metaRow}>
                                        <Ionicons name="location-outline" size={10} color="rgba(255,255,255,0.4)" />
                                        <Text style={styles.classMeta}>Room {c.room}</Text>
                                        <Ionicons name="people-outline" size={10} color="rgba(255,255,255,0.4)" style={{ marginLeft: 8 }} />
                                        <Text style={styles.classMeta}>Sec {c.section}</Text>
                                    </View>
                                </View>

                                <View style={[styles.statusBadge]}>
                                    {c.attendance_status === 'present' ? (
                                        <View style={{flexDirection:'row', alignItems:'center', gap:4}}>
                                            <Ionicons name="checkmark-circle" size={16} color={colors.green} />
                                            <Text style={[styles.statusText, {color: colors.green}]}>PRESENT</Text>
                                        </View>
                                    ) : isEnded ? (
                                        <Text style={[styles.statusText, { color: 'rgba(255,255,255,0.2)' }]}>{c.name.toUpperCase().includes('LAB') ? 'LAB ENDED' : 'CLASS ENDED'}</Text>
                                    ) : isLocked ? (
                                        <Ionicons name="lock-closed-outline" size={12} color="rgba(255,255,255,0.2)" />
                                    ) : (
                                        <Text style={[styles.statusText, c.isAttendanceOpen ? {color: colors.green} : styles.textPending]}>
                                            {c.isAttendanceOpen ? 'OPEN' : 'UPCOMING'}
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emoji}>🌴</Text>
                        <Text style={styles.emptyMsg}>No classes scheduled for {selectedDay}.</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg0 },
    headerImage: { paddingTop: 60, paddingBottom: 20 },
    headerSection: { paddingHorizontal: 20 },
    header: { fontFamily: 'Tanker', fontSize: 32, color: '#fff', letterSpacing: 1 },
    weekLabelBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
    weekLabelText: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,255,179,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,255,179,0.2)' },
    liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.green },
    liveText: { fontFamily: 'Satoshi-Bold', fontSize: 8, color: colors.green, letterSpacing: 1 },

    tabBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
    tab: { alignItems: 'center', paddingVertical: 8, flex: 1 },
    tabActive: { backgroundColor: 'transparent' },
    tabText: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 },
    tabTextActive: { color: colors.hot },
    tabIndicator: { position: 'absolute', bottom: 0, width: 20, height: 2, backgroundColor: colors.hot, borderRadius: 1 },

    scrollContent: { padding: 20, paddingBottom: 100 },
    slot: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surf, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },

    timeCol: { alignItems: 'center', gap: 4, width: 45 },
    timeText: { fontFamily: 'Satoshi-Bold', fontSize: 9, color: 'rgba(255,255,255,0.3)' },
    timeLine: { width: 1.5, height: 20, borderRadius: 1, opacity: 0.5 },

    infoCol: { flex: 1, paddingHorizontal: 16 },
    subHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    subCode: { fontFamily: 'Satoshi-Bold', fontSize: 10, letterSpacing: 1 },
    nowBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    nowText: { fontFamily: 'Satoshi-Bold', fontSize: 8, color: '#000' },
    className: { fontFamily: 'Satoshi-Bold', fontSize: 14, color: '#fff' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    classMeta: { fontFamily: 'Satoshi', fontSize: 10, color: 'rgba(255,255,255,0.4)' },

    statusBadge: { padding: 4 },
    statusText: { fontFamily: 'Satoshi-Bold', fontSize: 8, letterSpacing: 0.5, textTransform: 'uppercase' },
    textLate: { color: colors.oran },
    textPending: { color: 'rgba(255,255,255,0.3)' },

    emptyState: { alignItems: 'center', marginTop: 40 },
    emoji: { fontSize: 40, marginBottom: 10 },
    emptyMsg: { fontFamily: 'Satoshi', fontSize: 13, color: 'rgba(255,255,255,0.4)' },
    openBadge: { backgroundColor: 'rgba(0, 255, 179, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: colors.green },
    openText: { fontFamily: 'Satoshi-Bold', fontSize: 7, color: colors.green, letterSpacing: 0.5 }
});
