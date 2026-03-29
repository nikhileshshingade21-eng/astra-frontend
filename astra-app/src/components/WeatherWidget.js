import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
// // import { BlurView } from '@react-native-community/blur'; // Removed for universal stability
import Ionicons from 'react-native-vector-icons/Ionicons';

const colors = {
    textDim: 'rgba(255, 255, 255, 0.4)',
    neonBlue: '#00f2ff',
    border: 'rgba(255, 255, 255, 0.08)',
};

export default function WeatherWidget() {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const auth = await Geolocation.requestAuthorization('whenInUse');
                
                if (auth !== 'granted') {
                    setWeather({ temp: '--', condition: 'LOC_OFFLINE', icon: 'cloud-offline', campus: 'GPS REQUIRED' });
                    setLoading(false);
                    return;
                }

                Geolocation.getCurrentPosition(
                    (position) => {
                        // MOCK Logic for Pilot: In production, this would be a real fetch
                        const mockWeather = {
                            temp: 24,
                            condition: 'Clear Sky',
                            icon: 'sunny',
                            campus: 'Main Tech Hub'
                        };
                        setWeather(mockWeather);
                        setLoading(false);
                    },
                    (error) => {
                        console.log('Weather fallback initiated', error);
                        setWeather({ temp: '??', condition: 'STATION_DIM', icon: 'help-circle', campus: 'NET_OFFLINE' });
                        setLoading(false);
                    },
                    { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
                );
            } catch (e) {
                console.log('Weather error', e);
                setWeather({ temp: '??', condition: 'ERR', icon: 'help-circle', campus: 'SYS_ERROR' });
                setLoading(false);
            }
        })();
    }, []);

    if (loading) return null;
    if (!weather) return null;

    return (
        <View style={[styles.container, { backgroundColor: 'rgba(15, 23, 42, 0.8)' }]}>
            <View style={styles.info}>
                <Text style={styles.campus}>{weather.campus.toUpperCase()}</Text>
                <Text style={styles.condition}>{weather.condition.toUpperCase()}</Text>
            </View>
            <View style={styles.tempBox}>
                <Ionicons name={weather.icon === 'sunny' ? 'sunny' : 'partly-sunny'} size={20} color={colors.neonBlue} />
                <Text style={styles.temp}>{weather.temp}°C</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        marginHorizontal: 24,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'space-between',
        marginBottom: 20,
        overflow: 'hidden'
    },
    info: {
        gap: 2
    },
    campus: {
        fontFamily: 'Satoshi-Black',
        fontSize: 9,
        color: colors.textDim,
        letterSpacing: 1
    },
    condition: {
        fontFamily: 'Tanker',
        fontSize: 14,
        color: '#fff',
        letterSpacing: 1
    },
    tempBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0, 242, 255, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12
    },
    temp: {
        fontFamily: 'Tanker',
        fontSize: 14,
        color: colors.neonBlue
    }
});

