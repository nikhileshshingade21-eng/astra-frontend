import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    StatusBar,
    Dimensions,
    Platform,
    UIManager
} from 'react-native';
import { Camera, useCameraPermission, useCodeScanner, useCameraDevice } from 'react-native-vision-camera';
import { useIsFocused } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import LinearGradient from 'react-native-linear-gradient';
// import { BlurView } from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming, 
    withSequence 
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

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

const IsolatedQRScanner = ({ roleColor, onScan }) => {
    const device = useCameraDevice('back');
    const codeScanner = useCodeScanner({
        codeTypes: ['qr'],
        onCodeScanned: (codes) => {
            if (codes.length > 0) onScan(codes[0].value);
        }
    });

    if (!device) return null;
    return (
        <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            codeScanner={codeScanner}
        />
    );
};

export default function QRScreen({ route, navigation }) {
    const { user } = route.params || { user: { role: 'student', name: 'OPERATOR' } };
    const role = user.role || 'student';
    // Students get Pink, Faculty/Admin get Purple/Blue
    const roleColor = role === 'admin' ? colors.neonBlue : (role === 'faculty' ? colors.neonPurple : colors.neonPink);

    const [mode, setMode] = useState('generate'); // Students can scan too now
    const isFocused = useIsFocused();
    const { hasPermission, requestPermission } = useCameraPermission();
    const [scanned, setScanned] = useState(false);

    // Animations
    const scanLinePos = useSharedValue(0);
    const cornerBase = useSharedValue(1);

    useEffect(() => {
        scanLinePos.value = withRepeat(withTiming(1, { duration: 2500 }), -1, true);
        cornerBase.value = withRepeat(withTiming(1.2, { duration: 1000 }), -1, true);
    }, []);

    const scanLineStyle = useAnimatedStyle(() => ({
        top: scanLinePos.value * 280,
    }));

    const cornerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: cornerBase.value }],
        opacity: cornerBase.value - 0.2
    }));

    const processScan = (data) => {
        Alert.alert('QR Scanned', `Data: ${data.substring(0, 20)}...`, [
            {
                text: 'OK', onPress: () => {
                    setScanned(false);
                }
            }
        ]);
    };

    const qrData = JSON.stringify({
        u: user.roll_number || user.id,
        t: Date.now(),
        r: role,
        v: 'VAULT_v2'
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>My QR Code</Text>
                    <Text style={[styles.sub, { color: roleColor }]}>Your Identity Pass</Text>
                </View>
            </View>

            <View style={styles.tabContainer}>
                <View blurType="dark" blurAmount={3} style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tab, mode === 'generate' && { backgroundColor: roleColor + '20' }]}
                        onPress={() => setMode('generate')}
                    >
                        <Text style={[styles.tabText, mode === 'generate' && { color: roleColor }]}>MY QR CODE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, mode === 'scan' && { backgroundColor: roleColor + '20' }]}
                        onPress={() => {
                            if (!hasPermission) requestPermission();
                            setMode('scan');
                        }}
                    >
                        <Text style={[styles.tabText, mode === 'scan' && { color: roleColor }]}>SCAN QR</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {mode === 'generate' ? (
                    <View style={styles.qrDisplay}>
                        <View blurType="dark" blurAmount={10} style={[styles.qrVaultCard, { borderColor: roleColor + '40' }]}>
                            <Text style={[styles.vaultTitle, { color: roleColor }]}>YOUR IDENTITY PASS</Text>
                            <View style={styles.qrShadowBox}>
                                <View style={styles.qrInner}>
                                    <QRCode
                                        value={qrData}
                                        size={200}
                                        color="#000"
                                        backgroundColor="#fff"
                                        quietZone={10}
                                    />
                                </View>
                                <View style={[styles.qrOverlay, { borderColor: roleColor }]} />
                            </View>
                            <View style={styles.vaultFooter}>
                                <Ionicons name="shield-checkmark" size={14} color={colors.neonGreen} />
                                <Text style={styles.vaultFooterText}>{user.roll_number || user.id} • Active</Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={styles.scannerDisplay}>
                        {!hasPermission ? (
                            <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                                <LinearGradient colors={[roleColor, '#000']} style={styles.permGrad}>
                                    <Text style={styles.permText}>ALLOW CAMERA</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        ) : (
                            <View style={[styles.camFrame, { borderColor: roleColor + '40' }]}>
                                {mode === 'scan' && isFocused && (
                                    <IsolatedQRScanner 
                                        roleColor={roleColor}
                                        onScan={(payload) => {
                                            if (!scanned) {
                                                setScanned(true);
                                                processScan(payload);
                                            }
                                        }}
                                    />
                                )}
                                <View style={styles.camInterface}>
                                    <Animated.View style={[styles.corner, styles.tl, cornerStyle, { borderColor: roleColor }]} />
                                    <Animated.View style={[styles.corner, styles.tr, cornerStyle, { borderColor: roleColor }]} />
                                    <Animated.View style={[styles.corner, styles.bl, cornerStyle, { borderColor: roleColor }]} />
                                    <Animated.View style={[styles.corner, styles.br, cornerStyle, { borderColor: roleColor }]} />
                                    <Animated.View style={[styles.scanLine, scanLineStyle, { backgroundColor: roleColor }]} />
                                </View>
                            </View>
                        )}
                        <Text style={styles.displayHint}>Point camera at the QR code</Text>
                    </View>
                )}

                <View style={styles.protocolHub}>
                    <Text style={styles.protocolTitle}>HELPFUL INFO</Text>
                    <View blurType="dark" blurAmount={3} style={styles.protocolCard}>
                        <PROTOCOL_ITEM icon="wifi-outline" label="No Internet?" val="Use QR Code" color={colors.neonBlue} />
                        <PROTOCOL_ITEM icon="sync-outline" label="Offline Mode" val="Available" color={colors.neonPurple} />
                        <PROTOCOL_ITEM icon="finger-print-outline" label="Identity Check" val="Required" color={colors.neonGreen} />
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const PROTOCOL_ITEM = ({ icon, label, val, color }) => (
    <View style={styles.protoItem}>
        <Ionicons name={icon} size={18} color={color} />
        <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.protoLab}>{label}</Text>
            <Text style={[styles.protoVal, { color }]}>{val}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 25, flexDirection: 'row', alignItems: 'center', gap: 15 },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    title: { fontFamily: 'Tanker', fontSize: 28, color: '#fff', letterSpacing: 1 },
    sub: { fontFamily: 'Satoshi-Black', fontSize: 9, letterSpacing: 2 },

    tabContainer: { paddingHorizontal: 24, marginBottom: 30 },
    tabBar: { flexDirection: 'row', borderRadius: 16, overflow: 'hidden', padding: 4, borderWidth: 1, borderColor: colors.border },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
    tabText: { fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.textDim, letterSpacing: 1 },

    scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
    qrDisplay: { alignItems: 'center' },
    qrVaultCard: { width: width - 48, padding: 30, borderRadius: 32, borderWidth: 1, alignItems: 'center', overflow: 'hidden' },
    vaultTitle: { fontFamily: 'Satoshi-Black', fontSize: 10, letterSpacing: 2, marginBottom: 25 },
    qrShadowBox: { padding: 10, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    qrInner: { borderRadius: 16, overflow: 'hidden' },
    qrOverlay: { ...StyleSheet.absoluteFillObject, borderWidth: 2, opacity: 0.1, borderRadius: 16 },
    vaultFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 25, paddingHorizontal: 15, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20 },
    vaultFooterText: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, letterSpacing: 1 },

    scannerDisplay: { alignItems: 'center' },
    camFrame: { width: 300, height: 300, borderRadius: 32, overflow: 'hidden', borderWidth: 1 },
    camInterface: { ...StyleSheet.absoluteFillObject, padding: 20 },
    corner: { position: 'absolute', width: 25, height: 25, borderWidth: 3 },
    tl: { top: 20, left: 20, borderBottomWidth: 0, borderRightWidth: 0 },
    tr: { top: 20, right: 20, borderBottomWidth: 0, borderLeftWidth: 0 },
    bl: { bottom: 20, left: 20, borderTopWidth: 0, borderRightWidth: 0 },
    br: { bottom: 20, right: 20, borderTopWidth: 0, borderLeftWidth: 0 },
    scanLine: { position: 'absolute', left: 20, right: 20, height: 2, opacity: 0.8 },
    displayHint: { marginTop: 20, fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.textDim, letterSpacing: 2 },

    permBtn: { width: '100%', height: 60, borderRadius: 20, overflow: 'hidden' },
    permGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    permText: { fontFamily: 'Tanker', fontSize: 16, color: '#fff', letterSpacing: 1 },

    protocolHub: { marginTop: 40 },
    protocolTitle: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.textDim, letterSpacing: 3, marginBottom: 15 },
    protocolCard: { padding: 24, borderRadius: 24, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', gap: 20 },
    protoItem: { flexDirection: 'row', alignItems: 'center' },
    protoLab: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, letterSpacing: 1 },
    protoVal: { fontFamily: 'Tanker', fontSize: 14, marginTop: 2 }
});

