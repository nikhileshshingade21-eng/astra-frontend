import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MainScreen({ route }) {
    const { user } = route.params || {};
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Welcome to Main, {user?.name}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
    text: { color: '#fff', fontFamily: 'Tanker', fontSize: 24 }
});
