import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export default function MainScreen({ route }) {
    const { user } = route.params || { user: { name: 'Student' } };
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />
            <View style={styles.glass}>
                <Text style={styles.sub}>STATUS: ONLINE</Text>
                <Text style={styles.text}>Welcome back, {user?.name || 'Student'}</Text>
                <View style={styles.line} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    glass: { padding: 40, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
    sub: { fontFamily: 'Satoshi-Black', fontSize: 10, color: '#00f2ff', letterSpacing: 2, marginBottom: 15 },
    text: { color: '#fff', fontFamily: 'Tanker', fontSize: 26, letterSpacing: 1 },
    line: { width: 40, height: 2, backgroundColor: '#00f2ff', marginTop: 20 }
});
