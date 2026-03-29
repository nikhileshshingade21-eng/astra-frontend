import React from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

const animations = {
    loading: 'https://assets9.lottiefiles.com/packages/lf20_p8bfn5to.json', // Cyber circle loader
    success: 'https://assets9.lottiefiles.com/packages/lf20_pqnfmone.json', // Tech checkmark
    error: 'https://assets9.lottiefiles.com/packages/lf20_ghp9v0sc.json',   // Warning pulse
    location: 'https://assets5.lottiefiles.com/packages/lf20_m6cu9zrj.json' // Satellite link
};

export default function AstraLottie({ size = 150, type = 'loading' }) {
    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <LottieView
                source={{ uri: animations[type] || animations.loading }}
                autoPlay
                loop
                style={StyleSheet.absoluteFill}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    }
});
