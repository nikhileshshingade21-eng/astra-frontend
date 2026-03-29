import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    RefreshControl, 
    ActivityIndicator, 
    TouchableOpacity, 
    TextInput, 
    Alert,
    StatusBar,
    Dimensions,
    Platform,
    UIManager
} from 'react-native';
import * as SecureStore from '../utils/storage';
import LinearGradient from 'react-native-linear-gradient';
// import { BlurView } from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInUp } from 'react-native-reanimated';
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

export default function LeaveScreen({ route, navigation }) {
    const { user } = route.params || { user: { name: 'OPERATOR' } };
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [applying, setApplying] = useState(false);

    const loadLeaves = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/leaves/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok && res.data) {
                setLeaves(res.data.leaves || []);
            }
        } catch (e) {}
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        loadLeaves();
    }, []);

    const submitLeave = async () => {
        if(!startDate || !endDate) return Alert.alert('DATA_VOID', 'Sequence start/end required.');
        setApplying(true);
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/leaves/apply`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ start_date: startDate, end_date: endDate, reason })
            });
            if(res.ok && res.data) {
                Alert.alert('LOGGED', 'Absence protocol initiated.');
                setStartDate(''); setEndDate(''); setReason('');
                loadLeaves();
            } else {
                Alert.alert('LINK_FAILURE', res.data?.error || 'Could not submit request.');
            }
        } catch (e) {}
        setApplying(false);
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
                    <Text style={styles.title}>ABSENCE_PROTOCOLS</Text>
                    <Text style={styles.sub}>LOG_SUBMISSION_PORTAL_v2.0</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadLeaves} tintColor={colors.neonPurple} />} showsVerticalScrollIndicator={false}>
                <View blurType="dark" blurAmount={10} style={styles.formCard}>
                    <Text style={styles.formLab}>INITIALIZE_REQUEST</Text>
                    <View style={styles.inputRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLab}>START_SEQ</Text>
                            <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="rgba(255,255,255,0.1)" value={startDate} onChangeText={setStartDate} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLab}>END_SEQ</Text>
                            <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="rgba(255,255,255,0.1)" value={endDate} onChangeText={setEndDate} />
                        </View>
                    </View>
                    <View style={{ marginTop: 15 }}>
                        <Text style={styles.fieldLab}>REASON_LOG</Text>
                        <TextInput style={[styles.input, styles.textArea]} placeholder="INPUT_JUSTIFICATION..." placeholderTextColor="rgba(255,255,255,0.1)" multiline value={reason} onChangeText={setReason} />
                    </View>
                    <TouchableOpacity style={styles.submitBtn} onPress={submitLeave} disabled={applying}>
                        <LinearGradient colors={[colors.neonPurple, colors.neonPink]} style={styles.submitGrad}>
                            {applying ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.submitText}>COMMIT_REQUEST</Text>}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <View style={styles.historySection}>
                    <Text style={styles.secTitle}>SEQUENCE_HISTORY</Text>
                    {leaves.map((l, i) => (
                        <Animated.View key={l.id} entering={FadeInUp.delay(i * 100)}>
                            <View blurType="dark" blurAmount={3} style={styles.leaveCard}>
                                <View style={styles.cardTop}>
                                    <View>
                                        <Text style={styles.dateRange}>{l.start_date.split('T')[0]} → {l.end_date.split('T')[0]}</Text>
                                        <Text style={styles.appliedAt}>APPLIED: {new Date(l.applied_at).toLocaleDateString().toUpperCase()}</Text>
                                    </View>
                                    <View style={[styles.badge, { borderColor: l.status === 'approved' ? colors.neonGreen : (l.status === 'rejected' ? colors.hot : colors.neonPurple) }]}>
                                        <Text style={[styles.badgeText, { color: l.status === 'approved' ? colors.neonGreen : (l.status === 'rejected' ? colors.hot : colors.neonPurple) }]}>{l.status.toUpperCase()}</Text>
                                    </View>
                                </View>
                                {l.reason && <Text style={styles.reasonBlurb}>"{l.reason}"</Text>}
                            </View>
                        </Animated.View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 25, flexDirection: 'row', alignItems: 'center', gap: 15 },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    title: { fontFamily: 'Tanker', fontSize: 26, color: '#fff', letterSpacing: 1 },
    sub: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.neonPurple, letterSpacing: 2, marginTop: 4 },

    scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
    formCard: { padding: 24, borderRadius: 28, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 40 },
    formLab: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.neonPurple, letterSpacing: 2, marginBottom: 20 },
    inputRow: { flexDirection: 'row', gap: 12 },
    fieldLab: { fontFamily: 'Satoshi-Black', fontSize: 7, color: colors.textDim, letterSpacing: 1, marginBottom: 8 },
    input: { height: 48, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, paddingHorizontal: 15, color: '#fff', fontFamily: 'Satoshi-Bold', fontSize: 13, borderWidth: 1, borderColor: colors.border },
    textArea: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
    submitBtn: { height: 50, borderRadius: 12, overflow: 'hidden', marginTop: 25 },
    submitGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    submitText: { fontFamily: 'Tanker', fontSize: 16, color: '#000', letterSpacing: 1 },

    historySection: { gap: 12 },
    secTitle: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.textDim, letterSpacing: 3, marginBottom: 15 },
    leaveCard: { padding: 20, borderRadius: 24, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 12 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    dateRange: { fontFamily: 'Satoshi-Black', fontSize: 14, color: '#fff' },
    appliedAt: { fontFamily: 'Satoshi-Bold', fontSize: 8, color: colors.textDim, marginTop: 4 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
    badgeText: { fontFamily: 'Tanker', fontSize: 10, letterSpacing: 1 },
    reasonBlurb: { marginTop: 15, fontFamily: 'Satoshi-Medium', fontSize: 12, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }
});

