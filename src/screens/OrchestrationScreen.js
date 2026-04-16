import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, Image } from 'react-native';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    Easing,
    FadeIn
} from 'react-native-reanimated';

const colors = {
    bg: '#1e1b4b', // Updated to Royal Purple
};

export default function OrchestrationScreen() {
    const scale = useSharedValue(0.8);
    const opacity = useSharedValue(0);

    useEffect(() => {
        scale.value = withTiming(1, {
            duration: 800,
            easing: Easing.out(Easing.back(1.5)),
        });
        opacity.value = withTiming(1, {
            duration: 600,
            easing: Easing.inOut(Easing.ease),
        });
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return (
        <View style={styles.container}>
            <StatusBar hidden />
            <Animated.View style={[styles.logoContainer, animatedStyle]}>
                <Image 
                    source={require('../../assets/star_logo.png')} 
                    style={styles.logo}
                    resizeMode="contain"
                />
            </Animated.View>
            <Animated.View entering={FadeIn.delay(1000)} style={styles.footer}>
                <View style={styles.line} />
                <Animated.Text style={styles.status}>INITIALIZING_ASTRA_PROTOCOL</Animated.Text>
            </Animated.View>
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
    logoContainer: {
        width: 180,
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 40,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.2)', // Gold glow
    },
    logo: {
        width: 120,
        height: 120,
    },
    footer: {
        position: 'absolute',
        bottom: 60,
        alignItems: 'center',
    },
    line: {
        width: 40,
        height: 2,
        backgroundColor: '#fbbf24', // Gold
        marginBottom: 10,
    },
    status: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'rgba(251, 191, 36, 0.6)', // Dim gold
        letterSpacing: 3,
    }
});
