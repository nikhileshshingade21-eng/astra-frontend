import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    Dimensions,
    ActivityIndicator
} from 'react-native';
import * as SecureStore from '../utils/storage';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { fetchWithTimeout } from '../utils/api';
import Colors from '../theme/colors';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Circular progress component for overall attendance
const ProgressRing = ({ percentage, color }) => {
    const radius = 60;
    const strokeWidth = 12;
    const normalizedRadius = radius - strokeWidth * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <View style={styles.ringContainer}>
            {/* Outer ring background */}
            <View style={[styles.ring, { borderColor: Colors.border, borderWidth: strokeWidth, borderRadius: radius, width: radius * 2, height: radius * 2 }]} />
            
            {/* Active ring - simplified with absolute positioning for a 3/4 circle look since SVG is complex in plain RN */}
            <View style={[styles.ringInner, { 
                borderBottomColor: color, borderLeftColor: color, borderTopColor: percentage > 50 ? color : 'transparent', borderRightColor: percentage > 75 ? color : 'transparent',
                borderWidth: strokeWidth, borderRadius: radius, width: radius * 2, height: radius * 2, transform: [{ rotate: '-45deg' }]
            }]} />
            
            <View style={styles.ringContent}>
                <Text style={styles.ringValue}>{percentage}%</Text>
                <Text style={styles.ringLabel}>Total</Text>
            </View>
        </View>
    );
};

