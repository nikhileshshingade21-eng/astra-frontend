import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE } from '../api/config';
import { Ionicons } from '@expo/vector-icons';

const colors = {
    bg0: '#0f172a', surf: 'rgba(255, 255, 255, 0.05)',
    hot: '#3b82f6', green: '#10b981', oran: '#ff8a1f', cyan: '#0ea5e9', purp: '#6366f1', border: 'rgba(255, 255, 255, 0.12)'
};

export default function MarksScreen({ route }) {
    const { user } = route.params || {};
    const roleColor = colors.cyan;

    const [marks, setMarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadMarks = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/marks/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMarks(data.marks || []);
            }
        } catch (e) {
            console.log('Marks fetch err:', e);
        }
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        loadMarks();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadMarks();
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={roleColor} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={roleColor} />}
        >
            <View style={styles.header}>
                <Text style={styles.title}>ACADEMIC RECORD</Text>
                <Text style={styles.subTitle}>Semester Grades & Assessments</Text>
            </View>

            <View style={styles.marksContainer}>
                {marks.length === 0 ? (
                    <Text style={styles.emptyText}>No marks recorded yet.</Text>
                ) : (
                    marks.map((mark, i) => {
                        const pct = (mark.marks_obtained / mark.total_marks) * 100;
                        const gradeColor = pct >= 80 ? colors.green : pct >= 60 ? colors.oran : colors.hot;
                        
                        return (
                            <View key={mark.id} style={styles.markCard}>
                                <View style={styles.markTop}>
                                    <Text style={styles.className}>{mark.class_name}</Text>
                                    <View style={[styles.pctBadge, { backgroundColor: gradeColor + '20', borderColor: gradeColor }]}>
                                        <Text style={[styles.pctText, { color: gradeColor }]}>{pct.toFixed(1)}%</Text>
                                    </View>
                                </View>
                                
                                <Text style={styles.examType}>{mark.exam_type.toUpperCase()}</Text>
                                
                                <View style={styles.scoreRow}>
                                     <Text style={styles.scoreText}>
                                         <Text style={{color: '#fff', fontSize: 24, fontFamily: 'Tanker'}}>{mark.marks_obtained}</Text>
                                         <Text style={{color: 'rgba(255,255,255,0.4)', fontSize: 16}}> / {mark.total_marks}</Text>
                                     </Text>
                                     <Text style={styles.dateText}>{new Date(mark.date).toLocaleDateString()}</Text>
                                </View>
                            </View>
                        );
                    })
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg0 },
    centerContainer: { flex: 1, backgroundColor: colors.bg0, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 24, paddingTop: 60, paddingBottom: 20 },
    title: { fontFamily: 'Tanker', fontSize: 32, color: '#fff', letterSpacing: 1 },
    subTitle: { fontFamily: 'Satoshi', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
    
    marksContainer: { paddingHorizontal: 24, gap: 16 },
    emptyText: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 40, fontFamily: 'Satoshi' },
    
    markCard: { backgroundColor: colors.surf, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border },
    markTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    className: { fontFamily: 'Satoshi-Bold', fontSize: 16, color: '#fff', flex: 1 },
    examType: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 16 },
    
    scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    scoreText: { fontFamily: 'Tanker' },
    dateText: { fontFamily: 'Satoshi', fontSize: 11, color: 'rgba(255,255,255,0.3)' },
    
    pctBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    pctText: { fontFamily: 'Tanker', fontSize: 14 }
});
