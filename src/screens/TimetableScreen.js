import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    RefreshControl, 
    TouchableOpacity, 
    StatusBar, 
    Dimensions,
    Platform,
    UIManager,
    LayoutAnimation
} from 'react-native';
import * as SecureStore from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { 
    FadeInRight,
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming 
} from 'react-native-reanimated';
import { fetchWithTimeout, fetchWithCache } from '../utils/api';
import Colors from '../theme/colors';

const { width } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const getCurrentWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const MondayDate = new Date(today);
    // If it's Sunday, anchor to NEXT Monday instead of previous
    const offset = dayOfWeek === 0 ? 1 : -(dayOfWeek - 1);
    MondayDate.setDate(today.getDate() + offset);
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

const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
};

const formatTime = (time) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    let hours = parseInt(h);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; 
    return `${hours}:${m} ${ampm}`;
};

const WEEK_DATES = getCurrentWeekDates();

export default function TimetableScreen({ route, navigation }) {
    const { user } = route.params || { user: { role: 'student' } };
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [calendarEvent, setCalendarEvent] = useState(null);
    
    // Default to today (or Monday if Sunday)
    const initialDayIndex = Math.min(5, Math.max(0, new Date().getDay() - 1));
    const [selectedDay, setSelectedDay] = useState(WEEK_DATES[initialDayIndex].day);
    
    const [stats, setStats] = useState({ attended: 0, total: 0 });
    const [currentMinutes, setCurrentMinutes] = useState(new Date().getHours() * 60 + new Date().getMinutes());

    const livePulse = useSharedValue(1);

    useEffect(() => {
        livePulse.value = withRepeat(withTiming(1.2, { duration: 1000 }), -1, true);
        fetchStats();
        
        // Update current time every minute for the timeline indicator
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
        }, 60000);
        
        return () => clearInterval(timer);
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
        } catch (e) {
            console.warn('[Timetable] Stats error:', e.message);
        }
    };

    const loadTimetable = useCallback(async (day, force = false) => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const prog = (user.programme || 'all').trim();
            const sec = (user.section || 'all').trim();
            const url = `/api/timetable/today?day=${day}&programme=${encodeURIComponent(prog)}&section=${encodeURIComponent(sec)}${force ? '&refresh=true' : ''}`;
            
            const processData = (data) => {
                const enhancedClasses = (data.classes || []).map(c => {
                    const startMin = parseTimeToMinutes(c.start_time);
                    const endMin = parseTimeToMinutes(c.end_time);
                    const isToday = new Date().getDay() - 1 === WEEK_DATES.findIndex(d => d.day === day);
                    
                    let liveStatus = 'upcoming';
                    if (isToday) {
                        if (currentMinutes >= startMin && currentMinutes < endMin) liveStatus = 'live';
                        else if (currentMinutes >= endMin) liveStatus = 'past';
                    }
                    return { ...c, startMin, endMin, live_status: liveStatus };
                });
                
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setClasses(enhancedClasses);
                setCalendarEvent(data.calendar_event || null);
            };

            const res = await fetchWithCache(url, { headers: { 'Authorization': `Bearer ${token}` } }, (cached) => {
                if (cached.ok && cached.data) {
                    processData(cached.data);
                }
            });
            
            if (res.status === 401) {
                navigation.replace('Auth');
                return;
            }
            
            if (res.ok && res.data) {
                processData(res.data);
            }
        } catch (e) {
            console.warn('[Timetable] Load error:', e.message);
        }
        setLoading(false);
        setRefreshing(false);
    }, [user.programme, user.section, currentMinutes]);

    useFocusEffect(useCallback(() => { loadTimetable(selectedDay, true); }, [selectedDay, loadTimetable]));

    const onRefresh = () => {
        setRefreshing(true);
        loadTimetable(selectedDay, true); // Force refresh to bypass stale cache
        fetchStats();
    };

    const livePulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: livePulse.value }],
        opacity: 1.2 - livePulse.value
    }));

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
            <LinearGradient colors={Colors.gradientBg} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Schedule</Text>
                    <Text style={styles.sub}>{user.programme} • Section {user.section}</Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: Colors[user.role] || Colors.primary }]}>
                    <Text style={styles.roleText}>{user.role?.toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.tabSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                    {WEEK_DATES.map(item => {
                        const isSelected = selectedDay === item.day;
                        const isToday = item.num === String(new Date().getDate()).padStart(2, '0');
                        
                        return (
                            <TouchableOpacity 
                                key={item.day} 
                                onPress={() => setSelectedDay(item.day)}
                                style={[styles.dayTab, isSelected && styles.dayTabActive, isToday && !isSelected && styles.dayTabToday]}
                            >
                                <Text style={[styles.dayNum, isSelected && { color: Colors.primary }, isToday && !isSelected && { color: '#fff' }]}>{item.num}</Text>
                                <Text style={[styles.dayLabel, isSelected && { color: Colors.primary }]}>{item.label}</Text>
                                {isSelected && <View style={[styles.tabDot, { backgroundColor: Colors.primary }]} />}
                                {isToday && !isSelected && <View style={styles.todayIndicator} />}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Calendar Event Banner */}
                {calendarEvent && (
                    <Animated.View entering={FadeInRight} style={[styles.calendarBanner, { borderColor: calendarEvent.is_system_holiday ? Colors.danger + '40' : Colors.accent + '40' }]}>
                        <LinearGradient 
                            colors={calendarEvent.is_system_holiday ? [Colors.danger + '15', 'transparent'] : [Colors.accent + '15', 'transparent']} 
                            start={{x:0, y:0}} end={{x:1, y:0}} 
                            style={StyleSheet.absoluteFill} 
                        />
                        <View style={[styles.bannerIcon, { backgroundColor: calendarEvent.is_system_holiday ? Colors.danger : Colors.accent }]}>
                            <Ionicons name={calendarEvent.type === 'exam' ? 'document-text' : 'sunny'} size={18} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.bannerTitle}>{calendarEvent.event_name.toUpperCase()}</Text>
                            <Text style={styles.bannerSub}>
                                {calendarEvent.is_system_holiday ? 'Instruction suspended today' : 'Special institutional event'}
                            </Text>
                        </View>
                    </Animated.View>
                )}

                {/* Classes Timeline */}
                <View style={styles.timelineContainer}>
                    {classes.length === 0 && !loading ? (
                        <View style={styles.emptyState}>
                            <Ionicons 
                                name={calendarEvent ? (calendarEvent.type === 'exam' ? 'pencil-outline' : 'cafe-outline') : "sunny-outline"} 
                                size={40} 
                                color={Colors.textMuted} 
                            />
                            <Text style={styles.emptyText}>{calendarEvent ? calendarEvent.event_name : "No classes scheduled"}</Text>
                            <Text style={styles.emptySub}>{calendarEvent ? "Institutional Protocol Active" : "Enjoy your free day"}</Text>
                        </View>
                    ) : (
                        classes.map((cls, index) => {
                            const isLive = cls.live_status === 'live';
                            const isPast = cls.live_status === 'past';
                            
                            return (
                                <Animated.View key={index} entering={FadeInRight.delay(index * 50)} style={styles.timelineBox}>
                                    <View style={styles.timeColumn}>
                                        <Text style={[styles.timeText, isPast && styles.textDim]}>{formatTime(cls.start_time)}</Text>
                                        <View style={[styles.timeLine, isLive && { backgroundColor: Colors.primary }, isPast && { opacity: 0.2 }]} />
                                        <Text style={[styles.timeSub, isPast && styles.textDim]}>{formatTime(cls.end_time)}</Text>
                                    </View>
                                    
                                    <TouchableOpacity 
                                        activeOpacity={0.8}
                                        onPress={() => {
                                            if (user.role === 'student' && !isPast) {
                                                navigation.navigate('Attendance', { user, classId: cls.id });
                                            }
                                        }}
                                        style={[
                                            styles.classCard, 
                                            isLive && styles.classCardLive,
                                            isPast && styles.classCardPast
                                        ]}
                                    >
                                        {isLive && (
                                            <View style={styles.liveIndicatorContainer}>
                                                <Animated.View style={[styles.livePulse, livePulseStyle]} />
                                                <View style={styles.liveDot} />
                                                <Text style={styles.liveText}>HAPPENING NOW</Text>
                                            </View>
                                        )}
                                        
                                        <View style={styles.classHeader}>
                                            <Text style={[styles.subjectCode, isLive && { color: Colors.primary }, isPast && styles.textDim]}>{cls.code}</Text>
                                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                                <View style={styles.roomTag}>
                                                    <Ionicons name="location" size={10} color={isPast ? Colors.textMuted : Colors.primary} />
                                                    <Text style={[styles.roomText, isPast && styles.textDim]}>{cls.room}</Text>
                                                </View>
                                            </View>
                                        </View>
                                        
                                        <Text style={[styles.subjectName, isPast && styles.textDim]}>{(cls.name || 'Unknown').replace(/_/g, ' ')}</Text>
                                        
                                        <View style={styles.facultyRow}>
                                            <Ionicons name="person-outline" size={12} color={Colors.textMuted} />
                                            <Text style={styles.facultyText}>{cls.faculty || 'TBA'}</Text>
                                        </View>
                                        
                                        {/* Quick Mark Button overlay if it's the current class */}
                                        {isLive && user.role === 'student' && (
                                            <View style={styles.quickMarkBtn}>
                                                <Text style={styles.quickMarkText}>Mark</Text>
                                                <Ionicons name="arrow-forward" size={12} color="#fff" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </Animated.View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontFamily: 'Tanker', fontSize: 32, color: '#fff', letterSpacing: 0.5 },
    sub: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: Colors.textMuted, marginTop: 4 },
    roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    roleText: { fontFamily: 'Satoshi-Black', fontSize: 10, color: '#fff', letterSpacing: 1 },

    tabSection: { borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 15 },
    tabScroll: { paddingHorizontal: 24, gap: 10 },
    dayTab: { width: 55, height: 75, borderRadius: 16, backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
    dayTabActive: { backgroundColor: Colors.primaryGlass, borderColor: Colors.primary + '50' },
    dayTabToday: { borderColor: Colors.borderLight, backgroundColor: 'rgba(255,255,255,0.05)' },
    dayNum: { fontFamily: 'Tanker', fontSize: 24, color: Colors.textMuted },
    dayLabel: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: Colors.textMuted },
    tabDot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 },
    todayIndicator: { width: 4, height: 4, borderRadius: 2, marginTop: 4, backgroundColor: Colors.textMuted },

    scrollContent: { paddingHorizontal: 24, paddingVertical: 20, paddingBottom: 100 },
    
    emptyState: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontFamily: 'Tanker', fontSize: 20, color: Colors.textMuted, marginTop: 15, letterSpacing: 1 },
    emptySub: { fontFamily: 'Satoshi-Medium', fontSize: 14, color: Colors.textDisabled, marginTop: 5 },

    timelineContainer: { marginTop: 10 },
    timelineBox: { flexDirection: 'row', marginBottom: 20 },
    timeColumn: { width: 55, alignItems: 'center', paddingTop: 5 },
    timeText: { fontFamily: 'Satoshi-Black', fontSize: 11, color: '#fff' },
    timeSub: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: Colors.textMuted },
    timeLine: { flex: 1, width: 2, backgroundColor: Colors.border, marginVertical: 6, borderRadius: 1 },
    
    classCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border, marginLeft: 10 },
    classCardLive: { backgroundColor: Colors.primaryGlass, borderColor: Colors.primary + '50' },
    classCardPast: { opacity: 0.6 },
    
    liveIndicatorContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    livePulse: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
    liveText: { fontFamily: 'Satoshi-Black', fontSize: 9, color: Colors.primary, letterSpacing: 1 },
    
    classHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    subjectCode: { fontFamily: 'Satoshi-Black', fontSize: 11, color: Colors.textSecondary, letterSpacing: 0.5 },
    roomTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    roomText: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: Colors.textSecondary },
    
    subjectName: { fontFamily: 'Tanker', fontSize: 22, color: '#fff', letterSpacing: 0.5, marginBottom: 12 },
    
    facultyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    facultyText: { fontFamily: 'Satoshi-Medium', fontSize: 12, color: Colors.textMuted },
    
    textDim: { color: Colors.textMuted },
    
    quickMarkBtn: { position: 'absolute', right: 16, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    quickMarkText: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: '#fff' },

    calendarBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: 20, padding: 16, marginBottom: 25, borderWidth: 1, gap: 15, overflow: 'hidden' },
    bannerIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    bannerTitle: { fontFamily: 'Tanker', fontSize: 18, color: '#fff', letterSpacing: 0.5 },
    bannerSub: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: Colors.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
});
