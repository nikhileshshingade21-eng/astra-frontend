import React, { useState, useMemo } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { STUDENTS } from '../data/students';

const { width } = Dimensions.get('window');
const MAP_SIZE = width - 40;

const RealTimeMapScreen = ({ navigation }) => {
    const [selectedStudent, setSelectedStudent] = useState(null);

    // Filter students for the map (showing a subset for clarity or all as dots)
    const mapStudents = useMemo(() => {
        return STUDENTS.map((s, index) => ({
            ...s,
            // Generate deterministic but "random" looking coordinates for the room
            x: 20 + (parseInt(s.id.slice(-2)) * 3.5) % (MAP_SIZE - 40),
            y: 20 + (parseInt(s.id.slice(-4, -2)) * 6.5) % (MAP_SIZE - 40),
        }));
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'perfect': return '#00ffcc';
            case 'present': return '#3399ff';
            case 'at-risk': return '#ff3366';
            case 'late': return '#ffcc00';
            default: return '#888';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>REAL-TIME MAP</Text>
                    <Text style={styles.headerSub}>PROTOCOL: LIVE_LOCATION_SYNC</Text>
                </View>
                <TouchableOpacity style={styles.refreshButton}>
                    <Ionicons name="refresh" size={20} color="#00ffcc" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statVal}>{STUDENTS.length}</Text>
                        <Text style={styles.statLabel}>TRACKED</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statVal, { color: '#00ffcc' }]}>
                            {STUDENTS.filter(s => s.status === 'perfect' || s.status === 'present').length}
                        </Text>
                        <Text style={styles.statLabel}>INSIDE</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statVal, { color: '#ff3366' }]}>
                            {STUDENTS.filter(s => s.status === 'at-risk').length}
                        </Text>
                        <Text style={styles.statLabel}>FLAGGED</Text>
                    </View>
                </View>

                <View style={styles.mapContainer}>
                    <View style={styles.mapHeader}>
                        <Text style={styles.mapHeaderText}>CLASSROOM ZONE A-301</Text>
                        <View style={styles.liveIndicator}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>LIVE</Text>
                        </View>
                    </View>

                    <View style={styles.mapSurface}>
                        {/* Grid Lines */}
                        <View style={styles.gridOverlay}>
                            {[...Array(5)].map((_, i) => (
                                <View key={`h-${i}`} style={[styles.gridLineH, { top: (MAP_SIZE / 5) * i }]} />
                            ))}
                            {[...Array(5)].map((_, i) => (
                                <View key={`v-${i}`} style={[styles.gridLineV, { left: (MAP_SIZE / 5) * i }]} />
                            ))}
                        </View>

                        {/* Student Dots */}
                        {mapStudents.map((student) => (
                            <TouchableOpacity
                                key={student.id}
                                style={[
                                    styles.studentDot,
                                    {
                                        left: student.x,
                                        top: student.y,
                                        backgroundColor: getStatusColor(student.status),
                                        shadowColor: getStatusColor(student.status),
                                    }
                                ]}
                                onPress={() => setSelectedStudent(student)}
                            />
                        ))}

                        {/* Zone Annotations */}
                        <View style={styles.zoneLabel}><Text style={styles.zoneLabelText}>ZONE A</Text></View>
                        <View style={[styles.zoneLabel, { bottom: 10, right: 10 }]}><Text style={styles.zoneLabelText}>ZONE B</Text></View>
                    </View>
                </View>

                {selectedStudent ? (
                    <View style={styles.studentDetail}>
                        <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.detailCard}>
                            <View style={styles.detailHeader}>
                                <View>
                                    <Text style={styles.detailName}>{selectedStudent.name}</Text>
                                    <Text style={styles.detailId}>{selectedStudent.id} • {selectedStudent.section}</Text>
                                </View>
                                <View style={[styles.statusPill, { backgroundColor: getStatusColor(selectedStudent.status) + '20' }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(selectedStudent.status) }]}>
                                        {selectedStudent.status.toUpperCase()}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.detailStats}>
                                <View style={styles.detailStat}>
                                    <Text style={styles.detailStatLabel}>ATTENDANCE</Text>
                                    <Text style={styles.detailStatVal}>{selectedStudent.att}%</Text>
                                </View>
                                <View style={styles.detailStat}>
                                    <Text style={styles.detailStatLabel}>LAST PING</Text>
                                    <Text style={styles.detailStatVal}>2m ago</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.closeDetail}
                                onPress={() => setSelectedStudent(null)}
                            >
                                <Ionicons name="close-circle" size={24} color="rgba(255,255,255,0.3)" />
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>
                ) : (
                    <View style={styles.legend}>
                        <Text style={styles.legendTitle}>MAP LEGEND</Text>
                        <View style={styles.legendRow}>
                            <View style={[styles.legendItem, { borderLeftColor: '#00ffcc' }]}>
                                <View style={[styles.dot, { backgroundColor: '#00ffcc' }]} />
                                <Text style={styles.legendLabel}>Perfect (95%+)</Text>
                            </View>
                            <View style={[styles.legendItem, { borderLeftColor: '#3399ff' }]}>
                                <View style={[styles.dot, { backgroundColor: '#3399ff' }]} />
                                <Text style={styles.legendLabel}>Present</Text>
                            </View>
                        </View>
                        <View style={styles.legendRow}>
                            <View style={[styles.legendItem, { borderLeftColor: '#ff3366' }]}>
                                <View style={[styles.dot, { backgroundColor: '#ff3366' }]} />
                                <Text style={styles.legendLabel}>At-Risk (&lt;75%)</Text>
                            </View>
                            <View style={[styles.legendItem, { borderLeftColor: '#ffcc00' }]}>
                                <View style={[styles.dot, { backgroundColor: '#ffcc00' }]} />
                                <Text style={styles.legendLabel}>Late Entry</Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 40,
        backgroundColor: '#0f172a',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        fontFamily: 'Tanker',
        fontSize: 24,
        color: '#fff',
        letterSpacing: 1,
    },
    headerSub: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 10,
        color: '#00ffcc',
        letterSpacing: 1,
    },
    refreshButton: {
        marginLeft: 'auto',
        padding: 8,
        backgroundColor: 'rgba(0, 255, 204, 0.1)',
        borderRadius: 8,
    },
    scrollContent: {
        padding: 20,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 15,
        borderRadius: 16,
        marginHorizontal: 4,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    statVal: {
        fontFamily: 'Tanker',
        fontSize: 22,
        color: '#fff',
    },
    statLabel: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 10,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 4,
    },
    mapContainer: {
        backgroundColor: '#0f172a',
        borderRadius: 24,
        padding: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 20,
    },
    mapHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 5,
    },
    mapHeaderText: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 1,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 255, 204, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#00ffcc',
        marginRight: 6,
    },
    liveText: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 9,
        color: '#00ffcc',
    },
    mapSurface: {
        width: MAP_SIZE - 30,
        height: MAP_SIZE - 30,
        backgroundColor: '#0f172a',
        borderRadius: 12,
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    gridLineH: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    gridLineV: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    studentDot: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 5,
    },
    zoneLabel: {
        position: 'absolute',
        padding: 10,
    },
    zoneLabelText: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 10,
        color: 'rgba(255,255,255,0.1)',
    },
    studentDetail: {
        marginTop: 10,
    },
    detailCard: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        position: 'relative',
    },
    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    detailName: {
        fontFamily: 'Tanker',
        fontSize: 20,
        color: '#fff',
        letterSpacing: 1,
    },
    detailId: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 4,
    },
    statusPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 10,
        letterSpacing: 1,
    },
    detailStats: {
        flexDirection: 'row',
        gap: 30,
    },
    detailStat: {
        flex: 1,
    },
    detailStatLabel: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 8,
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: 1,
        marginBottom: 5,
    },
    detailStatVal: {
        fontFamily: 'Tanker',
        fontSize: 18,
        color: '#fff',
    },
    closeDetail: {
        position: 'absolute',
        top: 15,
        right: 15,
    },
    legend: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    legendTitle: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 10,
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: 2,
        marginBottom: 15,
        textAlign: 'center',
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    legendItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 15,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 12,
        marginHorizontal: 5,
        borderLeftWidth: 3,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 10,
    },
    legendLabel: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 11,
        color: '#fff',
    },
});

export default RealTimeMapScreen;