export default function AttendanceAnalyticsScreen({ navigation }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const token = await SecureStore.getItemAsync('token');
                if (token) {
                    const res = await fetchWithTimeout(`/api/dashboard/stats`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok && res.data) setStats(res.data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <LinearGradient colors={Colors.gradientBg} style={StyleSheet.absoluteFill} />
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!stats) return <View style={styles.container}><Text style={{color: '#fff', alignSelf: 'center', marginTop: 100}}>Failed to load data</Text></View>;

    // Prepare chart data
    const bgColors = [Colors.primary, Colors.accent, Colors.success, Colors.warning];
    const subjects = stats.subjects || [];
    
    const barData = {
        labels: subjects.map(s => s.code),
        datasets: [{
            data: subjects.map(s => s.pct)
        }]
    };

    const hasData = subjects.length > 0;
    const ringColor = stats.percentage >= 75 ? Colors.success : (stats.percentage >= 60 ? Colors.warning : Colors.danger);

    return (
        <View style={styles.container}>
            <LinearGradient colors={Colors.gradientBg} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Analytics</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Overall Progress Container */}
                <Animated.View entering={FadeInDown.delay(100)} style={styles.overviewCard}>
                    <View style={styles.overviewHeader}>
                        <Text style={styles.overviewTitle}>Overall Attendance</Text>
                        <View style={[styles.statusTag, { backgroundColor: ringColor + '20' }]}>
                            <Text style={[styles.statusTagText, { color: ringColor }]}>
                                {stats.percentage >= 75 ? 'Safe' : 'Critical'}
                            </Text>
                        </View>
                    </View>
                    
                    <View style={styles.ringRow}>
                        <ProgressRing percentage={stats.percentage || 0} color={ringColor} />
                        
                        <View style={styles.statsSummary}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryVal}>{stats.total_attended || 0}</Text>
                                <Text style={styles.summaryLab}>Classes Attended</Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={[styles.summaryVal, { color: Colors.danger }]}>
                                    {(stats.total_classes || 0) - (stats.total_attended || 0)}
                                </Text>
                                <Text style={styles.summaryLab}>Classes Missed</Text>
                            </View>
                            
                            {stats.bunk_stats && (
                                <View style={[styles.bunkIndicator, { backgroundColor: stats.bunk_stats.can_bunk > 0 ? Colors.successGlass : Colors.dangerGlass }]}>
                                    <Ionicons name={stats.bunk_stats.can_bunk > 0 ? "checkmark-circle" : "warning"} size={14} color={stats.bunk_stats.can_bunk > 0 ? Colors.success : Colors.danger} />
                                    <Text style={[styles.bunkIndicatorText, { color: stats.bunk_stats.can_bunk > 0 ? Colors.success : Colors.danger }]}>
                                        {stats.bunk_stats.can_bunk > 0 
                                            ? `Can bunk ${stats.bunk_stats.can_bunk} classes` 
                                            : `Must attend ${stats.bunk_stats.must_attend} classes`}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </Animated.View>

                {/* Prediction Alert */}
                {stats.predictive_insights && stats.percentage < 75 && (
                    <Animated.View entering={FadeInDown.delay(200)} style={styles.alertCard}>
                        <Ionicons name="analytics" size={24} color={Colors.warning} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.alertTitle}>AI Trajectory Alert</Text>
                            <Text style={styles.alertDesc}>At your current rate, you will fall to {(stats.percentage - 5).toFixed(1)}% by the end of the month. Increase attendance by 15% to reach safe grounds.</Text>
                        </View>
                    </Animated.View>
                )}

                {/* Subject Breakdown Chart */}
                {hasData && (
                    <Animated.View entering={FadeInDown.delay(300)} style={styles.chartSection}>
                        <Text style={styles.sectionTitle}>Subject Breakdown</Text>
                        <View style={styles.chartCard}>
                            <BarChart
                                data={barData}
                                width={width - 76}
                                height={220}
                                yAxisLabel=""
                                yAxisSuffix="%"
                                chartConfig={{
                                    backgroundColor: 'transparent',
                                    backgroundGradientFrom: 'transparent',
                                    backgroundGradientTo: 'transparent',
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => Colors.primary,
                                    labelColor: (opacity = 1) => Colors.textMuted,
                                    style: { borderRadius: 16 },
                                    barPercentage: 0.6,
                                }}
                                style={{ marginVertical: 8, borderRadius: 16 }}
                                showValuesOnTopOfBars
                            />
                        </View>
                    </Animated.View>
                )}

                {/* Subject List */}
                {hasData && (
                    <Animated.View entering={FadeInDown.delay(400)} style={styles.subjectList}>
                        <Text style={styles.sectionTitle}>Detailed Analysis</Text>
                        {subjects.map((sub, idx) => {
                            const subColor = bgColors[idx % bgColors.length];
                            return (
                                <View key={idx} style={styles.subjectRow}>
                                    <View style={styles.subLeft}>
                                        <View style={[styles.subDot, { backgroundColor: subColor }]} />
                                        <View>
                                            <Text style={styles.subCode}>{sub.code}</Text>
                                            <Text style={styles.subName} numberOfLines={1}>{sub.name.replace(/_/g, ' ')}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.subRight}>
                                        <Text style={[styles.subPct, { color: sub.pct >= 75 ? Colors.success : Colors.danger }]}>{sub.pct}%</Text>
                                        {sub.can_bunk > 0 ? (
                                            <Text style={styles.subAction}>Can miss {sub.can_bunk}</Text>
                                        ) : sub.must_attend > 0 ? (
                                            <Text style={[styles.subAction, { color: Colors.danger }]}>Attend {sub.must_attend}</Text>
                                        ) : (
                                            <Text style={styles.subAction}>Borderline</Text>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </Animated.View>
                )}

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', gap: 16 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.glass, justifyContent: 'center', alignItems: 'center' },
    title: { fontFamily: 'Tanker', fontSize: 28, color: '#fff' },

    scroll: { paddingHorizontal: 24, paddingBottom: 50 },

    overviewCard: { backgroundColor: Colors.bgCard, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: Colors.border, marginBottom: 20 },
    overviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    overviewTitle: { fontFamily: 'Satoshi-Bold', fontSize: 16, color: '#fff' },
    statusTag: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    statusTagText: { fontFamily: 'Satoshi-Bold', fontSize: 11 },

    ringRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
    ringContainer: { justifyContent: 'center', alignItems: 'center' },
    ring: { position: 'absolute' },
    ringInner: { position: 'absolute' },
    ringContent: { alignItems: 'center' },
    ringValue: { fontFamily: 'Tanker', fontSize: 32, color: '#fff' },
    ringLabel: { fontFamily: 'Satoshi-Medium', fontSize: 10, color: Colors.textMuted },

    statsSummary: { flex: 1, gap: 12 },
    summaryItem: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    summaryVal: { fontFamily: 'Tanker', fontSize: 24, color: '#fff' },
    summaryLab: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: Colors.textMuted },
    
    bunkIndicator: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, gap: 6, marginTop: 4 },
    bunkIndicatorText: { fontFamily: 'Satoshi-Bold', fontSize: 10 },

    alertCard: { flexDirection: 'row', backgroundColor: Colors.warningGlass, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.warning + '40', marginBottom: 20 },
    alertTitle: { fontFamily: 'Satoshi-Bold', fontSize: 13, color: Colors.warning, marginBottom: 4 },
    alertDesc: { fontFamily: 'Satoshi-Medium', fontSize: 11, color: Colors.textSecondary, lineHeight: 16 },

    sectionTitle: { fontFamily: 'Satoshi-Bold', fontSize: 14, color: '#fff', marginBottom: 12 },
    chartSection: { marginBottom: 24 },
    chartCard: { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },

    subjectList: { gap: 10 },
    subjectRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
    subLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    subDot: { width: 10, height: 10, borderRadius: 5 },
    subCode: { fontFamily: 'Satoshi-Black', fontSize: 11, color: Colors.textMuted, letterSpacing: 0.5 },
    subName: { fontFamily: 'Tanker', fontSize: 16, color: '#fff', marginTop: 2 },
    subRight: { alignItems: 'flex-end', width: 80 },
    subPct: { fontFamily: 'Tanker', fontSize: 20, color: '#fff' },
    subAction: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: Colors.textMuted, marginTop: 2 }
});
