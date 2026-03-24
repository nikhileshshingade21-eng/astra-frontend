import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE } from '../api/config';
import { Ionicons } from '@expo/vector-icons';

const colors = {
    bg0: '#0f172a', surf: 'rgba(255, 255, 255, 0.05)',
    hot: '#3b82f6', green: '#10b981', oran: '#ff8a1f', cyan: '#0ea5e9', purp: '#6366f1', border: 'rgba(255, 255, 255, 0.12)'
};

export default function InsightsScreen({ route, navigation }) {
    const { user } = route.params || {};
    const roleColor = colors.oran;

    const [aiData, setAiData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/ai/report/${user.roll_number}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAiData(data);
            }
        } catch (e) {
            console.log('AI report fetch err:', e);
        }
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
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
                <Text style={styles.title}>ASTRA AI ENGINE</Text>
                <Text style={styles.subTitle}>Predictive Performance Analytics</Text>
            </View>
            
            {aiData?.error ? (
                <View style={styles.errorBox}>
                     <Ionicons name="warning" size={24} color={colors.hot} />
                     <Text style={styles.errorText}>{aiData.error}</Text>
                     <Text style={styles.errorSub}>The AI engine might be offline.</Text>
                </View>
            ) : !aiData ? (
                 <Text style={styles.emptyText}>No AI data available.</Text>
            ) : (
                <View style={styles.content}>
                    
                    {/* Marks Prediction Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                             <Ionicons name="analytics" size={24} color={colors.cyan} />
                             <Text style={styles.cardTitle}>FINAL MARKS PREDICTION</Text>
                        </View>
                        <Text style={styles.cardDesc}>Based on your historical test scores and recent attendance streak, the AI predicts your final score will be:</Text>
                        
                        <View style={styles.predictionRow}>
                             <Text style={[styles.predictionVal, {color: colors.cyan}]}>{aiData.prediction?.predicted_marks || '--'}%</Text>
                             <View>
                                  <Text style={styles.confidenceLab}>CONFIDENCE</Text>
                                  <Text style={styles.confidenceVal}>{(aiData.prediction?.confidence_score * 100 || 0).toFixed(0)}%</Text>
                             </View>
                        </View>
                    </View>
                    
                    {/* Attendance Drift Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                             <Ionicons name="pulse" size={24} color={aiData.drift?.drift_risk === 'High' ? colors.hot : colors.green} />
                             <Text style={styles.cardTitle}>ATTENDANCE DRIFT ANALYSIS</Text>
                        </View>
                        <Text style={styles.cardDesc}>Detects anomalies in your recent attendance patterns compared to your overall baseline.</Text>
                        
                        <View style={[styles.driftBox, { borderColor: aiData.drift?.drift_risk === 'High' ? colors.hot : colors.green }]}>
                             <Text style={[styles.driftStatus, { color: aiData.drift?.drift_risk === 'High' ? colors.hot : colors.green }]}>
                                 RISK: {aiData.drift?.drift_risk?.toUpperCase()}
                             </Text>
                             <Text style={styles.driftMsg}>{aiData.drift?.message}</Text>
                        </View>
                        
                        <View style={styles.statsRow}>
                             <View style={styles.statLine}>
                                 <Text style={styles.statLab}>RECENT 5 DAYS</Text>
                                 <Text style={styles.statVal}>{(aiData.drift?.recent_trend * 100 || 0).toFixed(0)}%</Text>
                             </View>
                             <View style={styles.statLine}>
                                 <Text style={styles.statLab}>OVERALL AVERAGE</Text>
                                 <Text style={styles.statVal}>{(aiData.drift?.overall_average * 100 || 0).toFixed(0)}%</Text>
                             </View>
                        </View>
                    </View>
                    
                </View>
            )}
            
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg0 },
    centerContainer: { flex: 1, backgroundColor: colors.bg0, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 24, paddingTop: 60, paddingBottom: 20 },
    title: { fontFamily: 'Tanker', fontSize: 32, color: '#fff', letterSpacing: 1 },
    subTitle: { fontFamily: 'Satoshi', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
    emptyText: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 20, fontFamily: 'Satoshi' },
    
    errorBox: { margin: 24, padding: 20, backgroundColor: colors.hot + '10', borderRadius: 16, borderWidth: 1, borderColor: colors.hot + '30', alignItems: 'center', gap: 8 },
    errorText: { fontFamily: 'Tanker', fontSize: 18, color: colors.hot, letterSpacing: 1 },
    errorSub: { fontFamily: 'Satoshi', fontSize: 13, color: 'rgba(255,255,255,0.7)' },
    
    content: { paddingHorizontal: 24, gap: 20 },
    card: { backgroundColor: colors.surf, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    cardTitle: { fontFamily: 'Tanker', fontSize: 18, color: '#fff', letterSpacing: 1 },
    cardDesc: { fontFamily: 'Satoshi', fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 20, marginBottom: 20 },
    
    predictionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 12 },
    predictionVal: { fontFamily: 'Tanker', fontSize: 48 },
    confidenceLab: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },
    confidenceVal: { fontFamily: 'Tanker', fontSize: 24, color: '#fff', textAlign: 'right' },
    
    driftBox: { padding: 16, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.3)', marginBottom: 16 },
    driftStatus: { fontFamily: 'Tanker', fontSize: 20, letterSpacing: 1, marginBottom: 4 },
    driftMsg: { fontFamily: 'Satoshi', fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },
    
    statsRow: { flexDirection: 'row', gap: 12 },
    statLine: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, alignItems: 'center' },
    statLab: { fontFamily: 'Satoshi-Bold', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 4 },
    statVal: { fontFamily: 'Tanker', fontSize: 18, color: '#fff' }
});
