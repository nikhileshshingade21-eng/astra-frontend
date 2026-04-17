import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withDelay,
    withSequence,
    withRepeat,
    interpolate,
    Easing,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

/**
 * ─────────────────────────────────────────────────────────────
 *  ASTRA Update Modal — Premium In-App Update UI
 * ─────────────────────────────────────────────────────────────
 *  A glassmorphic, animated modal that shows:
 *    • Version info + changelog
 *    • Download progress bar with percentage
 *    • Animated rocket icon
 *    • Force update support (hides 'Later' button)
 *
 *  Props:
 *    visible       — boolean to show/hide
 *    updateInfo    — { versionName, changelog, forceUpdate }
 *    downloading   — boolean download state
 *    progress      — 0–100 download progress
 *    error         — error message string
 *    onUpdate      — callback when "Update Now" is pressed
 *    onDismiss     — callback when "Later" is pressed
 *    onRetry       — callback to retry on error
 *    currentVersion — current app version string
 * ─────────────────────────────────────────────────────────────
 */

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function UpdateModal({
    visible,
    updateInfo,
    downloading,
    progress = 0,
    downloadComplete,
    installing,
    error,
    onUpdate,
    onDismiss,
    currentVersion,
}) {
    // ── Animations ───────────────────────────────────────────
    const cardScale = useSharedValue(0.85);
    const cardOpacity = useSharedValue(0);
    const rocketY = useSharedValue(0);
    const shimmer = useSharedValue(0);
    const progressWidth = useSharedValue(0);
    const glowPulse = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            // Card entrance: spring scale + fade
            cardScale.value = withSpring(1, { damping: 15, stiffness: 150 });
            cardOpacity.value = withTiming(1, { duration: 300 });

            // Rocket float animation
            rocketY.value = withRepeat(
                withSequence(
                    withTiming(-8, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
                    withTiming(8, { duration: 1200, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );

            // Shimmer effect on progress bar
            shimmer.value = withRepeat(
                withTiming(1, { duration: 1500, easing: Easing.linear }),
                -1,
                false
            );

            // Glow pulse
            glowPulse.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 1000 }),
                    withTiming(0.4, { duration: 1000 })
                ),
                -1,
                true
            );
        } else {
            cardScale.value = 0.85;
            cardOpacity.value = 0;
        }
    }, [visible]);

    // Progress bar animation
    useEffect(() => {
        progressWidth.value = withTiming(progress, {
            duration: 400,
            easing: Easing.out(Easing.cubic)
        });
    }, [progress]);

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ scale: cardScale.value }],
        opacity: cardOpacity.value,
    }));

    const rocketStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: rocketY.value }],
    }));

    const progressBarStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%`,
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: interpolate(glowPulse.value, [0.4, 1], [0.2, 0.6]),
    }));

    if (!updateInfo) return null;

    const isForce = updateInfo.forceUpdate;
    const versionLabel = updateInfo.versionName || 'New Version';
    const changelog = updateInfo.changelog || updateInfo.releaseNotes || 'Bug fixes and improvements.';

    // ── Determine UI state ───────────────────────────────────
    const getStatusContent = () => {
        if (error) {
            return {
                icon: 'alert-circle',
                iconColor: '#ff3d71',
                statusText: 'UPDATE FAILED',
                statusColor: '#ff3d71',
            };
        }
        if (installing || downloadComplete) {
            return {
                icon: 'checkmark-circle',
                iconColor: '#00ffaa',
                statusText: 'INSTALLING...',
                statusColor: '#00ffaa',
            };
        }
        if (downloading) {
            return {
                icon: 'cloud-download',
                iconColor: '#00f2ff',
                statusText: `DOWNLOADING ${Math.round(progress)}%`,
                statusColor: '#00f2ff',
            };
        }
        return {
            icon: 'rocket',
            iconColor: '#fbbb3c',
            statusText: 'UPDATE AVAILABLE',
            statusColor: '#fbbb3c',
        };
    };

    const status = getStatusContent();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={isForce ? undefined : onDismiss}
        >
            <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.7)" />
            <View style={styles.overlay}>
                {/* Ambient glow behind card */}
                <Animated.View style={[styles.ambientGlow, glowStyle]} />

                <Animated.View style={[styles.card, cardStyle]}>
                    {/* Background gradient */}
                    <LinearGradient
                        colors={['#0a0e1a', '#111827', '#0a0e1a']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />

                    {/* Decorative corner accents */}
                    <View style={[styles.cornerAccent, styles.topLeft]} />
                    <View style={[styles.cornerAccent, styles.topRight]} />
                    <View style={[styles.cornerAccent, styles.bottomLeft]} />
                    <View style={[styles.cornerAccent, styles.bottomRight]} />

                    {/* ── Header Section ────────────────────── */}
                    <View style={styles.header}>
                        {/* Animated icon */}
                        <Animated.View style={[styles.iconContainer, rocketStyle]}>
                            <LinearGradient
                                colors={[status.statusColor + '30', status.statusColor + '08']}
                                style={styles.iconGradient}
                            >
                                <Ionicons name={status.icon} size={36} color={status.statusColor} />
                            </LinearGradient>
                        </Animated.View>

                        {/* Status badge */}
                        <View style={[styles.statusBadge, { borderColor: status.statusColor + '50' }]}>
                            <View style={[styles.statusDot, { backgroundColor: status.statusColor }]} />
                            <Text style={[styles.statusText, { color: status.statusColor }]}>
                                {status.statusText}
                            </Text>
                        </View>

                        {/* Title */}
                        <Text style={styles.title}>
                            {error ? 'Update Failed' : downloading ? 'Downloading...' : 'New Update Available'}
                        </Text>

                        {/* Version info */}
                        <View style={styles.versionRow}>
                            <View style={styles.versionChip}>
                                <Text style={styles.versionLabel}>CURRENT</Text>
                                <Text style={styles.versionValue}>v{currentVersion}</Text>
                            </View>
                            <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.2)" />
                            <View style={[styles.versionChip, styles.versionChipNew]}>
                                <Text style={[styles.versionLabel, { color: '#00f2ff' }]}>NEW</Text>
                                <Text style={[styles.versionValue, { color: '#00f2ff' }]}>v{versionLabel}</Text>
                            </View>
                        </View>
                    </View>

                    {/* ── Changelog Section ─────────────────── */}
                    <View style={styles.changelogContainer}>
                        <View style={styles.changelogHeader}>
                            <Ionicons name="document-text-outline" size={14} color="rgba(255,255,255,0.4)" />
                            <Text style={styles.changelogTitle}>WHAT'S NEW</Text>
                        </View>
                        <ScrollView
                            style={styles.changelogScroll}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled
                        >
                            <Text style={styles.changelogText}>{changelog}</Text>
                        </ScrollView>
                    </View>

                    {/* ── Progress Bar (during download) ────── */}
                    {(downloading || downloadComplete) && (
                        <View style={styles.progressContainer}>
                            <View style={styles.progressTrack}>
                                <Animated.View style={[styles.progressFill, progressBarStyle]}>
                                    <LinearGradient
                                        colors={['#00f2ff', '#6366f1', '#bf00ff']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                </Animated.View>
                            </View>
                            <Text style={styles.progressText}>
                                {downloadComplete ? 'Download complete!' : `${Math.round(progress)}% downloaded`}
                            </Text>
                        </View>
                    )}

                    {/* ── Error Message ─────────────────────── */}
                    {error && (
                        <View style={styles.errorContainer}>
                            <Ionicons name="warning-outline" size={16} color="#ff3d71" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {/* ── Action Buttons ────────────────────── */}
                    <View style={styles.actions}>
                        {/* Primary: Update Now / Retry */}
                        {!downloading && !installing && (
                            <TouchableOpacity
                                style={styles.updateBtn}
                                onPress={onUpdate}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={error ? ['#ff3d71', '#ff006e'] : ['#00f2ff', '#6366f1']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.updateBtnGrad}
                                >
                                    <Ionicons
                                        name={error ? 'refresh' : 'download-outline'}
                                        size={18}
                                        color="#fff"
                                    />
                                    <Text style={styles.updateBtnText}>
                                        {error ? 'Try Again' : 'Update Now'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}

                        {/* Downloading state button */}
                        {downloading && (
                            <View style={styles.downloadingBtn}>
                                <View style={styles.downloadingContent}>
                                    <Ionicons name="cloud-download-outline" size={18} color="#00f2ff" />
                                    <Text style={styles.downloadingText}>Downloading...</Text>
                                </View>
                            </View>
                        )}

                        {/* Secondary: Later (hidden for force updates and during download) */}
                        {!isForce && !downloading && !installing && (
                            <TouchableOpacity
                                style={styles.laterBtn}
                                onPress={onDismiss}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.laterText}>Later</Text>
                            </TouchableOpacity>
                        )}

                        {/* Force update notice */}
                        {isForce && !downloading && (
                            <View style={styles.forceNotice}>
                                <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.3)" />
                                <Text style={styles.forceText}>This update is required to continue</Text>
                            </View>
                        )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

// ── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },

    ambientGlow: {
        position: 'absolute',
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: width * 0.4,
        backgroundColor: '#6366f1',
        top: '25%',
    },

    card: {
        width: '100%',
        maxWidth: 380,
        borderRadius: 32,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        elevation: 30,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.4,
        shadowRadius: 40,
    },

    // Decorative corner accents
    cornerAccent: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderColor: 'rgba(255,255,255,0.08)',
        zIndex: 2,
    },
    topLeft: { top: 12, left: 12, borderTopWidth: 1, borderLeftWidth: 1, borderTopLeftRadius: 6 },
    topRight: { top: 12, right: 12, borderTopWidth: 1, borderRightWidth: 1, borderTopRightRadius: 6 },
    bottomLeft: { bottom: 12, left: 12, borderBottomWidth: 1, borderLeftWidth: 1, borderBottomLeftRadius: 6 },
    bottomRight: { bottom: 12, right: 12, borderBottomWidth: 1, borderRightWidth: 1, borderBottomRightRadius: 6 },

    // Header
    header: {
        alignItems: 'center',
        paddingTop: 32,
        paddingHorizontal: 24,
    },

    iconContainer: {
        marginBottom: 16,
    },
    iconGradient: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },

    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 12,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontFamily: 'Satoshi-Black',
        fontSize: 9,
        letterSpacing: 2,
    },

    title: {
        fontFamily: 'Tanker',
        fontSize: 26,
        color: '#fff',
        textAlign: 'center',
        letterSpacing: 1,
        marginBottom: 16,
    },

    versionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    versionChip: {
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    versionChipNew: {
        backgroundColor: 'rgba(0, 242, 255, 0.06)',
        borderColor: 'rgba(0, 242, 255, 0.15)',
    },
    versionLabel: {
        fontFamily: 'Satoshi-Black',
        fontSize: 7,
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: 2,
        marginBottom: 2,
    },
    versionValue: {
        fontFamily: 'Tanker',
        fontSize: 18,
        color: 'rgba(255,255,255,0.6)',
    },

    // Changelog
    changelogContainer: {
        marginHorizontal: 24,
        marginBottom: 20,
        padding: 16,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    changelogHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    changelogTitle: {
        fontFamily: 'Satoshi-Black',
        fontSize: 8,
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 2,
    },
    changelogScroll: {
        maxHeight: 100,
    },
    changelogText: {
        fontFamily: 'Satoshi-Medium',
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        lineHeight: 20,
    },

    // Progress
    progressContainer: {
        marginHorizontal: 24,
        marginBottom: 20,
    },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressText: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 8,
        textAlign: 'center',
    },

    // Error
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 24,
        marginBottom: 16,
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 61, 113, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255, 61, 113, 0.2)',
    },
    errorText: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 11,
        color: '#ff3d71',
        flex: 1,
    },

    // Actions
    actions: {
        paddingHorizontal: 24,
        paddingBottom: 28,
        alignItems: 'center',
        gap: 12,
    },

    updateBtn: {
        width: '100%',
        height: 54,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
    },
    updateBtnGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    updateBtnText: {
        fontFamily: 'Tanker',
        fontSize: 18,
        color: '#fff',
        letterSpacing: 1,
    },

    downloadingBtn: {
        width: '100%',
        height: 54,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0, 242, 255, 0.2)',
        backgroundColor: 'rgba(0, 242, 255, 0.05)',
    },
    downloadingContent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    downloadingText: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 14,
        color: '#00f2ff',
    },

    laterBtn: {
        paddingVertical: 10,
    },
    laterText: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 14,
        color: 'rgba(255,255,255,0.3)',
    },

    forceNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingTop: 4,
    },
    forceText: {
        fontFamily: 'Satoshi-Medium',
        fontSize: 11,
        color: 'rgba(255,255,255,0.3)',
    },
});
