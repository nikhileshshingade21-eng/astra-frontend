import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    Dimensions,
    LayoutAnimation,
    Platform,
    UIManager,
    Modal
} from 'react-native';
import * as SecureStore from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import { io } from 'socket.io-client';
import { LineChart } from 'react-native-chart-kit';
import { API_BASE } from '../api/config';
import { fetchWithTimeout } from '../utils/api';

const { width } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const colors = {
    bg: '#020617',
    faculty: '#bf00ff',
    neonGreen: '#00ffaa',
    neonPink: '#ff00e5',
    neonBlue: '#00f2ff',
    glass: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(255, 255, 255, 0.08)',
    textDim: 'rgba(255, 255, 255, 0.4)'
};

export default function FacultyDashboard({ route, navigation }) {
    const { classId } = route.params || {};
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [liveData, setLiveData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [showBroadcast, setShowBroadcast] = useState(false);

    const fetchClasses = useCallback(async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/timetable`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok && res.data) {
                const fetchedClasses = res.data.classes || [];
                setClasses(fetchedClasses);
                if (fetchedClasses.length > 0) {
                    const initial = classId ? fetchedClasses.find(c => c.id === classId) : null;
                    setSelectedClass(initial || fetchedClasses[0]);
                }
            }
        } catch (e) {
            console.error('Fetch classes error:', e);
        } finally {
            setLoading(false);
        }
    }, [classId]);

    const fetchLiveAttendance = useCallback(async (id) => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/attendance/live/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok && res.data) {
                setLiveData(res.data);
            }
        } catch (e) {
            console.log('Live fetch err', e);
        }
    }, []);

    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);

    useEffect(() => {
        let socket;
        if (selectedClass) {
            fetchLiveAttendance(selectedClass.id);
            
            // Socket Handshake
            socket = io(API_BASE);
            socket.on('connect', () => {
                console.log('[Faculty] Socket linked:', socket.id);
                socket.emit('join_class', selectedClass.id);
            });

            socket.on('ATTENDANCE_MARKED', (data) => {
                console.log('[Faculty] New presence detected:', data.roll_number);
                setLiveData(prev => {
                    if (!prev) return prev;
                    // Check if already in list to avoid duplicates
                    const exists = prev.students.some(s => s.roll_number === data.roll_number);
                    if (exists) return prev;
                    
                    return {
                        ...prev,
                        count: (prev.count || 0) + 1,
                        students: [data, ...prev.students]
                    };
                });
            });

            socket.on('disconnect', () => console.log('[Faculty] Socket severed'));
        }

        // POLL-BACKUP: Periodic delta sync in case of socket drop
        const poller = setInterval(() => {
            if (selectedClass && autoRefresh) {
                console.log('[DeltaSync] Background refreshing...');
                fetchLiveAttendance(selectedClass.id);
            }
        }, 60000); // 60s backup sync
        
        return () => {
            if (socket) socket.disconnect();
            if (poller) clearInterval(poller);
        };
    }, [selectedClass, fetchLiveAttendance]);

    const markManual = async (studentId, status = 'present') => {
        if (loading) return;
        setLoading(true);
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/attendance/manual`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: studentId, class_id: selectedClass.id, status: status })
            });
            if (res.ok && res.data) fetchLiveAttendance(selectedClass.id);
        } catch (e) {
            console.log('Manual mark err', e);
        } finally {
            setLoading(false);
        }
    };

    const renderStudent = ({ item }) => (
        <View blurType="dark" blurAmount={3} style={styles.studentRow}>
            <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{item.name.toUpperCase()}</Text>
                <Text style={styles.studentRoll}>{item.roll_number}</Text>
            </View>
            <View style={styles.timeBadge}>
                <Text style={styles.timeText}>{item.marked_at ? new Date(item.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}</Text>
            </View>
            {item.status ? (
                <View style={[styles.statusIndicator, { backgroundColor: item.status === 'present' ? colors.neonGreen + '20' : colors.neonPink + '20' }]}>
                    <Ionicons name={item.status === 'present' ? "checkmark-circle" : "time"} size={18} color={item.status === 'present' ? colors.neonGreen : colors.neonPink} />
                </View>
            ) : (
                <TouchableOpacity onPress={() => markManual(item.id)} style={styles.addBtn}>
                    <Ionicons name="add" size={20} color={colors.faculty} />
                </TouchableOpacity>
            )}
        </View>
    );

    const qrPayload = JSON.stringify({
        c: 'BROADCAST',
        id: selectedClass?.id,
        code: selectedClass?.code,
        t: Date.now(),
        v: 'ASTRA_AUTH_v2'
    });

    if (loading) return (
        <View style={styles.loader}>
            <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />
            <ActivityIndicator color={colors.faculty} size="large" />
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#020617', '#0b0e14']} style={StyleSheet.absoluteFill} />
            
            <View style={styles.staffHub}>
                <View style={[styles.activeSessionCard, { backgroundColor: 'rgba(2, 6, 23, 0.7)' }]}>
                    <Text style={styles.sessionLabel}>CURRENT LIVE SESSION</Text>
                    <Text style={styles.sessionTitle}>{selectedClass?.name} ({selectedClass?.code})</Text>
                </View>
                <TouchableOpacity style={styles.broadcastTrigger} onPress={() => setShowBroadcast(true)}>
                    <LinearGradient colors={[colors.neonGreen, colors.neonBlue]} style={styles.broadcastGrad}>
                        <Ionicons name="wifi" size={16} color="#000" />
                        <Text style={styles.broadcastText}>SHARE QR</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            <View style={styles.classSection}>
                <Text style={styles.secLabel}>YOUR CLASSES</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classScroll}>
                    {classes.map(c => (
                        <TouchableOpacity 
                            key={c.id} 
                            style={styles.classCardWrapper}
                            onPress={() => setSelectedClass(c)}
                        >
                            <View blurType="dark" blurAmount={selectedClass?.id === c.id ? 10 : 3} style={[styles.classCard, selectedClass?.id === c.id && { borderColor: colors.faculty }]}>
                                <Text style={[styles.classCode, selectedClass?.id === c.id && { color: colors.faculty }]}>{c.code}</Text>
                                <Text style={styles.className} numberOfLines={1}>{c.name}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {selectedClass && (
                <View style={styles.monitorHub}>
                    <View style={styles.chartSection}>
                        <Text style={styles.secLabel}>ATTENDANCE TRENDS</Text>
                        <View blurType="dark" blurAmount={3} style={styles.chartGlass}>
                            <LineChart
                                data={{
                                    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
                                    datasets: [{
                                        data: liveData?.trends || [65, 72, 80, 75, 85, 90]
                                    }]
                                }}
                                width={width - 48}
                                height={180}
                                chartConfig={{
                                    backgroundColor: colors.bg,
                                    backgroundGradientFrom: colors.bg,
                                    backgroundGradientTo: colors.bg,
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => `rgba(0, 242, 255, ${opacity})`,
                                    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                                    style: { borderRadius: 16 },
                                    propsForDots: {
                                        r: "4",
                                        strokeWidth: "2",
                                        stroke: colors.neonBlue
                                    }
                                }}
                                bezier
                                style={{
                                    marginVertical: 8,
                                    borderRadius: 16
                                }}
                            />
                        </View>
                    </View>

                    <View style={styles.sessionGrid}>
                        <View style={styles.sessionStat}>
                            <Text style={styles.sessionVal}>{liveData?.count || 0}/{liveData?.total_enrolled || 0}</Text>
                            <Text style={styles.sessionLab}>VERIFIED</Text>
                        </View>
                        <View style={[styles.vLine, { backgroundColor: colors.faculty }]} />
                        <View style={styles.sessionStat}>
                            <Text style={[styles.sessionVal, { color: colors.neonPink }]}>{Math.max(0, (liveData?.total_enrolled || 0) - (liveData?.count || 0))}</Text>
                            <Text style={styles.sessionLab}>PENDING</Text>
                        </View>
                    </View>

                    <View style={styles.logHeader}>
                        <View style={styles.logLabelRow}>
                            <Ionicons name="list" size={14} color={colors.textDim} />
                            <Text style={styles.secLabel}>LIVE ATTENDANCE</Text>
                        </View>
                        <TouchableOpacity onPress={() => setAutoRefresh(!autoRefresh)} style={styles.refreshBtn}>
                            <Text style={[styles.refreshText, { color: autoRefresh ? colors.neonGreen : colors.neonPink }]}>
                                {autoRefresh ? 'AUTO REFRESH: ON' : 'AUTO REFRESH: OFF'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={liveData?.students || []}
                        renderItem={renderStudent}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={styles.listPadding}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyBox}>
                                <Ionicons name="wifi-outline" size={32} color={colors.textDim} />
                                <Text style={styles.emptyText}>Waiting for students to mark attendance...</Text>
                            </View>
                        )}
                    />
                </View>
            )}

            <Modal visible={showBroadcast} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View blurType="dark" blurAmount={15} style={StyleSheet.absoluteFill} tint="dark" />
                    <View style={styles.modalContent}>
                        <TouchableOpacity style={styles.closeModal} onPress={() => setShowBroadcast(false)}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Attendance QR Code</Text>
                        <Text style={styles.modalSub}>{selectedClass?.code} — {selectedClass?.name}</Text>
                        
                        <View style={styles.qrContainer}>
                            <View style={styles.qrBg}>
                                <QRCode value={qrPayload} size={220} color="#000" backgroundColor="#fff" quietZone={10} />
                            </View>
                            <View style={styles.qrPulse} />
                        </View>

                        <Text style={styles.modalHint}>Students scan this to mark attendance</Text>
                        
                        <View style={styles.activeStatus}>
                            <View style={styles.pulseDot} />
                            <Text style={styles.activeText}>QR CODE ACTIVE</Text>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontFamily: 'Tanker', fontSize: 32, color: '#fff', letterSpacing: 1 },
    subTitle: { fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.faculty, letterSpacing: 2 },
    
    broadcastTrigger: { borderRadius: 12, overflow: 'hidden', elevation: 10, shadowColor: colors.neonGreen, shadowOpacity: 0.3, shadowRadius: 10 },
    broadcastGrad: { paddingHorizontal: 15, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
    broadcastText: { fontFamily: 'Satoshi-Black', fontSize: 10, color: '#000', letterSpacing: 1 },

    classSection: { marginBottom: 30 },
    secLabel: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.textDim, letterSpacing: 3, marginLeft: 24, marginBottom: 15 },
    classScroll: { paddingHorizontal: 24, gap: 12 },
    classCardWrapper: { borderRadius: 20, overflow: 'hidden' },
    classCard: { width: 140, padding: 20, borderWidth: 1, borderColor: colors.border },
    classCode: { fontFamily: 'Satoshi-Black', fontSize: 12, color: colors.textDim, marginBottom: 5 },
    className: { fontFamily: 'Tanker', fontSize: 16, color: '#fff' },

    monitorHub: { flex: 1, paddingHorizontal: 24 },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 30 },
    statBox: { flex: 1, padding: 24, borderRadius: 24, borderWidth: 1, alignItems: 'center', overflow: 'hidden' },
    statVal: { fontFamily: 'Tanker', fontSize: 36, color: colors.neonGreen },
    statLab: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.textDim, letterSpacing: 1 },

    logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    logLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    refreshText: { fontFamily: 'Satoshi-Black', fontSize: 8, letterSpacing: 1 },

    chartSection: { marginBottom: 30 },
    chartGlass: { borderRadius: 24, padding: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },

    listPadding: { paddingBottom: 100 },
    studentRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    studentInfo: { flex: 1 },
    studentName: { fontFamily: 'Tanker', fontSize: 15, color: '#fff', letterSpacing: 0.5 },
    studentRoll: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: colors.textDim, marginTop: 4 },
    timeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 15 },
    timeText: { fontFamily: 'Satoshi-Black', fontSize: 9, color: '#fff' },
    statusIndicator: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.faculty + '40' },

    emptyBox: { alignItems: 'center', marginTop: 100, gap: 15 },
    emptyText: { fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.textDim, letterSpacing: 2 },

    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: width - 48, padding: 30, backgroundColor: colors.bg, borderRadius: 40, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    closeModal: { alignSelf: 'flex-end', padding: 10 },
    modalTitle: { fontFamily: 'Tanker', fontSize: 24, color: '#fff', letterSpacing: 1 },
    modalSub: { fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.neonGreen, marginTop: 8, textAlign: 'center' },
    qrContainer: { marginVertical: 30, padding: 15, borderRadius: 30, backgroundColor: '#fff', elevation: 20, shadowColor: colors.neonGreen, shadowOpacity: 0.5, shadowRadius: 30 },
    qrBg: { borderRadius: 20, overflow: 'hidden' },
    qrPulse: { ...StyleSheet.absoluteFillObject, borderWidth: 4, borderColor: colors.neonGreen, borderRadius: 30, opacity: 0.2 },
    modalHint: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.textDim, letterSpacing: 2, marginBottom: 20 },
    activeStatus: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.neonGreen + '10', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.neonGreen },
    activeText: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.neonGreen, letterSpacing: 1 }
});

