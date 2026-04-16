import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    RefreshControl, 
    ActivityIndicator, 
    TouchableOpacity,
    StatusBar,
    Dimensions,
    Platform,
    UIManager
} from 'react-native';
import * as SecureStore from '../utils/storage';
import LinearGradient from 'react-native-linear-gradient';
// import { BlurView } from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming, 
    FadeInRight 
} from 'react-native-reanimated';
import { fetchWithTimeout } from '../utils/api';
import Colors from '../theme/colors';
import AstraTouchable from '../components/AstraTouchable';

const { width } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const colors = Colors;

export default function InsightsScreen({ route, navigation }) {
    const { user } = route.params || { user: { name: 'Student' } };
    const [aiData, setAiData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const pulse = useSharedValue(1);

    useEffect(() => {
        loadData();
        pulse.value = withRepeat(withTiming(1.1, { duration: 1000 }), -1, true);
    }, []);

    const loadData = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/ai/report/${user.roll_number}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok && res.data) {
                setAiData(res.data);
            }
        } catch (e) {
            console.warn('[Insights] Load error:', e.message);
        }
        setLoading(false);
        setRefreshing(false);
    };

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
        opacity: 0.8
    }));

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <AstraTouchable onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </AstraTouchable>
                <View>
                    <Text style={styles.title}>AI Insights</Text>
                    <Text style={styles.sub}>Smart performance analysis</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={colors.neonBlue} />} showsVerticalScrollIndicator={false}>
                {aiData?.error ? (
                    <View blurType="dark" blurAmount={8} style={styles.errorCard}>
                        <Ionicons name="alert-circle" size={40} color={colors.hot} />
                        <Text style={styles.errorTitle}>Service Unavailable</Text>
                        <Text style={styles.errorText}>{aiData.error}</Text>
                    </View>
                ) : !aiData ? (
                    <ActivityIndicator size="large" color={colors.neonBlue} style={{ marginTop: 100 }} />
                ) : (
                    <View style={styles.content}>
                        <View blurType="dark" blurAmount={10} style={styles.mainCard}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="analytics-outline" size={20} color={colors.neonBlue} />
                                <Text style={styles.cardTitle}>PREDICTED FINAL SCORE</Text>
                            </View>
                            <View style={styles.predictionArea}>
                                <Text style={styles.predictionPct}>{aiData.prediction?.predicted_marks || '--'}%</Text>
                                <View style={styles.confidenceBox}>
                                    <Text style={styles.confLab}>CONFIDENCE</Text>
                                    <Text style={styles.confVal}>{(aiData.prediction?.confidence_score * 100 || 0).toFixed(0)}%</Text>
                                </View>
                            </View>
                            <View style={styles.track}>
                                <LinearGradient colors={colors.gradientPrimary} style={[styles.fill, { width: `${aiData.prediction?.predicted_marks}%` }]} />
                            </View>
                        </View>

                        <View blurType="dark" blurAmount={8} style={styles.driftCard}>
                            <View style={styles.cardHeader}>
                                <Animated.View style={[styles.pulseDot, pulseStyle, { backgroundColor: aiData.drift?.drift_risk === 'High' ? colors.hot : colors.neonGreen }]} />
                                <Text style={styles.cardTitle}>ATTENDANCE TREND</Text>
                            </View>
                            <View style={styles.driftStatus}>
                                <Text style={[styles.riskLevel, { color: aiData.drift?.drift_risk === 'High' ? colors.hot : colors.neonGreen }]}>
                                    RISK: {aiData.drift?.drift_risk?.toUpperCase()}
                                </Text>
                                <Text style={styles.driftMsg}>{aiData.drift?.message}</Text>
                            </View>
                            <View style={styles.driftStats}>
                                <View style={styles.driftStat}>
                                    <Text style={styles.dLab}>RECENT</Text>
                                    <Text style={styles.dVal}>{(aiData.drift?.recent_trend * 100 || 0).toFixed(0)}%</Text>
                                </View>
                                <View style={styles.vLine} />
                                <View style={styles.driftStat}>
                                    <Text style={styles.dLab}>OVERALL AVG</Text>
                                    <Text style={styles.dVal}>{(aiData.drift?.overall_average * 100 || 0).toFixed(0)}%</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.infoHub}>
                            <Ionicons name="information-circle-outline" size={16} color={colors.textDim} />
                            <Text style={styles.infoText}>Analysis based on your attendance and marks data</Text>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 25, flexDirection: 'row', alignItems: 'center', gap: 15 },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    title: { fontFamily: 'Tanker', fontSize: 26, color: '#fff', letterSpacing: 1 },
    sub: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.neonBlue, letterSpacing: 2, marginTop: 4 },

    scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
    errorCard: { padding: 40, alignItems: 'center', borderRadius: 32, borderWidth: 1, borderColor: colors.hot + '40', marginTop: 40 },
    errorTitle: { fontFamily: 'Tanker', fontSize: 20, color: colors.hot, marginTop: 20 },
    errorText: { fontFamily: 'Satoshi-Bold', fontSize: 13, color: colors.textDim, textAlign: 'center', marginTop: 10 },

    content: { gap: 20 },
    mainCard: { padding: 30, borderRadius: 32, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 25 },
    cardTitle: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.textDim, letterSpacing: 2 },
    predictionArea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    predictionPct: { fontFamily: 'Tanker', fontSize: 56, color: '#fff' },
    confidenceBox: { alignItems: 'flex-end' },
    confLab: { fontFamily: 'Satoshi-Black', fontSize: 7, color: colors.textDim, letterSpacing: 1 },
    confVal: { fontFamily: 'Tanker', fontSize: 24, color: '#fff' },
    track: { height: 4, width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 25, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 2 },

    driftCard: { padding: 25, borderRadius: 32, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    pulseDot: { width: 8, height: 8, borderRadius: 4 },
    driftStatus: { marginBottom: 25 },
    riskLevel: { fontFamily: 'Tanker', fontSize: 20, letterSpacing: 1 },
    driftMsg: { fontFamily: 'Satoshi-Medium', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 8, lineHeight: 20 },
    driftStats: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', padding: 20, borderRadius: 20 },
    driftStat: { flex: 1, alignItems: 'center' },
    dLab: { fontFamily: 'Satoshi-Black', fontSize: 7, color: colors.textDim, letterSpacing: 1 },
    dVal: { fontFamily: 'Tanker', fontSize: 20, color: '#fff', marginTop: 4 },
    vLine: { width: 1, height: '80%', backgroundColor: colors.border },

    infoHub: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: 0.4 },
    infoText: { fontFamily: 'Satoshi-Black', fontSize: 7, color: '#fff', letterSpacing: 1 }
});

