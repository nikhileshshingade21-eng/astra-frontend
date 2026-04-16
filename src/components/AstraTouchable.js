import React from 'react';
import { TouchableOpacity, Vibration, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  runOnJS 
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/**
 * AstraTouchable: Premium Button Wrapper
 * Adds 0.95x scale down on press and smooth bounce back.
 * Triggers subtle haptic feedback (Vibration fallback).
 */
export default function AstraTouchable({ 
  children, 
  onPress, 
  style, 
  activeOpacity = 0.8,
  haptic = true,
  ...props 
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
    if (haptic) {
      Vibration.vibrate(10); // Subtle tick
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <AnimatedTouchable
      activeOpacity={activeOpacity}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[style, animatedStyle]}
      {...props}
    >
      {children}
    </AnimatedTouchable>
  );
}
