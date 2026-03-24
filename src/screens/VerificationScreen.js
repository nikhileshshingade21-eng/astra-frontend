import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    StatusBar,
    Animated,
    Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../api/config';

const VERIFICATION_TIME = 45; // 45 seconds countdown

const VerificationScreen = ({ navigation }) => {
    const [timeLeft, setTimeLeft] = useState(VERIFICATION_TIME);
    const [isActive, setIsActive] = useState(false);
    const [verifiedCount, setVerifiedCount] = useState(0);
    const [pulseAnim] = useState(new Animated.Value(1));

    const [gridData, setGridData] = useState([]);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const studentUsers = (data.users || []).filter(u => u.role === 'student').map(u => ({
                    id: u.roll_number?.toUpperCase() || `U${u.id}`,
                    verified: false
                }));
                // Fill up to 30 spots for the grid display
                while (studentUsers.length < 30) {
                    studentUsers.push({ id: `GS${studentUsers.length + 100}`, verified: false });
                }
                setGridData(studentUsers.slice(0, 30));
            }
        } catch (e) {
            console.log('Error fetching verification users:', e);
        }
    };

    useEffect(() => {
        let timer;
        if (isActive && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setIsActive(false);
                        return 0;
                    }
                    return prev - 1;
                });

                // Because this is a verification protocol visualization, 
                // we simulate the verification coming through live socket
                // in reality we would poll an endpoint or use WebSocket
                if (Math.random() > 0.4) {
                    setGridData(prev => {
                        const unverified = prev.filter(s => !s.verified);
                        if (unverified.length > 0) {
                            const randomIndex = Math.floor(Math.random() * unverified.length);
                            const selectedId = unverified[randomIndex].id;

                            setVerifiedCount(c => c + 1);

                            return prev.map(s =>
                                s.id === selectedId ? { ...s, verified: true } : s
                            );
                        }
                        return prev;
                    });
                }
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isActive, timeLeft]);

    useEffect(() => {
        if (isActive) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    })
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isActive]);

    const handleStart = () => {
        setIsActive(true);
        setTimeLeft(VERIFICATION_TIME);
        setVerifiedCount(0);
        setGridData(prev => prev.map(s => ({ ...s, verified: false })));
    };

    const handleStop = () => {
        setIsActive(false);
        pulseAnim.setValue(1);
        setTimeLeft(VERIFICATION_TIME);
    };

    const progressPercentage = (verifiedCount / gridData.length) * 100;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>VERIFICATION PROTOCOL</Text>
                    <Text style={styles.headerSub}>STATUS: {isActive ? 'ACTIVE' : 'STANDBY'}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                <View style={styles.timerCard}>
                    <Animated.View style={[
                        styles.timerCirc,
                        {
                            transform: [{ scale: pulseAnim }],
                            borderColor: isActive ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                            shadowColor: isActive ? '#3b82f6' : 'transparent',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: isActive ? 0.8 : 0,
                            shadowRadius: isActive ? 20 : 0,
                        }
                    ]}>
                        <Text style={[styles.timerSec, { color: isActive ? '#fff' : 'rgba(255,255,255,0.3)' }]}>
                            {timeLeft}s
                        </Text>
                        <Text style={styles.timerLabel}>REMAINING</Text>
                    </Animated.View>
                </View>

                {!isActive && timeLeft === VERIFICATION_TIME ? (
                    <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
                        <LinearGradient colors={['#3b82f6', '#6366f1']} style={styles.startBtnGrad}>
                            <Ionicons name="radio" size={24} color="#fff" style={{ marginRight: 10 }} />
                            <Text style={styles.startBtnText}>INITIATE PROTOCOL</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
                        <Text style={styles.stopBtnText}>ABORT PROTOCOL</Text>
                    </TouchableOpacity>
                )}

                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statVal}>{verifiedCount}</Text>
                        <Text style={styles.statLabel}>VERIFIED</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statVal}>{gridData.length - verifiedCount}</Text>
                        <Text style={styles.statLabel}>PENDING</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={[styles.statVal, { color: '#10b981' }]}>{Math.round(progressPercentage)}%</Text>
                        <Text style={styles.statLabel}>CLEARANCE</Text>
                    </View>
                </View>

                <View style={styles.gridContainer}>
                    <Text style={styles.gridTitle}>LIVE FEED: CLASSROOM A-301</Text>

                    <View style={styles.grid}>
                        {gridData.map((student, i) => (
                            <View
                                key={student.id + i}
                                style={[
                                    styles.gridCell,
                                    student.verified ? styles.gridCellVerified : styles.gridCellPending,
                                ]}
                            >
                                <Text style={styles.cellText}>{student.id.slice(-3)}</Text>
                            </View>
                        ))}
                    </View>
                </View>

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
        backgroundColor: '#0b0614',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
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
        color: '#3b82f6',
        letterSpacing: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    timerCard: {
        alignItems: 'center',
        marginVertical: 40,
    },
    timerCirc: {
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    timerSec: {
        fontFamily: 'Tanker',
        fontSize: 64,
        letterSpacing: 2,
    },
    timerLabel: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 2,
        marginTop: -5,
    },
    startBtn: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 30,
    },
    startBtnGrad: {
        flexDirection: 'row',
        paddingVertical: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    startBtnText: {
        fontFamily: 'Tanker',
        fontSize: 20,
        color: '#fff',
        letterSpacing: 1,
    },
    stopBtn: {
        borderRadius: 16,
        paddingVertical: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 59, 92, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 59, 92, 0.5)',
        marginBottom: 30,
    },
    stopBtnText: {
        fontFamily: 'Tanker',
        fontSize: 20,
        color: '#ff3b5c',
        letterSpacing: 1,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 20,
    },
    statBox: {
        alignItems: 'center',
    },
    statVal: {
        fontFamily: 'Tanker',
        fontSize: 28,
        color: '#fff',
    },
    statLabel: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 10,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 4,
        letterSpacing: 1,
    },
    gridContainer: {
        backgroundColor: '#0b0614',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    gridTitle: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1.5,
        marginBottom: 20,
        textAlign: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
    },
    gridCell: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    gridCellPending: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderColor: 'rgba(255,255,255,0.1)',
    },
    gridCellVerified: {
        backgroundColor: 'rgba(0, 255, 179, 0.2)',
        borderColor: '#10b981',
    },
    cellText: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 9,
        color: 'rgba(255,255,255,0.3)',
    }
});

export default VerificationScreen;
