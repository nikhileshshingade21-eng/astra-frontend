import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    Dimensions,
    Platform,
    UIManager,
    Modal
} from 'react-native';
import * as SecureStore from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
// import { BlurView } from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Geolocation from 'react-native-geolocation-service';
import { authenticateWithBiometrics } from '../utils/biometrics';
import { Camera, useCameraDevice, useCodeScanner, useCameraPermission } from 'react-native-vision-camera';
import CryptoJS from 'crypto-js';

import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming, 
    withSequence,
    interpolateColor,
    FadeInDown
} from 'react-native-reanimated';
import { API_BASE } from '../api/config';
import { fetchWithTimeout } from '../utils/api';
import { getUniqueDeviceId } from '../utils/device';

const { width, height } = Dimensions.get('window');

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

export default function AttendanceScreen({ route, navigation }) {
    const { user, classId: paramClassId } = route.params || { user: {} };
    const [loading, setLoading] = useState(false);
    const [gpsStatus, setGpsStatus] = useState('finding'); // finding, found, error
    const [location, setLocation] = useState(null);
    const [selectedClassId, setSelectedClassId] = useState(paramClassId || null);
    const [classes, setClasses] = useState([]);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isBunkModalOpen, setIsBunkModalOpen] = useState(false);
    const [stats, setStats] = useState(null);
    const device = useCameraDevice('back');
    const frontDevice = useCameraDevice('front');
    const { hasPermission: hasCamPermission, requestPermission: requestCamPermission } = useCameraPermission();
    const attendanceCamera = React.useRef(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authStep, setAuthStep] = useState(1); // 1: Biometric, 2: Face Scan
    const [faceImage, setFaceImage] = useState(null);

    // Animation Shared Values
    const scannerPos = useSharedValue(0);
    const pulseScale = useSharedValue(1);

    useEffect(() => {
        getLocation();
        loadClasses();
        loadStats();
        pulseScale.value = withRepeat(withTiming(1.1, { duration: 1000 }), -1, true);
    }, []);

    useEffect(() => {
        if (loading) {
            scannerPos.value = withRepeat(withTiming(1, { duration: 1500 }), -1, true);
        } else {
            scannerPos.value = 0;
        }
    }, [loading]);

    const loadStats = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/dashboard/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) {
                navigation.replace('Auth');
                return;
            }
            if (res.ok && res.data) {
                setStats(res.data);
            }
        } catch (e) {}
    };

    const loadClasses = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const userStr = await SecureStore.getItemAsync('user');
            let prog = 'all', sec = 'all';
            if (userStr) {
                const u = JSON.parse(userStr);
                prog = u.programme || 'all';
                sec = u.section || 'all';
            }
            const url = `/api/timetable?programme=${encodeURIComponent(prog)}&section=${encodeURIComponent(sec)}`;
            const res = await fetchWithTimeout(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) {
                navigation.replace('Auth');
                return;
            }
            if (res.ok && res.data) {
                setClasses(res.data.classes || []);
            } else {
                console.warn('[Attendance] Load classes failed:', res.data?.error || res.status);
            }
        } catch (e) {
            console.log('Load classes err', e);
        }
    };

    const getLocation = async () => {
        setGpsStatus('finding');
        try {
            const auth = await Geolocation.requestAuthorization('whenInUse');
            if (auth !== 'granted') {
                setGpsStatus('error');
                return;
            }
            Geolocation.getCurrentPosition(
                (position) => {
                    setLocation(position.coords);
                    setGpsStatus('found');
                },
                (error) => {
                    console.error('GPS Link Failure:', error);
                    setGpsStatus('error');
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
            );
        } catch (e) {
            setGpsStatus('error');
        }
    };

    const runBiometric = async () => {
        const userStr = await SecureStore.getItemAsync('user');
        const currentUser = JSON.parse(userStr);
        const success = await authenticateWithBiometrics(
            `ASTRA_AUTH: Handshake req for ${currentUser.roll_number || 'Session'}`
        );
        if (success) {
            // Proceed to Face Scan step
            const permission = await requestCamPermission();
            if (permission) {
                setAuthStep(2);
            } else {
                Alert.alert('CAMERA_REQUIRED', 'Institutional protocol requires face verification to prevent proxy attendance.');
            }
        }
    };

    const captureAttendanceFace = async () => {
        if (attendanceCamera.current) {
            try {
                const photo = await attendanceCamera.current.takePhoto({
                    flash: 'off',
                    qualityPrioritization: 'quality'
                });
                const RNFS = require('react-native-fs');
                const base64 = await RNFS.readFile(photo.path, 'base64');
                const imgData = `data:image/jpeg;base64,${base64}`;
                setFaceImage(imgData);
                setIsAuthModalOpen(false);
                markAttendance(null, 'biometric+face', imgData);
            } catch (err) {
                Alert.alert('CAPTURE_ERROR', err.message);
            }
        }
    };


    const markAttendance = async (providedClassId = null, authMethodUsed = 'app_gps', faceImg = null) => {
        const classIdToUse = providedClassId || selectedClassId;
        const imgToUse = faceImg || faceImage;
        if (!location) return Alert.alert('SIGNAL_LOSS', 'Waiting for satellite fix...');
        
        // UI-LOCK: Prevent multi-click spam
        if (loading) return;

        setLoading(true);
        try {
            const token = await SecureStore.getItemAsync('token');
            const userStr = await SecureStore.getItemAsync('user');
            const u = JSON.parse(userStr);
            
            // SEC-006: Request Signing Protocol (HMAC-SHA256)
            const deviceId = await getUniqueDeviceId(); // Ensure this helper is reliable
            const timestamp = Date.now().toString();
            const nonce = Math.random().toString(36).substring(7);
            const signatureBase = `${timestamp}:${nonce}:${classIdToUse || 'general'}:${u.id}:${deviceId}`;
            const signature = CryptoJS.SHA256(signatureBase + 'ASTRA_PROTO_V4_SECRET').toString(CryptoJS.enc.Hex);

            const res = await fetchWithTimeout(`/api/attendance/mark`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}`,
                    'X-Astra-Timestamp': timestamp,
                    'X-Astra-Nonce': nonce,
                    'X-Astra-Signature': signature
                },
                body: JSON.stringify({
                    class_id: classIdToUse,
                    gps_lat: location.latitude,
                    gps_lng: location.longitude,
                    method: providedClassId ? 'qr_scan' : authMethodUsed,
                    face_image: imgToUse
                })
            });
            if (res.status === 401) {
                navigation.replace('Auth');
                return;
            }
            
            if (res.ok && res.data) {
                // SERVER_CONFIRM: Only trust server response
                Alert.alert('VERIFIED', `✓ SESSION_AUTH_CONFIRMED\nSTATUS: ${res.data.status?.toUpperCase()}\nCOORD_OFFSET: ${res.data.distance_m || 0}m`);
                if (isScannerOpen) setIsScannerOpen(false);
                loadStats();
            } else {
                Alert.alert('ACCESS_DENIED', res.data?.error || res.data?.message || 'Verification protocol failed.');
            }
        } catch (e) {
            Alert.alert('LINK_ERROR', 'Campus Hub unreachable.');
        }
        setLoading(false);
    };

    const codeScanner = useCodeScanner({
        codeTypes: ['qr'],
        onCodeScanned: (codes) => {
            if (codes.length > 0 && isScannerOpen) {
                const data = codes[0].value;
                try {
                    const payload = JSON.parse(data);
                    if (payload.c === 'BROADCAST') {
                        markAttendance(payload.id || selectedClassId);
                    } else {
                        Alert.alert('INVALID_SIG', 'Node identity could not be confirmed.');
                    }
                } catch (e) {
                    Alert.alert('DECODE_FAILURE', 'Unrecognized protocol signature.');
                }
                setIsScannerOpen(false);
            }
        }
    });

    const handleBarCodeScanned = ({ data }) => {
        // This is now handled by codeScanner
    };

    const scannerStyle = useAnimatedStyle(() => ({
        top: scannerPos.value * 230,
        opacity: loading ? 1 : 0
    }));

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
        opacity: loading ? 0.5 : 0.8
    }));

    const openScanner = async () => {
        const status = await Camera.requestCameraPermission();
        if (status === 'granted') {
            setIsScannerOpen(true);
        } else {
            Alert.alert('OPTICS_DISABLED', 'Camera access required for node scanning.');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>VERIFY_PRESENCE</Text>
                    <Text style={styles.sub}>BIOMETRIC_GPS_QR_ENCRYPTED_PROTO</Text>
                </View>
                <TouchableOpacity style={styles.bunkBtn} onPress={() => setIsBunkModalOpen(true)}>
                    <LinearGradient colors={[colors.neonPink, colors.neonPurple]} style={styles.bunkGrad}>
                        <Ionicons name="calculator" size={14} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            <View style={styles.classSection}>
                <View style={[styles.headerRow, { paddingHorizontal: 24, marginBottom: 15 }]}>
                    <Text style={styles.secLabel}>ACTIVE_SESSIONS</Text>
                    <TouchableOpacity style={styles.scanTrigger} onPress={openScanner}>
                        <LinearGradient colors={[colors.neonBlue, colors.neonPurple]} style={styles.scanTriggerGrad}>
                            <Ionicons name="qr-code-outline" size={16} color="#000" />
                            <Text style={styles.scanTriggerText}>SCAN_NODE</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classScroll}>
                    <TouchableOpacity
                        style={[styles.classChip, !selectedClassId && styles.classChipActive]}
                        onPress={() => setSelectedClassId(null)}
                    >
                        <View intensity={!selectedClassId ? 30 : 10} style={styles.chipGlass}>
                            <Text style={[styles.chipText, !selectedClassId && { color: colors.neonBlue }]}>GENERAL</Text>
                        </View>
                    </TouchableOpacity>
                    {classes.map(c => (
                        <TouchableOpacity
                            key={c.id}
                            style={[styles.classChip, selectedClassId === c.id && styles.classChipActive]}
                            onPress={() => setSelectedClassId(c.id)}
                        >
                            <View blurType="dark" blurAmount={selectedClassId === c.id ? 10 : 3} style={styles.chipGlass}>
                                <Text style={[styles.chipText, selectedClassId === c.id && { color: colors.neonBlue }]}>{c.code}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.gpsSection}>
                <View blurType="dark" blurAmount={5} style={styles.gpsCard}>
                    <View style={[styles.gpsDot, { 
                        backgroundColor: gpsStatus === 'found' ? colors.neonGreen : (gpsStatus === 'finding' ? colors.neonBlue : colors.hot) 
                    }]} />
                    <View style={styles.gpsInfo}>
                        <Text style={styles.gpsLabel}>
                            {gpsStatus === 'finding' ? 'ACQUIRING_SAT_LINK...' : gpsStatus === 'found' ? 'SIGNAL_LOCKED' : 'GPS_LINK_FAILURE'}
                        </Text>
                        {location && (
                            <Text style={styles.gpsCoords}>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</Text>
                        )}
                    </View>
                    {gpsStatus === 'error' && (
                        <TouchableOpacity onPress={getLocation} style={styles.retryBtn}>
                            <Ionicons name="refresh" size={16} color={colors.hot} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.verifyHub}>
                <Animated.View style={[styles.glowRing, pulseStyle, { borderColor: loading ? colors.neonBlue : colors.neonGreen }]} />
                <TouchableOpacity
                    style={[styles.verifyBtn, (loading || gpsStatus !== 'found') && styles.verifyBtnOff]}
                    onPress={() => {
                        setAuthStep(1);
                        setFaceImage(null);
                        setIsAuthModalOpen(true);
                    }}
                    disabled={loading || gpsStatus !== 'found'}
                    activeOpacity={0.8}
                >
                    <View blurType="dark" blurAmount={10} style={styles.btnGlass}>
                        {loading ? (
                            <ActivityIndicator size="large" color={colors.neonBlue} />
                        ) : (
                            <Ionicons name="finger-print" size={80} color={gpsStatus === 'found' ? colors.neonGreen : colors.textDim} />
                        )}
                        <Animated.View style={[styles.scanLine, scannerStyle, { backgroundColor: colors.neonBlue }]} />
                    </View>
                </TouchableOpacity>
                <Text style={styles.hintText}>{loading ? 'PROCESSING_BIOMETRICS...' : 'INITIATE_HANDSHAKE'}</Text>
            </View>

            {/* Biometric/Face Auth Modal */}
            <Modal visible={isAuthModalOpen} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(2, 6, 23, 0.8)' }]} />
                    <View style={styles.authModalContent}>
                        <View style={styles.bioMethodBox}>
                            {authStep === 1 ? (
                                <>
                                    <Text style={styles.bioModalTitle}>STEP_1: BIOMETRIC_HANDSHAKE</Text>
                                    <Text style={styles.bioModalUser}>ROLL: {user.roll_number || 'UNKNOWN'}</Text>
                                    
                                    <TouchableOpacity onPress={runBiometric} style={styles.bioIconBox}>
                                        <View style={styles.iconPulseRing} />
                                        <Ionicons name="finger-print" size={80} color={colors.neonBlue} />
                                    </TouchableOpacity>
                                    
                                    <Text style={styles.bioModalHint}>SCAN_FINGERPRINT_TO_INITIALIZE</Text>
                                    
                                    <TouchableOpacity 
                                        style={styles.initiateAuthBtn} 
                                        onPress={runBiometric}
                                    >
                                        <LinearGradient colors={[colors.neonBlue, colors.neonPurple]} style={styles.authBtnGrad}>
                                            <Text style={styles.authBtnText}>AUTHORIZE_IDENTITY</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.bioModalTitle}>STEP_2: FACE_VERIFICATION</Text>
                                    <Text style={styles.bioModalUser}>AWAITING_LIVE_CAPTURE</Text>
                                    
                                    <View style={styles.faceCaptureBox}>
                                        {frontDevice && hasCamPermission ? (
                                            <Camera
                                                ref={attendanceCamera}
                                                style={StyleSheet.absoluteFill}
                                                device={frontDevice}
                                                isActive={true}
                                                photo={true}
                                            />
                                        ) : (
                                            <View style={styles.facePlaceholder}>
                                                <Ionicons name="camera-reverse" size={48} color={colors.neonBlue} />
                                            </View>
                                        )}
                                        <View style={[styles.corner, styles.tl]} />
                                        <View style={[styles.corner, styles.tr]} />
                                        <View style={[styles.corner, styles.bl]} />
                                        <View style={[styles.corner, styles.br]} />
                                    </View>
                                    
                                    <Text style={styles.bioModalHint}>POSITION_FACE_IN_FRAME</Text>
                                    
                                    <TouchableOpacity 
                                        style={styles.initiateAuthBtn} 
                                        onPress={captureAttendanceFace}
                                    >
                                        <LinearGradient colors={[colors.neonGreen, colors.neonBlue]} style={styles.authBtnGrad}>
                                            <Text style={[styles.authBtnText, { color: '#000' }]}>CAPTURE_AND_VERIFY</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>

                        <TouchableOpacity style={styles.modalCancel} onPress={() => setIsAuthModalOpen(false)}>
                            <Text style={styles.cancelText}>ABORT_PROTOCOL</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Bunking Strategy Modal */}
            <Modal visible={isBunkModalOpen} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(2, 6, 23, 0.9)' }]} />
                    <View style={styles.bunkContent}>
                        <View style={styles.modalHeading}>
                            <Text style={styles.modalTitle}>BUNK_STRATEGY_ENGINE</Text>
                            <TouchableOpacity onPress={() => setIsBunkModalOpen(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                            <View style={styles.statsOverview}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statVal}>{stats?.percentage || 0}%</Text>
                                    <Text style={styles.statLab}>CURRENT_YIELD</Text>
                                </View>
                                <View style={styles.statBox}>
                                    {stats?.bunk_stats?.can_bunk > 0 ? (
                                        <>
                                            <Text style={[styles.statVal, { color: colors.neonGreen }]}>{stats.bunk_stats.can_bunk}</Text>
                                            <Text style={styles.statLab}>SAFE_BUNKS</Text>
                                        </>
                                    ) : (
                                        <>
                                            <Text style={[styles.statVal, { color: colors.hot }]}>{stats?.bunk_stats?.must_attend || 0}</Text>
                                            <Text style={styles.statLab}>REQ_SESSIONS</Text>
                                        </>
                                    )}
                                </View>
                            </View>

                            <Text style={styles.secTitle}>SUBJECT_BREAKDOWN</Text>
                            {stats?.subjects?.map((s, i) => (
                                <Animated.View key={i} entering={FadeInDown.delay(i * 100)}>
                                    <View style={[styles.subjectCard, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                                        <View style={styles.subjectInfo}>
                                            <Text style={styles.subjectCode}>{s.code}</Text>
                                            <Text style={styles.subjectName}>{s.name.toUpperCase()}</Text>
                                        </View>
                                        <View style={styles.subjectStatus}>
                                            <Text style={[styles.pctText, { color: s.pct >= 75 ? colors.neonGreen : colors.hot }]}>{s.pct}%</Text>
                                            {s.can_bunk > 0 ? (
                                                <View style={styles.bunkBadge}>
                                                    <Text style={styles.bunkBadgeText}>SAFE: {s.can_bunk} CLASSES</Text>
                                                </View>
                                            ) : (
                                                <View style={[styles.bunkBadge, { backgroundColor: colors.hot + '20' }]}>
                                                    <Text style={[styles.bunkBadgeText, { color: colors.hot }]}>CRITICAL: {s.must_attend} SESS</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </Animated.View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal visible={isScannerOpen} animationType="fade" transparent={false}>
                <View style={styles.scannerModal}>
                    {device && (
                        <Camera
                            style={StyleSheet.absoluteFill}
                            device={device}
                            isActive={isScannerOpen}
                            codeScanner={codeScanner}
                        />
                    )}
                    <View style={styles.scannerOverlay}>
                        <View style={styles.scannerHeader}>
                            <TouchableOpacity onPress={() => setIsScannerOpen(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={28} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.scannerTitle}>NODE_SCANNER</Text>
                        </View>
                        <View style={styles.scannerFrame}>
                            <View style={[styles.corner, styles.tl]} />
                            <View style={[styles.corner, styles.tr]} />
                            <View style={[styles.corner, styles.bl]} />
                            <View style={[styles.corner, styles.br]} />
                            <View style={styles.scannerLine} />
                        </View>
                        <Text style={styles.scannerHint}>ALIGN_BROADCAST_WITHIN_FRAME</Text>
                    </View>
                </View>
            </Modal>

            <View style={styles.footer}>
                <View style={[styles.statusPanel, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                    <View style={styles.statusItem}>
                        <Text style={styles.statusLab}>NODE_IDENTITY</Text>
                        <Text style={styles.statusVal}>{user.roll_number || 'AUTHORIZED'}</Text>
                    </View>
                    <View style={styles.hLine} />
                    <View style={styles.statusItem}>
                        <Text style={styles.statusLab}>TIME_SEQ</Text>
                        <Text style={styles.statusVal}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 25, flexDirection: 'row', alignItems: 'center', gap: 15 },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    title: { fontFamily: 'Tanker', fontSize: 28, color: '#fff', letterSpacing: 1 },
    sub: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.neonBlue, letterSpacing: 2 },
    bunkBtn: { width: 44, height: 44, borderRadius: 12, overflow: 'hidden' },
    bunkGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    classSection: { marginBottom: 30 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    secLabel: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.textDim, letterSpacing: 3 },
    scanTrigger: { borderRadius: 12, overflow: 'hidden' },
    scanTriggerGrad: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
    scanTriggerText: { fontFamily: 'Satoshi-Black', fontSize: 9, color: '#000', letterSpacing: 1 },
    
    classScroll: { paddingHorizontal: 24, gap: 12 },
    classChip: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'transparent' },
    classChipActive: { borderColor: colors.neonBlue },
    chipGlass: { paddingHorizontal: 20, paddingVertical: 12 },
    chipText: { fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.textDim, letterSpacing: 1 },

    gpsSection: { paddingHorizontal: 24, marginBottom: 40 },
    gpsCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    gpsDot: { width: 8, height: 8, borderRadius: 4, marginRight: 15 },
    gpsInfo: { flex: 1 },
    gpsLabel: { fontFamily: 'Satoshi-Black', fontSize: 10, color: '#fff', letterSpacing: 2 },
    gpsCoords: { fontFamily: 'Satoshi-Bold', fontSize: 9, color: colors.textDim, marginTop: 4 },
    retryBtn: { padding: 8 },

    verifyHub: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    glowRing: { position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 1, opacity: 0.5 },
    verifyBtn: { width: 230, height: 230, borderRadius: 115, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    verifyBtnOff: { opacity: 0.4 },
    btnGlass: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scanLine: { position: 'absolute', left: 0, right: 0, height: 3, shadowColor: colors.neonBlue, shadowOpacity: 0.8, shadowRadius: 10, elevation: 10 },
    hintText: { marginTop: 30, fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.textDim, letterSpacing: 2 },

    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    bunkContent: { height: height * 0.8, backgroundColor: colors.bg, borderTopLeftRadius: 40, borderTopRightRadius: 40, borderWidth: 1, borderColor: colors.border, padding: 30 },
    modalHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    modalTitle: { fontFamily: 'Tanker', fontSize: 24, color: '#fff', letterSpacing: 1 },
    
    statsOverview: { flexDirection: 'row', gap: 15, marginBottom: 40 },
    statBox: { flex: 1, padding: 24, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    statVal: { fontFamily: 'Tanker', fontSize: 32, color: colors.neonBlue },
    statLab: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, letterSpacing: 2, marginTop: 5 },

    secTitle: { fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.textDim, letterSpacing: 3, marginBottom: 20 },
    subjectCard: { padding: 20, borderRadius: 24, borderWidth: 1, borderColor: colors.border, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', overflow: 'hidden' },
    subjectInfo: { flex: 1 },
    subjectCode: { fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.textDim, marginBottom: 4 },
    subjectName: { fontFamily: 'Tanker', fontSize: 16, color: '#fff' },
    subjectStatus: { alignItems: 'flex-end' },
    pctText: { fontFamily: 'Tanker', fontSize: 20, marginBottom: 5 },
    bunkBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.neonGreen + '20' },
    bunkBadgeText: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.neonGreen, letterSpacing: 0.5 },

    scannerModal: { flex: 1, backgroundColor: '#000' },
    scannerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    scannerHeader: { position: 'absolute', top: 60, left: 24, right: 24, flexDirection: 'row', alignItems: 'center', gap: 15 },
    closeBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    scannerTitle: { fontFamily: 'Tanker', fontSize: 24, color: '#fff', letterSpacing: 1 },
    scannerFrame: { width: 280, height: 280, justifyContent: 'center', alignItems: 'center' },
    corner: { position: 'absolute', width: 30, height: 30, borderColor: colors.neonBlue, borderWidth: 4 },
    tl: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
    tr: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
    bl: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
    br: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
    scannerLine: { width: '80%', height: 2, backgroundColor: colors.neonBlue, shadowColor: colors.neonBlue, shadowOpacity: 0.8, shadowRadius: 10, elevation: 10 },
    scannerHint: { marginTop: 40, fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.neonBlue, letterSpacing: 2 },

    footer: { padding: 24, paddingBottom: 50 },
    statusPanel: { flexDirection: 'row', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', justifyContent: 'space-between' },
    statusItem: { alignItems: 'center', flex: 1 },
    statusLab: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, letterSpacing: 1, marginBottom: 5 },
    statusVal: { fontFamily: 'Tanker', fontSize: 14, color: '#fff' },
    hLine: { width: 1, height: '80%', backgroundColor: colors.border },
    authModalContent: { width: '88%', backgroundColor: '#0f172a', borderRadius: 40, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
    bioMethodBox: { width: '100%', alignItems: 'center' },
    bioModalTitle: { fontFamily: 'Tanker', fontSize: 18, color: '#fff', textAlign: 'center', letterSpacing: 1 },
    bioModalUser: { fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.neonBlue, letterSpacing: 2, marginTop: 6, marginBottom: 30 },
    bioIconBox: { width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(0, 242, 255, 0.02)', borderWidth: 1, borderColor: 'rgba(0, 242, 255, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
    iconPulseRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1, borderColor: 'rgba(0, 242, 255, 0.2)', opacity: 0.5 },
    faceCaptureBox: { width: 220, height: 220, borderRadius: 110, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginTop: 10, marginBottom: 25 },
    facePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
    bioModalHint: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: colors.textDim, letterSpacing: 1 },

    modalCancel: { marginTop: 15, paddingVertical: 10 },
    cancelText: { fontFamily: 'Satoshi-Black', fontSize: 11, color: colors.hot, letterSpacing: 2 },
    initiateAuthBtn: { width: '100%', height: 54, borderRadius: 16, overflow: 'hidden', marginTop: 30 },
    authBtnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    authBtnText: { fontFamily: 'Tanker', fontSize: 16, color: '#000', letterSpacing: 1 }
});

