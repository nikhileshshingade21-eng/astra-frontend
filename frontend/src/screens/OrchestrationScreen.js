import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';

const colors = {
    bg: '#020617',
    neonBlue: '#00f2ff',
};

export default function OrchestrationScreen() {
    return (
        <View style={styles.container}>
            <StatusBar hidden />
            <View style={styles.logoBox}>
                <Text style={styles.logoText}>ASTRA</Text>
                <View style={styles.line} />
                <Text style={styles.status}>INITIALIZING_ASTRA_v7.0.0_HARDENED</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoBox: {
        alignItems: 'center',
    },
    logoText: {
        fontSize: 50,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 10,
    },
    line: {
        width: 40,
        height: 2,
        backgroundColor: colors.neonBlue,
        marginVertical: 10,
    },
    status: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.4)',
        letterSpacing: 2,
    }
});
