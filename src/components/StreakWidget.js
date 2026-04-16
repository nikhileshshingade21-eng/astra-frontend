import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';

export default function StreakWidget({ streak = 0, size = 'default' }) {
    const isHot = streak >= 7;
    const isEpic = streak >= 14;
    
    let color = Colors.primary;
    if (isEpic) color = Colors.gold;
    else if (isHot) color = Colors.hot;

    const stylesToUse = size === 'large' ? largeStyles : defaultStyles;

    return (
        <View style={[stylesToUse.container, { borderColor: color + '40', backgroundColor: color + '10' }]}>
            <Ionicons name="flame" size={stylesToUse.iconSize} color={color} />
            <View style={stylesToUse.textContainer}>
                <Text style={[stylesToUse.streakText, { color }]}>{streak} Day Streak</Text>
                {isEpic ? (
                    <Text style={stylesToUse.streakSubText}>Unstoppable!</Text>
                ) : isHot ? (
                    <Text style={stylesToUse.streakSubText}>You're on fire!</Text>
                ) : (
                    <Text style={stylesToUse.streakSubText}>Keep it up!</Text>
                )}
            </View>
        </View>
    );
}

const defaultStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
    },
    iconSize: 18,
    textContainer: {
        marginLeft: 8,
    },
    streakText: {
        fontFamily: 'Tanker',
        fontSize: 16,
        letterSpacing: 0.5,
    },
    streakSubText: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 10,
        color: Colors.textMuted,
        marginTop: 2,
    }
});

const largeStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
    },
    iconSize: 24,
    textContainer: {
        marginLeft: 12,
    },
    streakText: {
        fontFamily: 'Tanker',
        fontSize: 24,
        letterSpacing: 0.5,
    },
    streakSubText: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 12,
        color: Colors.textMuted,
        marginTop: 2,
    }
});
