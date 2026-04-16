import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import Ionicons from 'react-native-vector-icons/Ionicons';

const colors = {
    textDim: 'rgba(255, 255, 255, 0.4)',
    neonBlue: '#00f2ff',
    border: 'rgba(255, 255, 255, 0.08)',
};

// WMO Weather Interpretation Codes → readable conditions + icon
const WMO_CODES = {
    0: { condition: 'Clear Sky', icon: 'sunny' },
    1: { condition: 'Mainly Clear', icon: 'sunny' },
    2: { condition: 'Partly Cloudy', icon: 'partly-sunny' },
    3: { condition: 'Overcast', icon: 'cloudy' },
    45: { condition: 'Fog', icon: 'cloud' },
    48: { condition: 'Rime Fog', icon: 'cloud' },
    51: { condition: 'Light Drizzle', icon: 'rainy' },
    53: { condition: 'Mod. Drizzle', icon: 'rainy' },
    55: { condition: 'Dense Drizzle', icon: 'rainy' },
    61: { condition: 'Light Rain', icon: 'rainy' },
    63: { condition: 'Rain', icon: 'rainy' },
    65: { condition: 'Heavy Rain', icon: 'thunderstorm' },
    71: { condition: 'Light Snow', icon: 'snow' },
    73: { condition: 'Snow', icon: 'snow' },
    75: { condition: 'Heavy Snow', icon: 'snow' },
    80: { condition: 'Rain Showers', icon: 'rainy' },
    81: { condition: 'Mod. Showers', icon: 'rainy' },
    82: { condition: 'Heavy Showers', icon: 'thunderstorm' },
    95: { condition: 'Thunderstorm', icon: 'thunderstorm' },
    96: { condition: 'T-storm + Hail', icon: 'thunderstorm' },
    99: { condition: 'T-storm + Hail', icon: 'thunderstorm' },
};

// Default campus coordinates (Hyderabad institutional area)
const DEFAULT_LAT = 17.385;
const DEFAULT_LNG = 78.4867;

async function fetchWeatherData(lat, lng) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FKolkata`;
    const response = await fetch(url, { timeout: 8000 });
    if (!response.ok) throw new Error(`Weather API returned ${response.status}`);
    const data = await response.json();
    return data;
}

function parseWeatherResponse(data, hasRealGPS) {
    const current = data?.current;
    if (!current) return null;

    const temp = Math.round(current.temperature_2m);
    const code = current.weather_code;
    const humidity = current.relative_humidity_2m;
    const windSpeed = current.wind_speed_10m;
    const wmo = WMO_CODES[code] || { condition: 'Unknown', icon: 'partly-sunny' };

    return {
        temp,
        condition: wmo.condition,
        icon: wmo.icon,
        humidity,
        windSpeed: Math.round(windSpeed),
        campus: hasRealGPS ? 'LIVE LOCATION' : 'CAMPUS ZONE',
    };
}

export default function WeatherWidget() {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const loadWeather = async () => {
            let lat = DEFAULT_LAT;
            let lng = DEFAULT_LNG;
            let hasRealGPS = false;

            try {
                // Request location permission on Android
                if (Platform.OS === 'android') {
                    const granted = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                        { title: 'ASTRA Weather', message: 'Location needed for live weather data', buttonPositive: 'OK' }
                    );
                    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                        try {
                            const pos = await new Promise((resolve, reject) => {
                                Geolocation.getCurrentPosition(resolve, reject, {
                                    enableHighAccuracy: false,
                                    timeout: 5000,
                                    maximumAge: 600000
                                });
                            });
                            lat = pos.coords.latitude;
                            lng = pos.coords.longitude;
                            hasRealGPS = true;
                        } catch (geoErr) {
                            console.log('[WEATHER] GPS fallback to campus coords:', geoErr.message);
                        }
                    }
                } else {
                    // iOS
                    try {
                        const auth = await Geolocation.requestAuthorization('whenInUse');
                        if (auth === 'granted') {
                            const pos = await new Promise((resolve, reject) => {
                                Geolocation.getCurrentPosition(resolve, reject, {
                                    enableHighAccuracy: false,
                                    timeout: 5000,
                                    maximumAge: 600000
                                });
                            });
                            lat = pos.coords.latitude;
                            lng = pos.coords.longitude;
                            hasRealGPS = true;
                        }
                    } catch (e) {
                        console.log('[WEATHER] iOS GPS fallback:', e.message);
                    }
                }
            } catch (permErr) {
                console.log('[WEATHER] Permission error, using default coords:', permErr.message);
            }

            // Fetch real weather from Open-Meteo (free, no API key)
            try {
                const data = await fetchWeatherData(lat, lng);
                const parsed = parseWeatherResponse(data, hasRealGPS);
                if (mounted && parsed) {
                    setWeather(parsed);
                }
            } catch (apiErr) {
                console.log('[WEATHER] API fetch failed, showing fallback:', apiErr.message);
                if (mounted) {
                    setWeather({
                        temp: '--',
                        condition: 'OFFLINE',
                        icon: 'cloud-offline',
                        campus: 'WEATHER UNAVAILABLE'
                    });
                }
            }

            if (mounted) setLoading(false);
        };

        loadWeather();
        return () => { mounted = false; };
    }, []);

    if (loading) return null;
    if (!weather) return null;

    const getIconName = (iconKey) => {
        const map = {
            'sunny': 'sunny',
            'partly-sunny': 'partly-sunny',
            'cloudy': 'cloudy',
            'cloud': 'cloud',
            'rainy': 'rainy',
            'thunderstorm': 'thunderstorm',
            'snow': 'snow',
            'cloud-offline': 'cloud-offline-outline',
        };
        return map[iconKey] || 'partly-sunny';
    };

    return (
        <View style={[styles.container, { backgroundColor: 'rgba(15, 23, 42, 0.8)' }]}>
            <View style={styles.info}>
                <Text style={styles.campus}>{(weather.campus || '').toUpperCase()}</Text>
                <Text style={styles.condition}>{(weather.condition || '').toUpperCase()}</Text>
                {weather.humidity !== undefined && (
                    <Text style={styles.extra}>
                        {weather.humidity}% HUMIDITY • {weather.windSpeed} km/h WIND
                    </Text>
                )}
            </View>
            <View style={styles.tempBox}>
                <Ionicons name={getIconName(weather.icon)} size={20} color={colors.neonBlue} />
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
        gap: 2,
        flex: 1,
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
    extra: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 8,
        color: colors.textDim,
        letterSpacing: 0.5,
        marginTop: 2,
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
