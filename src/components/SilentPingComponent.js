import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Animated, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../api/config';

const SilentPingComponent = ({ classId, className, onPingComplete }) => {
    const [isPinging, setIsPinging] = useState(false);
    const [progress, setProgress] = useState(new Animated.Value(0));
    const [results, setResults] = useState(null);

    const startPing = () => {
        setIsPinging(true);
        setProgress(new Animated.Value(0));

        Animated.timing(progress, {
            toValue: 1,
            duration: 5000,
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (finished) {
                completePing();
            }
        });
    };

    const completePing = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/admin/ping`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ class_id: classId || 1 })
            });
            const data = await res.json();

            if (res.ok) {
                setResults(data.results);
            } else {
                Alert.alert('Ping Failed', data.error || 'Server error');
                setResults({ responded: 0, noResponse: 0, flagged: 0, students: [] });
            }
        } catch (e) {
            console.log('Ping err:', e);
            Alert.alert('Network Error', 'Could not reach server');
            setResults({ responded: 0, noResponse: 0, flagged: 0, students: [] });
        }
        setIsPinging(false);
        if (onPingComplete) onPingComplete();
    };

    return (
        <View style={styles.container}>
            {!isPinging && !results ? (
                <TouchableOpacity style={styles.pingBtn} onPress={startPing}>
                    <LinearGradient
                        colors={['#7b5fff', '#00c8ff']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradient}
                    >
                        <Ionicons name="radio-outline" size={20} color="#fff" />
                        <Text style={styles.pingBtnText}>LAUNCH SILENT PING</Text>
                    </LinearGradient>
                </TouchableOpacity>
            ) : isPinging ? (
                <View style={styles.activePing}>
                    <Text style={styles.activeLabel}>BROADCASTING PROTOCOL...</Text>
                    <View style={styles.progressBar}>
                        <Animated.View
                            style={[
                                styles.progressFill,
                                { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }
                            ]}
                        />
                    </View>
                    <Text style={styles.activeSub}>Requesting biometric verification from {className}...</Text>
                </View>
            ) : (
                <View style={styles.resultsContainer}>
                    <View style={styles.resHeader}>
                        <View style={styles.resStat}>
                            <Text style={styles.resVal}>{results.responded}</Text>
                            <Text style={styles.resLbl}>VERIFIED</Text>
                        </View>
                        <View style={styles.resStat}>
                            <Text style={[styles.resVal, { color: '#ff6b35' }]}>{results.noResponse}</Text>
                            <Text style={styles.resLbl}>PENDING</Text>
                        </View>
                        <View style={styles.resStat}>
                            <Text style={[styles.resVal, { color: '#ff3b5c' }]}>{results.flagged}</Text>
                            <Text style={styles.resLbl}>FLAGGED</Text>
                        </View>
                    </View>

                    <FlatList
                        data={results.students}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.studentRow}>
                                <View style={[styles.statusDot, { backgroundColor: item.status === 'responded' ? '#10b981' : (item.status === 'flagged' ? '#ff3b5c' : '#ff6b35') }]} />
                                <Text style={styles.studentName}>{item.name}</Text>
                                <Text style={styles.studentStatus}>{item.status.toUpperCase()}</Text>
                                <Text style={styles.studentTime}>{item.time}</Text>
                            </View>
                        )}
                    />

                    <TouchableOpacity style={styles.resetBtn} onPress={() => setResults(null)}>
                        <Text style={styles.resetBtnText}>RESET PROTOCOL</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 15,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,200,255,0.1)',
    },
    pingBtn: {
        height: 50,
        borderRadius: 10,
        overflow: 'hidden',
    },
    gradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    pingBtnText: {
        color: '#fff',
        fontFamily: 'Satoshi-Bold',
        letterSpacing: 1,
        fontSize: 14,
    },
    activePing: {
        alignItems: 'center',
    },
    activeLabel: {
        color: '#00c8ff',
        fontFamily: 'Satoshi-Bold',
        fontSize: 12,
        letterSpacing: 2,
        marginBottom: 10,
    },
    progressBar: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#00c8ff',
    },
    activeSub: {
        color: 'rgba(232,244,253,0.5)',
        fontSize: 11,
    },
    resultsContainer: {
        width: '100%',
    },
    resHeader: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        marginBottom: 10,
    },
    resStat: {
        alignItems: 'center',
    },
    resVal: {
        color: '#10b981',
        fontFamily: 'Satoshi-Bold',
        fontSize: 18,
    },
    resLbl: {
        color: 'rgba(232,244,253,0.4)',
        fontSize: 9,
        letterSpacing: 1,
        marginTop: 2,
    },
    studentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.03)',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 10,
    },
    studentName: {
        color: '#e8f4fd',
        fontSize: 13,
        flex: 1,
    },
    studentStatus: {
        color: 'rgba(232,244,253,0.4)',
        fontSize: 9,
        marginRight: 10,
    },
    studentTime: {
        color: 'rgba(232,244,253,0.5)',
        fontFamily: 'Satoshi',
        fontSize: 10,
    },
    resetBtn: {
        marginTop: 15,
        padding: 10,
        alignItems: 'center',
    },
    resetBtnText: {
        color: 'rgba(232,244,253,0.4)',
        fontSize: 11,
        letterSpacing: 1,
    }
});

export default SilentPingComponent;
