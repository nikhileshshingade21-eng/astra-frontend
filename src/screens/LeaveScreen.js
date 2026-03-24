import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE } from '../api/config';
import { Ionicons } from '@expo/vector-icons';

const colors = {
    bg0: '#0f172a', surf: 'rgba(255, 255, 255, 0.05)',
    hot: '#3b82f6', green: '#10b981', oran: '#ff8a1f', cyan: '#0ea5e9', purp: '#6366f1', border: 'rgba(255, 255, 255, 0.12)'
};

export default function LeaveScreen({ route }) {
    const { user } = route.params || {};
    const roleColor = colors.purp;

    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [applying, setApplying] = useState(false);

    const loadLeaves = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/leaves/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLeaves(data.leaves || []);
            }
        } catch (e) {
            console.log('Leaves fetch err:', e);
        }
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        loadLeaves();
    }, []);

    const submitLeave = async () => {
        if(!startDate || !endDate) return Alert.alert('Error', 'Start and End dates are required (YYYY-MM-DD)');
        
        setApplying(true);
        try {
             const token = await AsyncStorage.getItem('token');
             const res = await fetch(`${API_BASE}/api/leaves/apply`, {
                 method: 'POST',
                 headers: { 
                     'Authorization': `Bearer ${token}`,
                     'Content-Type': 'application/json'
                 },
                 body: JSON.stringify({ start_date: startDate, end_date: endDate, reason })
             });
             
             if(res.ok) {
                 Alert.alert('Success', 'Leave request submitted.');
                 setStartDate('');
                 setEndDate('');
                 setReason('');
                 loadLeaves();
             } else {
                 Alert.alert('Error', 'Failed to submit request.');
             }
        } catch (e) {
             Alert.alert('Error', 'Network error.');
        }
        setApplying(false);
    }

    const onRefresh = () => {
        setRefreshing(true);
        loadLeaves();
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
                <Text style={styles.title}>LEAVE REQUESTS</Text>
                <Text style={styles.subTitle}>Manage Absences & Approvals</Text>
            </View>

            <View style={styles.formContainer}>
                 <Text style={styles.formLabel}>APPLY FOR LEAVE</Text>
                 
                 <View style={styles.dateRow}>
                     <TextInput 
                         style={[styles.input, {flex: 1}]} 
                         placeholder="Start Date (YYYY-MM-DD)" 
                         placeholderTextColor="rgba(255,255,255,0.3)"
                         value={startDate}
                         onChangeText={setStartDate}
                     />
                     <TextInput 
                         style={[styles.input, {flex: 1}]} 
                         placeholder="End Date (YYYY-MM-DD)" 
                         placeholderTextColor="rgba(255,255,255,0.3)"
                         value={endDate}
                         onChangeText={setEndDate}
                     />
                 </View>
                 
                 <TextInput 
                     style={[styles.input, {height: 80, textAlignVertical: 'top'}]} 
                     placeholder="Reason for leave..." 
                     placeholderTextColor="rgba(255,255,255,0.3)"
                     multiline
                     value={reason}
                     onChangeText={setReason}
                 />
                 
                 <TouchableOpacity 
                     style={[styles.btn, {backgroundColor: roleColor, opacity: applying ? 0.7 : 1}]}
                     onPress={submitLeave}
                     disabled={applying}
                 >
                     <Text style={styles.btnText}>{applying ? 'SUBMITTING...' : 'SUBMIT REQUEST'}</Text>
                 </TouchableOpacity>
            </View>

            <View style={styles.listContainer}>
                <Text style={styles.sectionTitle}>YOUR HISTORY</Text>
                
                {leaves.length === 0 ? (
                    <Text style={styles.emptyText}>No leave requests found.</Text>
                ) : (
                    leaves.map((leave, i) => {
                        const statusColor = leave.status === 'approved' ? colors.green : leave.status === 'rejected' ? colors.hot : colors.oran;
                        
                        return (
                            <View key={leave.id} style={styles.leaveCard}>
                                <View style={styles.leaveTop}>
                                    <View>
                                        <Text style={styles.datesText}>{leave.start_date} to {leave.end_date}</Text>
                                        <Text style={styles.appliedText}>Applied: {new Date(leave.applied_at).toLocaleDateString()}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
                                        <Text style={[styles.statusText, { color: statusColor }]}>{leave.status.toUpperCase()}</Text>
                                    </View>
                                </View>
                                
                                {leave.reason && (
                                    <Text style={styles.reasonText}>"{leave.reason}"</Text>
                                )}
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
    
    formContainer: { paddingHorizontal: 24, marginBottom: 30 },
    formLabel: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 12 },
    dateRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    input: { backgroundColor: colors.surf, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 15, color: '#fff', fontFamily: 'Satoshi', marginBottom: 12 },
    btn: { padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 8 },
    btnText: { fontFamily: 'Tanker', fontSize: 16, color: '#fff', letterSpacing: 1 },
    
    listContainer: { paddingHorizontal: 24, gap: 12 },
    sectionTitle: { fontFamily: 'Tanker', fontSize: 16, color: '#fff', letterSpacing: 1, marginBottom: 8 },
    emptyText: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 20, fontFamily: 'Satoshi' },
    
    leaveCard: { backgroundColor: colors.surf, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
    leaveTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    datesText: { fontFamily: 'Satoshi-Bold', fontSize: 14, color: '#fff', marginBottom: 4 },
    appliedText: { fontFamily: 'Satoshi', fontSize: 10, color: 'rgba(255,255,255,0.3)' },
    
    reasonText: { fontFamily: 'Satoshi', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 12, fontStyle: 'italic' },
    
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    statusText: { fontFamily: 'Tanker', fontSize: 12, letterSpacing: 1 }
});
