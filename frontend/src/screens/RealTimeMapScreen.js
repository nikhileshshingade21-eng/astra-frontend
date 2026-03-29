import React, { useState, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
// import { BlurView } from '@react-native-community/blur';
import * as SecureStore from '../utils/storage';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming, 
    withSequence 
} from 'react-native-reanimated';
import { API_BASE } from '../api/config';
import { fetchWithTimeout } from '../utils/api';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { STUDENTS } from '../data/students';

const { width } = Dimensions.get('window');
const MAP_SIZE = width - 48;

const colors = {
    bg: '#020617',
    glass: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(255, 255, 255, 0.08)',
    textDim: 'rgba(255, 255, 255, 0.4)',
    perfect: '#00f2ff',
    present: '#00ffaa',
    atRisk: '#ff3d71',
    late: '#bf00ff',
    grid: 'rgba(255, 255, 255, 0.02)'
};

const PulsingDot = ({ student, onSelect, selected }) => {
    const opacity = useSharedValue(0.4);
    const scale = useSharedValue(1);

    useEffect(() => {
        opacity.value = withRepeat(withTiming(1, { duration: 1500 }), -1, true);
        scale.value = withRepeat(withSequence(withTiming(1.5, { duration: 1500 }), withTiming(1, { duration: 1500 })), -1);
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: selected ? 1.5 : scale.value }]
    }));

    const color = getStatusColor(student.status);

    return (
        <TouchableOpacity
            onPress={() => onSelect(student)}
            style={[styles.dotWrapper, { left: student.x, top: student.y }]}
        >
            <Animated.View style={[styles.outerGlow, animatedStyle, { backgroundColor: color + '20' }]} />
            <View style={[styles.mainDot, { backgroundColor: color }, selected && { borderWidth: 2, borderColor: '#fff' }]} />
        </TouchableOpacity>
    );
};

const getStatusColor = (status) => {
    switch (status) {
        case 'perfect': return colors.perfect;
        case 'present': return colors.present;
        case 'at-risk': return colors.atRisk;
        case 'late': return colors.late;
        default: return '#fff';
    }
};

