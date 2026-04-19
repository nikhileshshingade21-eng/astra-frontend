import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AstraLottie from '../components/AstraLottie';
import WeatherWidget from '../components/WeatherWidget';

import notifee, { AndroidImportance } from '@notifee/react-native';

const colors = {
    bg: '#020617',
    neonBlue: '#00f2ff',
    neonGreen: '#00ffaa',
    hot: '#ff3d71',
    border: 'rgba(255, 255, 255, 0.08)',
};

export default function TestLottieScreen({ navigation }) {
    const [testType, setTestType] = useState('loading');

    const triggerNotification = async () => {
        try {
            await notifee.requestPermission();
            const channelId = await notifee.createChannel({
                id: 'astra-high-priority',
                name: 'ASTRA High Priority',
                importance: AndroidImportance.HIGH,
            });
            await notifee.displayNotification({
                title: 'ASTRA Component Test',
                body: 'This is a local dummy notification directly from the Test screen.',
                android: { channelId }
            });
        } catch (e) {
            console.error('Test notification failed:', e);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Component Test</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.label}>ANIMATION PREVIEW</Text>
                <View style={styles.lottiePreview}>
                    <AstraLottie type={testType} size={250} />
                    <Text style={styles.lottieType}>{testType.toUpperCase()}</Text>
                </View>

                <View style={styles.btnGrid}>
                    {['loading', 'success', 'error', 'location'].map(t => (
                        <TouchableOpacity 
                            key={t} 
                            style={[styles.btn, testType === t && styles.activeBtn]} 
                            onPress={() => setTestType(t)}
                        >
                            <Text style={styles.btnText}>{t.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>WEATHER WIDGET TEST</Text>
                <WeatherWidget />
                <Text style={styles.hint}>Verify timeout behavior by disabling network.</Text>

                <View style={styles.auditBox}>
                    <Text style={styles.label}>LOCAL NOTIFICATION TEST</Text>
                    <TouchableOpacity style={styles.ssBtn} onPress={triggerNotification}>
                        <Text style={styles.ssText}>Trigger Notification</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { padding: 24, paddingTop: 60, flexDirection: 'row', alignItems: 'center', gap: 20 },
    title: { fontFamily: 'Tanker', fontSize: 20, color: '#fff', letterSpacing: 1 },
    scroll: { padding: 24, paddingBottom: 100 },
    label: { fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.neonBlue, letterSpacing: 4, marginBottom: 20, marginTop: 40 },
    lottiePreview: { height: 350, borderRadius: 32, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
    lottieType: { fontFamily: 'Satoshi-Black', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 20, letterSpacing: 2 },
    btnGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
    btn: { flex: 1, minWidth: '45%', height: 50, borderRadius: 12, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
    activeBtn: { borderColor: colors.neonBlue, backgroundColor: colors.neonBlue + '20' },
    btnText: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: '#fff' },
    hint: { fontFamily: 'Satoshi', fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 10 },
    auditBox: { marginTop: 40, padding: 20, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: colors.border },
    ssBtn: { height: 50, borderRadius: 12, backgroundColor: colors.neonBlue, justifyContent: 'center', alignItems: 'center' },
    ssText: { fontFamily: 'Tanker', fontSize: 14, color: '#fff' }
});
