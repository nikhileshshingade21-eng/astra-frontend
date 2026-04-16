import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    LayoutAnimation,
    Platform,
    UIManager,
    Dimensions,
    StatusBar
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
// import { BlurView } from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as SecureStore from '../utils/storage';
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

export default function TrackerScreen({ route, navigation }) {
    const { user } = route.params || { user: { role: 'faculty' } };
    const roleColor = user.role === 'admin' ? colors.neonBlue : colors.neonPurple;

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [trailData, setTrailData] = useState([]);
    const [loading, setLoading] = useState(false);

    const searchStudent = async (silent = false) => {
        if (!searchQuery) return;
        if (!silent) setLoading(true);
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/admin/tracker/${searchQuery}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok && res.data) {
                if (!silent) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setSelectedStudent({
                    name: (res.data.user?.name || 'Unknown Node').toUpperCase(),
                    roll: res.data.user?.roll_number || 'N/A',
                    attendance: res.data.attendance_pct || 0
                });
                setTrailData(res.data.trail || []);
            } else if (!silent) {
                Alert.alert('Not Found', res.data?.error || 'Student not found.');
                setSelectedStudent(null);
            }
        } catch (e) {
            if (!silent) Alert.alert('Connection Error', 'Could not reach the server.');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // 🛰️ SOCKET SYNC: Real-time trail updates
    React.useEffect(() => {
        if (!selectedStudent || !searchQuery) return;

        const io = require('socket.io-client');
        const socket = io(API_BASE.replace('/api', ''), {
            transports: ['websocket'],
            reconnection: true
        });

        socket.on('ATTENDANCE_MARKED', (payload) => {
            const data = payload.data || payload; // Support both old and new contract formats
            const roll = data.roll_number || (data.student && data.student.roll_number);
            
            if (roll && roll.toUpperCase() === searchQuery.toUpperCase()) {
                console.log('[TRACKER] Live activity detected for targeted node:', roll);
                searchStudent(true); // Silent refresh
            }
        });

        return () => {
            console.log('[TRACKER] Releasing track listener');
            socket.disconnect();
        };
    }, [selectedStudent, searchQuery]);

    const getEventColor = (type) => {
        if (type.includes('Verified')) return colors.neonGreen;
        if (type.includes('Breach')) return colors.hot;
        if (type.includes('Entry')) return colors.neonBlue;
        return colors.neonPurple;
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
                    <Text style={styles.title}>Activity Log</Text>
                    <Text style={[styles.sub, { color: roleColor }]}>Student Movement Tracker</Text>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <View blurType="dark" blurAmount={3} style={[styles.searchBox, { borderColor: roleColor + '40' }]}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Enter roll number..."
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <TouchableOpacity style={[styles.searchAction, { backgroundColor: roleColor }]} onPress={searchStudent}>
                        <Ionicons name="search" size={20} color="#000" />
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={roleColor} />
                    <Text style={[styles.loadingText, { color: roleColor }]}>Loading records...</Text>
                </View>
            ) : selectedStudent ? (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View blurType="dark" blurAmount={5} style={styles.profileCard}>
                        <View style={styles.profileRow}>
                            <View style={[styles.avatarBox, { backgroundColor: roleColor + '20' }]}>
                                <Text style={[styles.avatarText, { color: roleColor }]}>{selectedStudent.name[0]}</Text>
                            </View>
                            <View>
                                <Text style={styles.profileName}>{selectedStudent.name}</Text>
                                <Text style={styles.profileRoll}>{selectedStudent.roll} • {selectedStudent.attendance}% SCORE</Text>
                            </View>
                        </View>
                        <View style={[styles.divider, { backgroundColor: roleColor + '20' }]} />
                        <Text style={styles.trailLabel}>ACTIVITY TIMELINE</Text>
                    </View>

                    <View style={styles.timeline}>
                        <View style={[styles.timelineLine, { backgroundColor: roleColor + '30' }]} />
                        {trailData.map((event, idx) => (
                            <View key={idx} style={styles.eventItem}>
                                <View style={styles.nodeWrapper}>
                                    <View style={[styles.node, { backgroundColor: getEventColor(event.activity) }]} />
                                    {idx < trailData.length - 1 && <View style={[styles.nodeLine, { backgroundColor: roleColor + '20' }]} />}
                                </View>
                                <View style={styles.eventContent}>
                                    <Text style={styles.eventTime}>{event.time}</Text>
                                    <View blurType="dark" blurAmount={3} style={styles.eventCard}>
                                        <Text style={styles.eventActivity}>{event.activity.toUpperCase()}</Text>
                                        <Text style={styles.eventMeta}>{event.class} • Room {event.room}</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.intelBtn}>
                        <LinearGradient colors={[roleColor, '#000']} start={{x:0, y:0}} end={{x:2, y:2}} style={styles.intelGrad}>
                            <Text style={styles.intelText}>GENERATE REPORT</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            ) : (
                <View style={styles.emptyBox}>
                    <Ionicons name="finger-print-outline" size={80} color="rgba(255,255,255,0.05)" />
                    <Text style={styles.emptyText}>Search for a Student</Text>
                    <Text style={styles.emptySub}>Enter a roll number to see their activity history</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 25, flexDirection: 'row', alignItems: 'center', gap: 15 },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    title: { fontFamily: 'Tanker', fontSize: 28, color: '#fff', letterSpacing: 1 },
    sub: { fontFamily: 'Satoshi-Black', fontSize: 9, letterSpacing: 2 },
    
    searchContainer: { paddingHorizontal: 24, marginBottom: 25 },
    searchBox: { flexDirection: 'row', borderRadius: 20, borderWidth: 1, overflow: 'hidden', padding: 6, alignItems: 'center' },
    searchInput: { flex: 1, color: '#fff', fontFamily: 'Satoshi-Bold', paddingHorizontal: 15, height: 48 },
    searchAction: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    
    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
    loadingText: { fontFamily: 'Satoshi-Black', fontSize: 10, letterSpacing: 3 },
    
    scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
    profileCard: { padding: 24, borderRadius: 32, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 30 },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatarBox: { width: 54, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontFamily: 'Tanker', fontSize: 24 },
    profileName: { fontFamily: 'Tanker', fontSize: 22, color: '#fff', letterSpacing: 1 },
    profileRoll: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: colors.textDim, marginTop: 4 },
    divider: { height: 1, marginVertical: 20 },
    trailLabel: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.textDim, letterSpacing: 2 },

    timeline: { paddingLeft: 10 },
    timelineLine: { position: 'absolute', left: 24, top: 0, bottom: 0, width: 2 },
    eventItem: { flexDirection: 'row', gap: 20, marginBottom: 25 },
    nodeWrapper: { width: 30, alignItems: 'center' },
    node: { width: 12, height: 12, borderRadius: 6, zIndex: 1, borderWidth: 3, borderColor: colors.bg },
    nodeLine: { width: 2, flex: 1, marginVertical: 4 },
    eventContent: { flex: 1 },
    eventTime: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.textDim, marginBottom: 8, letterSpacing: 1 },
    eventCard: { padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    eventActivity: { fontFamily: 'Tanker', fontSize: 16, color: '#fff', letterSpacing: 1 },
    eventMeta: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: colors.textDim, marginTop: 4 },

    intelBtn: { height: 60, borderRadius: 20, overflow: 'hidden', marginTop: 30 },
    intelGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    intelText: { fontFamily: 'Tanker', fontSize: 14, color: '#000', letterSpacing: 1 },

    emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 15, opacity: 0.5 },
    emptyText: { fontFamily: 'Tanker', fontSize: 24, color: '#fff', marginTop: 10 },
    emptySub: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: colors.textDim, textAlign: 'center', paddingHorizontal: 60 }
});

