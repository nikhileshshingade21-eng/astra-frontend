import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, ImageBackground } from 'react-native';
import * as Location from 'expo-location';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../api/config';

const colors = {
    bg0: '#0f172a', surf: 'rgba(255, 255, 255, 0.05)',
    hot: '#3b82f6', purp: '#6366f1', oran: '#ff8a1f', green: '#10b981', danger: '#ff3b5c'
};

export default function AttendanceScreen({ route }) {
    const { user, classId: paramClassId } = route.params || { user: {} };
    const [loading, setLoading] = useState(false);
    const [gpsStatus, setGpsStatus] = useState('finding'); // finding, found, error
    const [location, setLocation] = useState(null);
    const [selectedClassId, setSelectedClassId] = useState(paramClassId || null);
    const [classes, setClasses] = useState([]);

    useEffect(() => {
        getLocation();
        loadClasses();
    }, []);

    const loadClasses = async () => {
        console.log('[DEBUG] Fetching classes from:', API_BASE);
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/timetable`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setClasses(data.classes || []);
                if (!selectedClassId && data.classes?.length > 0) {
                    // Pre-select first class if none provided
                    // setSelectedClassId(data.classes[0].id);
                }
            }
        } catch (e) {
            console.log('Load classes err', e);
        }
    };

    const getLocation = async () => {
        setGpsStatus('finding');
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setGpsStatus('error');
                return;
            }
            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc.coords);
            setGpsStatus('found');
        } catch (e) {
            setGpsStatus('error');
        }
    };

    const markAttendance = async () => {
        if (!location) {
            Alert.alert('Hold On', 'Waiting for GPS location...');
            return;
        }

        setLoading(true);
        try {
            // 1. Biometric verification
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!hasHardware || !isEnrolled) {
                setLoading(false);
                Alert.alert('Device Error', 'Biometric hardware is missing or not enrolled on this device. Cannot proceed with attendance marking.');
                return;
            }

            // Retrieve the logged-in user
            const userStr = await AsyncStorage.getItem('user');
            if (!userStr) throw new Error('No user data');
            const currentUser = JSON.parse(userStr);

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: `Verify Identity for ${currentUser.roll_number || 'Attendance'}`,
                disableDeviceFallback: true, // Only allow biometrics, no PIN bypass
                cancelLabel: 'Cancel Status'
            });

            if (!result.success) {
                setLoading(false);
                Alert.alert('Verification Failed', 'Biometric signature did not match.');
                return;
            }

            // 2. Class validity check
            const selectedClass = classes.find(c => c.id === selectedClassId);
            const now = new Date();
            const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
            
            if (selectedClass && selectedClass.day !== currentDay) {
                setLoading(false);
                Alert.alert('Restricted', `This class is scheduled for ${selectedClass.day}. Attendance is only permitted on the day of the session.`);
                return;
            }

            // 3. API Call
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/attendance/mark`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    class_id: selectedClassId,
                    gps_lat: location.latitude,
                    gps_lng: location.longitude,
                    method: 'app_gps'
                })
            });

            const data = await res.json();
            if (res.ok) {
                Alert.alert('Success', `✓ Attendance marked! ${data.status?.toUpperCase() || ''}\nDistance: ${data.distance_m || 0}m from campus.`);
            } else {
                Alert.alert(data.error || 'ACCESS DENIED', data.message || 'Verification failed.');
            }
        } catch (e) {
            console.log('Attendance err', e);
            Alert.alert('Network Error', 'Could not reach the server.');
        }
        setLoading(false);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>MARK ATTENDANCE</Text>

            <Text style={styles.sectionLabel}>SELECT CLASS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classSelector}>
                <TouchableOpacity
                    style={[styles.classChip, !selectedClassId && styles.classChipActive]}
                    onPress={() => setSelectedClassId(null)}
                >
                    <Text style={[styles.classChipText, !selectedClassId && styles.classChipTextActive]}>GENERAL</Text>
                </TouchableOpacity>
                {classes.map(c => (
                    <TouchableOpacity
                        key={c.id}
                        style={[styles.classChip, selectedClassId === c.id && styles.classChipActive]}
                        onPress={() => setSelectedClassId(c.id)}
                    >
                        <Text style={[styles.classChipText, selectedClassId === c.id && styles.classChipTextActive]}>{c.code}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.gpsCard}>
                <View style={[styles.gpsDot, gpsStatus === 'finding' ? styles.dotFinding : gpsStatus === 'found' ? styles.dotFound : styles.dotError]} />
                <View style={styles.gpsInfo}>
                    <Text style={styles.gpsLabel}>
                        {gpsStatus === 'finding' ? 'Acquiring GPS Signal...' : gpsStatus === 'found' ? 'GPS Locked' : 'GPS Error / Denied'}
                    </Text>
                    {location && (
                        <Text style={styles.gpsCoords}>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</Text>
                    )}
                </View>
                {gpsStatus === 'error' && (
                    <TouchableOpacity onPress={getLocation}><Text style={{ color: colors.hot, fontSize: 10 }}>RETRY</Text></TouchableOpacity>
                )}
            </View>

            <View style={{ flex: 1, justifyContent: 'center' }}>
                <TouchableOpacity
                    style={[styles.markBtn, (loading || gpsStatus !== 'found') && styles.markBtnDisabled]}
                    onPress={markAttendance}
                    disabled={loading || gpsStatus !== 'found'}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.markBtnText}>MARK PRESENT</Text>
                    )}
                </TouchableOpacity>
                <Text style={styles.hint}>Biometric scan will be required</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg0, padding: 24, paddingTop: 60 },
    header: { fontFamily: 'Tanker', fontSize: 28, color: '#fff', marginBottom: 20, letterSpacing: 1 },
    sectionLabel: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 12 },
    classSelector: { flexGrow: 0, marginBottom: 24 },
    classChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surf, marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
    classChipActive: { borderColor: colors.hot, backgroundColor: 'rgba(255, 46, 166, 0.1)' },
    classChipText: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: 'rgba(255,255,255,0.5)' },
    classChipTextActive: { color: colors.hot },
    gpsCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 },
    gpsDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    dotFinding: { backgroundColor: colors.oran },
    dotFound: { backgroundColor: colors.green },
    dotError: { backgroundColor: colors.danger },
    gpsInfo: { flex: 1 },
    gpsLabel: { fontFamily: 'Satoshi-Bold', fontSize: 13, color: 'rgba(255,255,255,0.7)' },
    gpsCoords: { fontFamily: 'Satoshi', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
    markBtn: { backgroundColor: colors.hot, borderRadius: 20, paddingVertical: 24, alignItems: 'center', shadowColor: colors.hot, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
    markBtnDisabled: { opacity: 0.5 },
    markBtnText: { fontFamily: 'Tanker', fontSize: 24, color: '#fff', letterSpacing: 2 },
    hint: { textAlign: 'center', fontFamily: 'Satoshi', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 16 }
});
