import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../api/config';

const colors = {
    bg0: '#0f172a', surf: 'rgba(255, 255, 255, 0.05)',
    hot: '#3b82f6', green: '#10b981', oran: '#ff8a1f', cyan: '#0ea5e9', border: 'rgba(255, 255, 255, 0.12)'
};

export default function TrackerScreen({ route, navigation }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);

    const [trailData, setTrailData] = useState([]);
    const [loading, setLoading] = useState(false);

    const searchStudent = async () => {
        if (!searchQuery) return;
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/admin/tracker/${searchQuery}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok) {
                setSelectedStudent({
                    name: data.user.name.toUpperCase(),
                    roll: data.user.roll_number,
                    attendance: data.attendance_pct
                });
                setTrailData(data.trail || []);
            } else {
                Alert.alert('Not Found', data.error || 'Could not find tracking data');
                setSelectedStudent(null);
            }
        } catch (e) {
            console.log('Tracker API Error:', e);
            Alert.alert('Error', 'Failed to communicate with Campus Hub');
        }
        setLoading(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>STUDENT TRACKER</Text>
                <Text style={styles.sub}>Cross-class audit trail & behavioral analysis</Text>
            </View>

            <View style={styles.searchBox}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by Roll Number or Name..."
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                <TouchableOpacity style={[styles.searchBtn, { backgroundColor: colors.cyan }]} onPress={searchStudent}>
                    <Ionicons name="search" size={20} color="#000" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.emptyState}>
                    <ActivityIndicator size="large" color={colors.cyan} />
                    <Text style={[styles.emptyText, { marginTop: 10 }]}>Decrypting logs...</Text>
                </View>
            ) : selectedStudent ? (
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                    <View style={styles.studentHeader}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{selectedStudent.name[0]}</Text>
                        </View>
                        <View>
                            <Text style={styles.studentName}>{selectedStudent.name}</Text>
                            <Text style={styles.studentRoll}>{selectedStudent.roll} • {selectedStudent.attendance} Attendance</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>TODAY'S ACTIVITY TRAIL</Text>
                    <View style={styles.timeline}>
                        {trailData.map((item, idx) => (
                            <View key={item.id} style={styles.timelineItem}>
                                <View style={styles.timeCol}>
                                    <Text style={styles.timeText}>{item.time}</Text>
                                    {idx !== trailData.length - 1 && <View style={styles.line} />}
                                </View>
                                <View style={styles.nodeCol}>
                                    <View style={[styles.node, { backgroundColor: item.status === 'secure' ? colors.green : (item.status === 'warn' ? colors.oran : colors.cyan) }]} />
                                </View>
                                <View style={styles.contentCol}>
                                    <View style={styles.eventCard}>
                                        <Text style={styles.eventActivity}>{item.activity}</Text>
                                        <Text style={styles.eventClass}>{item.class} • {item.room}</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.reportBtn}>
                        <Text style={styles.reportBtnText}>GENERATE BEHAVIORAL REPORT</Text>
                    </TouchableOpacity>
                </ScrollView>
            ) : (
                <View style={styles.emptyState}>
                    <Ionicons name="finger-print-outline" size={80} color="rgba(255,255,255,0.05)" />
                    <Text style={styles.emptyText}>Protocol Awaiting Input...</Text>
                    <Text style={styles.emptySub}>Enter a student ID to trace their campus movement</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg0 },
    header: { padding: 24, paddingTop: 60 },
    title: { fontFamily: 'Tanker', fontSize: 32, color: '#fff', letterSpacing: 1 },
    sub: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
    searchBox: { flexDirection: 'row', marginHorizontal: 24, gap: 10, marginBottom: 20 },
    searchInput: { flex: 1, backgroundColor: colors.surf, borderRadius: 14, padding: 15, color: '#fff', fontFamily: 'Satoshi-Bold', borderWidth: 1, borderColor: colors.border },
    searchBtn: { width: 55, height: 55, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    studentHeader: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, backgroundColor: 'rgba(0,210,255,0.05)', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,210,255,0.2)' },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.cyan, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    avatarText: { fontFamily: 'Tanker', fontSize: 24, color: '#000' },
    studentName: { fontFamily: 'Tanker', fontSize: 20, color: '#fff', letterSpacing: 1 },
    studentRoll: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: colors.cyan, marginTop: 2 },
    sectionTitle: { fontFamily: 'Tanker', fontSize: 16, color: '#fff', letterSpacing: 1, marginLeft: 24, marginTop: 30, marginBottom: 20 },
    timeline: { paddingHorizontal: 24 },
    timelineItem: { flexDirection: 'row', minHeight: 80 },
    timeCol: { width: 70, alignItems: 'center' },
    timeText: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: 'rgba(255,255,255,0.4)' },
    line: { width: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 5 },
    nodeCol: { width: 30, alignItems: 'center' },
    node: { width: 10, height: 10, borderRadius: 5, marginTop: 2 },
    contentCol: { flex: 1, paddingBottom: 25 },
    eventCard: { backgroundColor: colors.surf, padding: 15, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
    eventActivity: { fontFamily: 'Satoshi-Bold', fontSize: 14, color: '#fff' },
    eventClass: { fontFamily: 'Satoshi', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
    reportBtn: { margin: 24, height: 55, borderRadius: 16, borderWidth: 1, borderColor: colors.cyan, justifyContent: 'center', alignItems: 'center' },
    reportBtnText: { color: colors.cyan, fontFamily: 'Tanker', fontSize: 14, letterSpacing: 1 },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.5 },
    emptyText: { fontFamily: 'Tanker', fontSize: 24, color: '#fff', marginTop: 20 },
    emptySub: { fontFamily: 'Satoshi', fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 8 }
});
