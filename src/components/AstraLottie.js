import React from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

const animations = {
    loading: 'https://assets9.lottiefiles.com/packages/lf20_p8bfn5to.json', // Cyber circle loader
    success: 'https://assets9.lottiefiles.com/packages/lf20_pqnfmone.json', // Tech checkmark
    error: 'https://assets2.lottiefiles.com/packages/lf20_Tkwjw8.json',     // Warning pulse
    location: 'https://assets1.lottiefiles.com/private_files/lf30_hsabboks.json' // Satellite link
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
