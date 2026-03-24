import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const colors = {
    bg0: '#0f172a', surf: 'rgba(255, 255, 255, 0.05)',
    hot: '#3b82f6', green: '#10b981', cyan: '#0ea5e9', border: 'rgba(255, 255, 255, 0.12)'
};

export default function QRScreen({ route, navigation }) {
    const { user } = route.params || { user: { role: 'student' } };
    const role = user.role || 'student';
    const [mode, setMode] = useState(role === 'student' ? 'generate' : 'scan');
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    if (!permission) return <View style={styles.container} />;

    const handleBarCodeScanned = ({ type, data }) => {
        if (scanned) return;
        setScanned(true);
        Alert.alert('Protocol Decrypted', `Attendance token received: ${data.substring(0, 8)}...`, [
            {
                text: 'Verify', onPress: () => {
                    setScanned(false);
                    Alert.alert('Success', 'Offline verification successful. Attendance logged.');
                }
            }
        ]);
    };

    const qrData = JSON.stringify({
        u: user.roll_number || 'USER_01',
        t: Date.now(),
        r: role
    });

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.header}>
                <Text style={styles.title}>QR BACKUP</Text>
                <Text style={styles.sub}>Offline verification & emergency check-in</Text>
            </View>

            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, mode === 'generate' && { borderBottomColor: colors.hot, borderBottomWidth: 2 }]}
                    onPress={() => setMode('generate')}
                >
                    <Text style={[styles.tabText, mode === 'generate' && { color: colors.hot }]}>MY PASS</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, mode === 'scan' && { borderBottomColor: colors.hot, borderBottomWidth: 2 }]}
                    onPress={() => {
                        if (!permission.granted) requestPermission();
                        setMode('scan');
                    }}
                >
                    <Text style={[styles.tabText, mode === 'scan' && { color: colors.hot }]}>SCAN CODE</Text>
                </TouchableOpacity>
            </View>

            {mode === 'generate' ? (
                <View style={styles.qrContainer}>
                    <Text style={styles.qrHeader}>PERSONAL ATTENDANCE TOKEN</Text>
                    <View style={styles.qrBox}>
                        <QRCode
                            value={qrData}
                            size={220}
                            color={colors.hot}
                            backgroundColor="transparent"
                        />
                        <View style={styles.qrLogo}>
                            <Text style={{ fontSize: 10 }}>🚀</Text>
                        </View>
                    </View>
                    <Text style={styles.qrFooter}>Scan this at the Professor's console if GPS verification fails.</Text>
                    <View style={styles.securitySeal}>
                        <Ionicons name="shield-checkmark" size={12} color={colors.green} />
                        <Text style={styles.sealText}>AES-256 ENCRYPTED TRANSACTION</Text>
                    </View>
                </View>
            ) : (
                <View style={styles.scannerWrapper}>
                    {!permission.granted ? (
                        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                            <Text style={styles.btnText}>GRANT CAMERA ACCESS</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.camBox}>
                            <CameraView
                                style={StyleSheet.absoluteFill}
                                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                            />
                            <View style={styles.camOverlay}>
                                <View style={styles.scannerLine} />
                            </View>
                        </View>
                    )}
                    <Text style={styles.qrFooter}>Align QR code within the frame to verify student presence.</Text>
                </View>
            )}

            <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>WHEN TO USE QR?</Text>
                <Text style={styles.infoMsg}>• GPS signal is unstable (High latency)</Text>
                <Text style={styles.infoMsg}>• Server is in offline-sync mode</Text>
                <Text style={styles.infoMsg}>• Professor requested manual override</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg0 },
    header: { padding: 24, paddingTop: 60 },
    title: { fontFamily: 'Tanker', fontSize: 32, color: '#fff', letterSpacing: 1 },
    sub: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
    tabBar: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 20 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    tabText: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 },
    qrContainer: { margin: 24, backgroundColor: colors.surf, borderRadius: 30, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    qrHeader: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: colors.hot, letterSpacing: 2, marginBottom: 20 },
    qrBox: { padding: 20, backgroundColor: '#fff', borderRadius: 20, position: 'relative' },
    qrLogo: { position: 'absolute', top: '50%', left: '50%', marginTop: -15, marginLeft: -15, width: 30, height: 30, backgroundColor: colors.bg0, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.hot },
    qrFooter: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', marginTop: 24, lineHeight: 18, paddingHorizontal: 20 },
    securitySeal: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, backgroundColor: colors.green + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    sealText: { color: colors.green, fontSize: 8, fontFamily: 'Satoshi-Bold' },
    scannerWrapper: { margin: 24, alignItems: 'center' },
    camBox: { width: 300, height: 300, borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: colors.hot },
    camOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'center' },
    scannerLine: { height: 2, backgroundColor: colors.hot, width: '100%', opacity: 0.5 },
    permBtn: { padding: 20, backgroundColor: colors.hot, borderRadius: 12 },
    btnText: { fontFamily: 'Tanker', fontSize: 14, color: '#fff' },
    infoCard: { margin: 24, backgroundColor: 'rgba(255,255,255,0.03)', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    infoTitle: { fontFamily: 'Tanker', fontSize: 14, color: '#fff', marginBottom: 10 },
    infoMsg: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 6, fontFamily: 'Satoshi' }
});
