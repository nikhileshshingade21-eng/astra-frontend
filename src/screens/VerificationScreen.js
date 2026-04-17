import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    StatusBar,
    Dimensions,
    Platform,
    UIManager,
    ActivityIndicator
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as SecureStore from '../utils/storage';
import QRCode from 'react-native-qrcode-svg';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming, 
    withSequence,
    LayoutAnimation
} from 'react-native-reanimated';
import { fetchWithTimeout } from '../utils/api';
import Colors from '../theme/colors';
import AstraTouchable from '../components/AstraTouchable';
import { API_BASE } from '../api/config';

const { width } = Dimensions.get('window');
const VERIFICATION_TIME = 45;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const colors = Colors;

export default function VerificationScreen({ route, navigation }) {
    const [timeLeft, setTimeLeft] = useState(VERIFICATION_TIME);
    const [isActive, setIsActive] = useState(false);
    const [verifiedCount, setVerifiedCount] = useState(0);
    const [gridData, setGridData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [activeClass, setActiveClass] = useState(route?.params?.classId || null);
    const [socket, setSocket] = useState(null);

    const pulse = useSharedValue(1);

    useEffect(() => {
        loadUsers();
        setupSocket();
        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, []);

    const loadUsers = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const uStr = await SecureStore.getItemAsync('user');
            if (uStr) setUser(JSON.parse(uStr));

            const res = await fetchWithTimeout(`/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok && res.data) {
                const studentUsers = (res.data.users || []).filter(u => u.role === 'student').map(u => ({
                    id: u.roll_number?.toUpperCase() || `U${u.id}`,
                    verified: false
                }));
                while (studentUsers.length < 30) {
                    studentUsers.push({ id: `GS${studentUsers.length + 100}`, verified: false });
                }
                setGridData(studentUsers.slice(0, 30));
            }
        } catch (e) {
            console.log('Error fetching verification users:', e);
        } finally {
            setLoading(false);
        }
    };

    const setupSocket = async () => {
        try {
            const ioLib = require('socket.io-client');
            const ioConnect = ioLib.io || ioLib.default || ioLib;
            const newSocket = ioConnect(API_BASE.replace('/api', ''), {
                transports: ['websocket'],
                reconnection: true
            });
            
            newSocket.on('connect', () => {
                console.log('[SOCKET] Connected to ASTRA_CORE');
                if (activeClass) newSocket.emit('join_class', activeClass);
            });

            setSocket(newSocket);
        } catch (e) {
            console.error('Socket setup failed:', e);
        }
    };

    useEffect(() => {
        if (socket && activeClass && isActive) {
            const eventName = 'ATTENDANCE_MARKED';
            socket.on(eventName, (payload) => {
                // Handle standardized contract payload { data: { roll_number, ... } }
                const data = payload.data || payload; 
                const roll = data.roll_number;
                
                console.log('[SOCKET] Standardized verification received:', roll);
                if (roll) {
                    setGridData(prev => {
                        return prev.map(s => s.id === roll ? { ...s, verified: true } : s);
                    });
                    setVerifiedCount(c => c + 1);
                }
            });
            return () => socket.off(eventName);
        }
    }, [socket, activeClass, isActive]);

    useEffect(() => {
        let timer;
        if (isActive && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setIsActive(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isActive, timeLeft]);

    useEffect(() => {
        if (isActive) {
            pulse.value = withRepeat(withTiming(1.1, { duration: 800 }), -1, true);
        } else {
            pulse.value = 1;
        }
    }, [isActive]);

    const handleStart = () => {
        setIsActive(true);
        setTimeLeft(VERIFICATION_TIME);
        setVerifiedCount(0);
        setGridData(prev => prev.map(s => ({ ...s, verified: false })));
    };

    const handleStop = () => {
        setIsActive(false);
        setTimeLeft(VERIFICATION_TIME);
    };

    const timerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
        borderColor: isActive ? colors.neonBlue : colors.border,
        shadowColor: colors.neonBlue,
        shadowOpacity: isActive ? 0.5 : 0,
        shadowRadius: 20
    }));

    const progressPercentage = gridData.length > 0 ? (verifiedCount / gridData.length) * 100 : 0;

    // QR Data for student scanning
    const qrPayload = JSON.stringify({
        c: 'BROADCAST',
        id: activeClass,
        t: Date.now(),
        v: 'AUTH_SESSION_v3_REAL',
        f: user?.id || 0
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <AstraTouchable onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </AstraTouchable>
                <View>
                    <Text style={styles.title}>Verification</Text>
                    <Text style={[styles.sub, { color: isActive ? colors.neonGreen : colors.textDim }]}>
                        STATUS: {isActive ? 'ACTIVE' : 'STOPPED'}
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.timerHub}>
                    <Animated.View style={[styles.timerCircle, timerStyle]}>
                        <Text style={[styles.timeVal, { color: isActive ? '#fff' : colors.textDim }]}>{timeLeft}s</Text>
                        <Text style={styles.timeLab}>REMAINING</Text>
                    </Animated.View>
                </View>

                {!isActive ? (
                    <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
                        <LinearGradient colors={[colors.neonBlue, colors.neonPurple]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.startBtnGrad}>
                            <Ionicons name="flash-outline" size={20} color="#000" style={{ marginRight: 10 }} />
                            <Text style={styles.startBtnText}>START VERIFICATION</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
                        <View style={styles.stopContent}>
                            <Ionicons name="close-circle-outline" size={20} color={colors.hot} style={{ marginRight: 10 }} />
                            <Text style={styles.stopBtnText}>STOP</Text>
                        </View>
                    </TouchableOpacity>
                )}

                {isActive && (
                    <View style={styles.qrBroadcast}>
                        <View style={styles.qrCard}>
                            <Text style={styles.qrLabel}>SCAN TO MARK ATTENDANCE</Text>
                            <View style={styles.qrBox}>
                                <QRCode value={qrPayload} size={150} color="#000" backgroundColor="#fff" quietZone={10} />
                                <View style={styles.qrGlow} />
                            </View>
                            <Text style={styles.qrSub}>Expires in: {timeLeft}s</Text>
                        </View>
                    </View>
                )}

                <View style={styles.statsStrip}>
                    <View style={styles.statChip}>
                        <Text style={styles.chipVal}>{verifiedCount}</Text>
                        <Text style={styles.chipLab}>VERIFIED</Text>
                    </View>
                    <View style={styles.statChip}>
                        <Text style={styles.chipVal}>{gridData.length - verifiedCount}</Text>
                        <Text style={styles.chipLab}>PENDING</Text>
                    </View>
                    <View style={styles.statChip}>
                        <Text style={[styles.chipVal, { color: colors.neonGreen }]}>{Math.round(progressPercentage)}%</Text>
                        <Text style={styles.chipLab}>YIELD</Text>
                    </View>
                </View>

                <View style={styles.gridFrame}>
                    <Text style={styles.gridTitle}>LIVE ATTENDANCE TRACKER</Text>
                    <View style={styles.grid}>
                        {gridData.map((node, i) => (
                            <View 
                                key={i} 
                                style={[
                                    styles.gridNode, 
                                    node.verified ? { backgroundColor: colors.neonGreen + '20', borderColor: colors.neonGreen } : { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: colors.border }
                                ]}
                            >
                                <Text style={[styles.nodeText, node.verified && { color: colors.neonGreen }]}>{node.id.slice(-2)}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 15 },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    title: { fontFamily: 'Tanker', fontSize: 26, color: '#fff', letterSpacing: 1 },
    sub: { fontFamily: 'Satoshi-Black', fontSize: 9, letterSpacing: 2, marginTop: 4 },

    scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
    timerHub: { alignItems: 'center', marginVertical: 30 },
    timerCircle: { width: 180, height: 180, borderRadius: 90, borderWidth: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.01)' },
    timeVal: { fontFamily: 'Tanker', fontSize: 54, letterSpacing: 2 },
    timeLab: { fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.textDim, letterSpacing: 2, marginTop: -5 },

    startBtn: { borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
    startBtnGrad: { height: 60, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    startBtnText: { fontFamily: 'Tanker', fontSize: 18, color: '#000', letterSpacing: 1 },

    stopBtn: { height: 60, borderRadius: 20, borderWidth: 1, borderColor: colors.hot + '40', backgroundColor: 'rgba(255, 61, 113, 0.05)', marginBottom: 20 },
    stopContent: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    stopBtnText: { fontFamily: 'Tanker', fontSize: 18, color: colors.hot, letterSpacing: 1 },

    qrBroadcast: { marginBottom: 30, alignItems: 'center' },
    qrCard: { width: '100%', padding: 30, borderRadius: 32, borderWidth: 1, borderColor: colors.neonBlue + '20', alignItems: 'center', overflow: 'hidden' },
    qrLabel: { fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.neonBlue, letterSpacing: 2, marginBottom: 20 },
    qrBox: { padding: 10, borderRadius: 24, backgroundColor: '#fff', shadowColor: colors.neonBlue, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
    qrGlow: { position: 'absolute', inset: -10, borderRadius: 30, borderWidth: 2, borderColor: colors.neonBlue, opacity: 0.2 },
    qrSub: { marginTop: 20, fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, letterSpacing: 3 },

    statsStrip: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    statChip: { flex: 1, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: colors.border, alignItems: 'center', overflow: 'hidden' },
    chipVal: { fontFamily: 'Tanker', fontSize: 22, color: '#fff' },
    chipLab: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, letterSpacing: 1 },

    gridFrame: { padding: 24, borderRadius: 32, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.01)' },
    gridTitle: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, letterSpacing: 2, textAlign: 'center', marginBottom: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
    gridNode: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    nodeText: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.textDim }
});
