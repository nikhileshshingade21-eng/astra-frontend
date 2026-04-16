import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    RefreshControl, 
    ActivityIndicator,
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
    withTiming, 
    FadeInRight 
} from 'react-native-reanimated';
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

export default function MarksScreen({ route }) {
    const { user } = route.params || { user: { name: 'Student' } };
    const [marks, setMarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadMarks = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/marks/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok && res.data) {
                setMarks(res.data.marks || []);
            }
        } catch (e) {
            console.warn('[Marks] Load error:', e.message);
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

    const aggregatePct = marks.length > 0 
        ? (marks.reduce((acc, m) => acc + (m.marks_obtained / m.total_marks), 0) / marks.length) * 100 
        : 0;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>My Marks</Text>
                    <Text style={styles.sub}>Academic Performance</Text>
                </View>
                <View style={styles.profileMini}>
                    <Text style={styles.rollCode}>{user.roll_number?.toUpperCase()}</Text>
                </View>
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neonBlue} />}
                showsVerticalScrollIndicator={false}
            >
                <View blurType="dark" blurAmount={10} style={styles.summaryCard}>
                    <Text style={styles.sumLab}>OVERALL AVERAGE</Text>
                    <Text style={styles.sumVal}>{aggregatePct.toFixed(1)}%</Text>
                    <View style={styles.progressTrack}>
                        <LinearGradient 
                            colors={[colors.neonBlue, colors.neonPurple]} 
                            start={{x:0, y:0}} end={{x:1, y:0}} 
                            style={[styles.progressFill, { width: `${aggregatePct}%` }]} 
                        />
                    </View>
                </View>

                {marks.length > 0 ? (
                    marks.map((mark, i) => (
                        <Animated.View key={mark.id} entering={FadeInRight.delay(i * 100)}>
                            <View blurType="dark" blurAmount={3} style={styles.markCard}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.subInfo}>
                                        <Text style={styles.subCode}>{mark.class_name.split(' ')[0]}</Text>
                                        <Text style={styles.subName}>{mark.class_name.split(' ').slice(1).join(' ').toUpperCase()}</Text>
                                    </View>
                                    <View style={[styles.gradeBadge, { borderColor: (mark.marks_obtained/mark.total_marks >= 0.8) ? colors.neonGreen : colors.neonBlue }]}>
                                        <Text style={[styles.gradeText, { color: (mark.marks_obtained/mark.total_marks >= 0.8) ? colors.neonGreen : colors.neonBlue }]}>
                                            {mark.marks_obtained/mark.total_marks >= 0.9 ? 'A+' : mark.marks_obtained/mark.total_marks >= 0.8 ? 'A' : 'B'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.dataRow}>
                                    <View style={styles.dataPoint}>
                                        <Text style={styles.dataLab}>EXAM TYPE</Text>
                                        <Text style={styles.dataVal}>{mark.exam_type.toUpperCase()}</Text>
                                    </View>
                                    <View style={styles.dataPoint}>
                                        <Text style={styles.dataLab}>SCORE</Text>
                                        <Text style={styles.scoreVal}>
                                            <Text style={{color: '#fff'}}>{mark.marks_obtained}</Text>
                                            <Text style={{color: colors.textDim}}> / {mark.total_marks}</Text>
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.miniTrack}>
                                    <View style={[styles.miniFill, { width: `${(mark.marks_obtained/mark.total_marks)*100}%`, backgroundColor: (mark.marks_obtained/mark.total_marks >= 0.8) ? colors.neonGreen : colors.neonBlue }]} />
                                </View>
                            </View>
                        </Animated.View>
                    ))
                ) : (
                    <View style={styles.empty}>
                        <Ionicons name="layers-outline" size={60} color={colors.textDim} />
                        <Text style={styles.emptyText}>No marks recorded yet</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontFamily: 'Tanker', fontSize: 28, color: '#fff', letterSpacing: 1 },
    sub: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.neonBlue, letterSpacing: 2 },
    profileMini: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border },
    rollCode: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, letterSpacing: 1 },

    scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
    summaryCard: { padding: 30, borderRadius: 32, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 30, alignItems: 'center' },
    sumLab: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.textDim, letterSpacing: 3, marginBottom: 15 },
    sumVal: { fontFamily: 'Tanker', fontSize: 48, color: '#fff' },
    progressTrack: { width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 25, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },

    markCard: { padding: 20, borderRadius: 24, borderWidth: 1, borderColor: colors.border, marginBottom: 16, overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    subInfo: { flex: 1 },
    subCode: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.neonBlue, letterSpacing: 1 },
    subName: { fontFamily: 'Tanker', fontSize: 16, color: '#fff', marginTop: 4 },
    gradeBadge: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
    gradeText: { fontFamily: 'Tanker', fontSize: 18 },

    dataRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    dataPoint: { },
    dataLab: { fontFamily: 'Satoshi-Black', fontSize: 7, color: colors.textDim, letterSpacing: 1, marginBottom: 4 },
    dataVal: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: '#fff' },
    scoreVal: { fontFamily: 'Tanker', fontSize: 18 },

    miniTrack: { width: '100%', height: 2, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' },
    miniFill: { height: '100%' },

    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontFamily: 'Tanker', fontSize: 18, color: colors.textDim, marginTop: 20, letterSpacing: 1 }
});

