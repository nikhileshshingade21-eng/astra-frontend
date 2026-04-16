import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Colors from '../theme/colors';

export default function SkeletonLoader({ width, height, borderRadius = 8, style }) {
    const animatedValue = new Animated.Value(0);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true
                })
            ])
        ).start();
    }, []);

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7]
    });

    return (
        <Animated.View 
            style={[{ 
                width, 
                height, 
                borderRadius, 
                backgroundColor: Colors.border, 
                opacity 
            }, style]} 
        />
    );
}

export const DashboardSkeleton = () => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SkeletonLoader width={150} height={32} borderRadius={16} />
                <SkeletonLoader width={80} height={32} borderRadius={16} />
            </View>
            <View style={styles.statsRow}>
                <SkeletonLoader width="30%" height={80} borderRadius={16} />
                <SkeletonLoader width="30%" height={80} borderRadius={16} />
                <SkeletonLoader width="30%" height={80} borderRadius={16} />
            </View>
            <SkeletonLoader width="100%" height={150} borderRadius={24} style={styles.card} />
            <SkeletonLoader width="100%" height={200} borderRadius={24} style={styles.card} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { padding: 24, gap: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    card: { marginTop: 10 }
});
