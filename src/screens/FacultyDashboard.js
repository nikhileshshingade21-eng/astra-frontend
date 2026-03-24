import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../api/config';
import { Ionicons } from '@expo/vector-icons';

const colors = {
    bg0: '#0f172a', surf: 'rgba(255, 255, 255, 0.05)',
    hot: '#3b82f6', green: '#10b981', oran: '#ff8a1f', cyan: '#0ea5e9', purp: '#6366f1'
};

export default function FacultyDashboard({ route, navigation }) {
    const { classId } = route.params || {};
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [liveData, setLiveData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        let interval;
        if (autoRefresh && selectedClass) {
            fetchLiveAttendance(selectedClass.id);
            interval = setInterval(() => {
                fetchLiveAttendance(selectedClass.id);
            }, 5000); // Refresh every 5s
        }
        return () => clearInterval(interval);
    }, [selectedClass, autoRefresh]);

    const fetchClasses = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/timetable`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            const fetchedClasses = data.classes || [];
            setClasses(fetchedClasses);
            
            if (fetchedClasses.length > 0) {
                const initial = classId ? fetchedClasses.find(c => c.id === classId) : null;
                setSelectedClass(initial || fetchedClasses[0]);
            }
        } catch (e) {
        } finally {
            setLoading(false);
        }
    };

    const fetchLiveAttendance = async (classId) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/attendance/live/${classId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setLiveData(data);
        } catch (e) {
            console.log('Live fetch err', e);
        }
    };

    const markManual = async (studentId, status = 'present') => {
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/attendance/manual`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: studentId,
                    class_id: selectedClass.id,
                    status: status
                })
            });
            if (res.ok) {
                fetchLiveAttendance(selectedClass.id);
            }
        } catch (e) {
            console.log('Manual mark err', e);
        }
    };

    const renderStudent = ({ item }) => (
        <View style={styles.studentRow}>
            <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{item.name}</Text>
                <Text style={styles.studentRoll}>{item.roll_number}</Text>
            </View>
            <View style={styles.timeBadge}>
                <Text style={styles.timeText}>{item.marked_at ? new Date(item.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}</Text>
            </View>
            {item.status ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.green} />
            ) : (
                <TouchableOpacity onPress={() => markManual(item.id)}>
                    <Ionicons name="add-circle" size={24} color={colors.hot} />
                </TouchableOpacity>
            )}
        </View>
    );

    if (loading) return (
        <View style={[styles.container, { justifyContent: 'center' }]}>
            <ActivityIndicator color={colors.hot} size="large" />
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.header}>FACULTY MONITOR</Text>
            
            <Text style={styles.sectionLabel}>MY CLASSES TODAY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classSelector}>
                {classes.map(c => (
                    <TouchableOpacity 
                        key={c.id} 
                        style={[styles.classCard, selectedClass?.id === c.id && styles.classCardActive]}
                        onPress={() => setSelectedClass(c)}
                    >
                        <Text style={[styles.classCode, selectedClass?.id === c.id && styles.activeText]}>{c.code}</Text>
                        <Text style={[styles.className, selectedClass?.id === c.id && styles.activeText]}>{c.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {selectedClass && (
                <View style={styles.monitorArea}>
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{liveData?.count || 0}</Text>
                            <Text style={styles.statLabel}>PRESENT</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={[styles.statValue, { color: colors.oran }]}>{Math.max(0, 32 - (liveData?.count || 0))}</Text>
                            <Text style={styles.statLabel}>PENDING</Text>
                        </View>
                    </View>

                    <View style={styles.listHeader}>
                        <Text style={styles.sectionLabel}>LIVE LOGS</Text>
                        <TouchableOpacity onPress={() => setAutoRefresh(!autoRefresh)}>
                            <Text style={{ color: autoRefresh ? colors.green : colors.oran, fontSize: 10, fontFamily: 'Satoshi-Bold' }}>
                                {autoRefresh ? '● AUTO-REFRESH ON' : '○ REFRESH PAUSED'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={liveData?.students || []}
                        renderItem={renderStudent}
                        keyExtractor={item => item.id.toString()}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>Waiting for students to verify...</Text>
                            </View>
                        )}
                        style={styles.studentList}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg0, paddingHorizontal: 20, paddingTop: 60 },
    header: { fontFamily: 'Tanker', fontSize: 32, color: '#fff', marginBottom: 24 },
    sectionLabel: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, marginBottom: 12 },
    classSelector: { flexGrow: 0, marginBottom: 24 },
    classCard: { backgroundColor: colors.surf, padding: 16, borderRadius: 16, marginRight: 12, minWidth: 120, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    classCardActive: { borderColor: colors.hot, backgroundColor: 'rgba(255,46,166,0.1)' },
    classCode: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: colors.hot, marginBottom: 4 },
    className: { fontFamily: 'Satoshi-Bold', fontSize: 14, color: '#fff' },
    activeText: { color: '#fff' },
    monitorArea: { flex: 1 },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 20, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: colors.hot },
    statValue: { fontFamily: 'Tanker', fontSize: 36, color: colors.hot },
    statLabel: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    studentList: { flex: 1 },
    studentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surf, padding: 12, borderRadius: 12, marginBottom: 8 },
    studentInfo: { flex: 1 },
    studentName: { fontFamily: 'Satoshi-Bold', fontSize: 14, color: '#fff' },
    studentRoll: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
    timeBadge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 12 },
    timeText: { fontFamily: 'Satoshi-Bold', fontSize: 9, color: 'rgba(255,255,255,0.6)' },
    emptyState: { alignItems: 'center', marginTop: 40 },
    emptyText: { fontFamily: 'Satoshi', fontSize: 14, color: 'rgba(255,255,255,0.3)' }
});