const RealTimeMapScreen = ({ navigation }) => {
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [realtimeData, setRealtimeData] = useState([]);

    const mapStudents = useMemo(() => {
        return STUDENTS.map((s, index) => ({
            ...s,
            x: 24 + (parseInt(s.id.slice(-2)) * 3.5) % (MAP_SIZE - 48),
            y: 24 + (parseInt(s.id.slice(-4, -2)) * 6.5) % (MAP_SIZE - 48),
        }));
    }, []);

    const fetchRealtime = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/admin/realtime-attendance`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok && res.data) {
                setRealtimeData(res.data);
            }
        } catch (e) {}
    };

    useEffect(() => {
        fetchRealtime();
        const itv = setInterval(fetchRealtime, 15000);
        return () => clearInterval(itv);
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>SPATIAL_SYNC</Text>
                    <Text style={styles.sub}>REAL-TIME CAMPUS TOPOLOGY</Text>
                </View>
                <TouchableOpacity onPress={fetchRealtime} style={styles.refreshBtn}>
                    <Ionicons name="scan" size={20} color={colors.perfect} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.statsStrip}>
                    <View blurType="dark" blurAmount={3} style={styles.statChip}>
                        <Text style={styles.chipVal}>{STUDENTS.length}</Text>
                        <Text style={styles.chipLab}>CONNECTED</Text>
                    </View>
                    <View blurType="dark" blurAmount={3} style={styles.statChip}>
                        <Text style={[styles.chipVal, { color: colors.present }]}>34</Text>
                        <Text style={styles.chipLab}>ACTIVE_ZONE</Text>
                    </View>
                    <View blurType="dark" blurAmount={3} style={styles.statChip}>
                        <Text style={[styles.chipVal, { color: colors.atRisk }]}>02</Text>
                        <Text style={styles.chipLab}>FINGERED</Text>
                    </View>
                </View>

                <View style={styles.mapFrame}>
                    <View style={styles.mapHeader}>
                        <Text style={styles.mapTitle}>SECTOR_A // CLASSROOM_301</Text>
                        <View style={styles.liveTag}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>STREAMING</Text>
                        </View>
                    </View>

                    <View style={styles.mapSurface}>
                        {/* THE GRID */}
                        <View style={styles.gridBox}>
                            {[...Array(8)].map((_, i) => (
                                <View key={`h-${i}`} style={[styles.gridH, { top: (MAP_SIZE / 8) * i }]} />
                            ))}
                            {[...Array(8)].map((_, i) => (
                                <View key={`v-${i}`} style={[styles.gridV, { left: (MAP_SIZE / 8) * i }]} />
                            ))}
                        </View>

                        {/* STUDENT NODES */}
                        {mapStudents.map((s) => (
                            <PulsingDot 
                                key={s.id} 
                                student={s} 
                                onSelect={setSelectedStudent} 
                                selected={selectedStudent?.id === s.id} 
                            />
                        ))}

                        <Text style={styles.zoneMarker}>NORTH_GATE</Text>
                        <Text style={[styles.zoneMarker, { bottom: 10, right: 10 }]}>SOUTH_BYPASS</Text>
                    </View>
                </View>

                {selectedStudent ? (
                    <View blurType="dark" blurAmount={12} style={styles.nodeDetail}>
                        <View style={styles.detailRow}>
                            <View style={styles.avatarBox}>
                                <LinearGradient colors={[colors.perfect, colors.present]} style={styles.avatarGrad} />
                                <Ionicons name="person" size={20} color="#000" style={styles.avatarIcon} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.nodeName}>{selectedStudent.name.toUpperCase()}</Text>
                                <Text style={styles.nodeId}>{selectedStudent.id} • SEC_{selectedStudent.section}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedStudent(null)} style={styles.closeNode}>
                                <Ionicons name="close-circle" size={24} color={colors.textDim} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.nodeStats}>
                            <View style={styles.nodeStat}>
                                <Text style={styles.nodeStatLab}>PRESENCE_%</Text>
                                <Text style={styles.nodeStatVal}>{selectedStudent.att}%</Text>
                            </View>
                            <View style={styles.nodeStat}>
                                <Text style={styles.nodeStatLab}>LAST_SIGNAL</Text>
                                <Text style={styles.nodeStatVal}>182s AGO</Text>
                            </View>
                            <View style={styles.nodeStat}>
                                <Text style={styles.nodeStatLab}>STATUS</Text>
                                <Text style={[styles.nodeStatVal, { color: getStatusColor(selectedStudent.status) }]}>{selectedStudent.status.toUpperCase()}</Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View blurType="dark" blurAmount={3} style={styles.legendBox}>
                        <Text style={styles.legendTitle}>SPATIAL_LEGEND</Text>
                        <View style={styles.legendGrid}>
                            <View style={styles.legItem}>
                                <View style={[styles.legDot, { backgroundColor: colors.perfect }]} />
                                <Text style={styles.legLab}>PLATINUM</Text>
                            </View>
                            <View style={styles.legItem}>
                                <View style={[styles.legDot, { backgroundColor: colors.present }]} />
                                <Text style={styles.legLab}>AUTHORIZED</Text>
                            </View>
                            <View style={styles.legItem}>
                                <View style={[styles.legDot, { backgroundColor: colors.atRisk }]} />
                                <Text style={styles.legLab}>THREAT</Text>
                            </View>
                            <View style={styles.legItem}>
                                <View style={[styles.legDot, { backgroundColor: colors.late }]} />
                                <Text style={styles.legLab}>DELAYED</Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontFamily: 'Tanker', fontSize: 28, color: '#fff', letterSpacing: 1 },
    sub: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.perfect, letterSpacing: 2 },
    backBtn: { marginRight: 15 },
    refreshBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(0, 242, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
    
    scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
    statsStrip: { flexDirection: 'row', gap: 10, marginBottom: 25 },
    statChip: { flex: 1, padding: 15, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', overflow: 'hidden' },
    chipVal: { fontFamily: 'Tanker', fontSize: 18, color: '#fff' },
    chipLab: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, letterSpacing: 1 },

    mapFrame: { borderRadius: 32, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.01)', marginBottom: 20 },
    mapHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
    mapTitle: { fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.textDim, letterSpacing: 2 },
    liveTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,255,170,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.present },
    liveText: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.present },

    mapSurface: { width: MAP_SIZE, height: MAP_SIZE, position: 'relative' },
    gridBox: { ...StyleSheet.absoluteFillObject },
    gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.grid },
    gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: colors.grid },
    dotWrapper: { position: 'absolute', width: 24, height: 24, justifyContent: 'center', alignItems: 'center', transform: [{translateX: -12}, {translateY: -12}] },
    mainDot: { width: 10, height: 10, borderRadius: 5 },
    outerGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 12 },
    zoneMarker: { position: 'absolute', top: 10, left: 10, fontFamily: 'Satoshi-Black', fontSize: 8, color: 'rgba(255,255,255,0.05)', letterSpacing: 2 },

    nodeDetail: { padding: 24, borderRadius: 32, borderWidth: 1, borderColor: colors.perfect + '40', overflow: 'hidden' },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
    avatarBox: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    avatarGrad: { ...StyleSheet.absoluteFillObject },
    avatarIcon: { position: 'absolute' },
    nodeName: { fontFamily: 'Tanker', fontSize: 20, color: '#fff', letterSpacing: 1 },
    nodeId: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: colors.textDim },
    nodeStats: { flexDirection: 'row', justifyContent: 'space-between' },
    nodeStat: { gap: 5 },
    nodeStatLab: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, letterSpacing: 1 },
    nodeStatVal: { fontFamily: 'Tanker', fontSize: 16, color: '#fff' },

    legendBox: { padding: 24, borderRadius: 24, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    legendTitle: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, letterSpacing: 3, marginBottom: 20, textAlign: 'center' },
    legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    legItem: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12 },
    legDot: { width: 8, height: 8, borderRadius: 4 },
    legLab: { fontFamily: 'Satoshi-Black', fontSize: 9, color: '#fff', letterSpacing: 1 }
});

export default RealTimeMapScreen;

