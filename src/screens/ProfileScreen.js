import React, { useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ScrollView, 
    StatusBar, 
    Dimensions,
    Platform,
    UIManager
} from 'react-native';
import * as SecureStore from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
// import { BlurView } from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming 
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const colors = {
    bg: '#020617',
    glass: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(255, 255, 255, 0.08)',
    textDim: 'rgba(255, 255, 255, 0.4)',
    neonBlue: '#00f2ff',
    neonGreen: '#00ffaa',
    neonPink: '#ff00e5',
    neonPurple: '#bf00ff',
    hot: '#ff3d71'
};

export default function ProfileScreen({ route, navigation }) {
    const { user } = route.params || { user: { role: 'student', name: 'OPERATOR' } };
    const roleColor = user.role === 'admin' ? colors.neonBlue : (user.role === 'faculty' ? colors.neonPurple : colors.neonPink);

    const pulse = useSharedValue(1);

    useEffect(() => {
        pulse.value = withRepeat(withTiming(1.1, { duration: 1500 }), -1, true);
    }, []);

    const avatarStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
        borderColor: roleColor,
    }));

    const handleLogout = async () => {
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('user');
        await AsyncStorage.removeItem('token'); // Cleanup legacy if exists
        await AsyncStorage.removeItem('user');
        navigation.reset({
            index: 0,
            routes: [{ name: 'RoleSelection' }],
        });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />
            
            {/* Ambient Background Glow */}
            <View style={[styles.ambientGlow, { backgroundColor: roleColor + '05' }]} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>IDENTITY_CORE</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.profileSection}>
                    <Animated.View style={[styles.avatarWrapper, avatarStyle]}>
                        <LinearGradient colors={[roleColor, '#000']} style={styles.avatarInner}>
                            <Text style={styles.avatarText}>{user.name[0].toUpperCase()}</Text>
                        </LinearGradient>
                    </Animated.View>
                    <Text style={[styles.name, { color: '#fff' }]}>{user.name.toUpperCase()}</Text>
                    <View style={[styles.roleLabel, { backgroundColor: roleColor + '20' }]}>
                        <Text style={[styles.roleText, { color: roleColor }]}>{user.role?.toUpperCase()}_ACCESS</Text>
                    </View>
                </View>

                <View style={styles.detailsGrid}>
                    <DETAIL_BOX label="ROLL_NUMBER" val={user.roll_number || 'N/A'} />
                    <DETAIL_BOX label="EMAIL_IDENTITY" val={user.email || 'N/A'} />
                    {user.role === 'student' && (
                        <>
                            <DETAIL_BOX label="ACADEMIC_PROG" val={user.programme || 'B.TECH'} />
                            <DETAIL_BOX label="SECTOR_NODE" val={user.section || 'CS_A'} />
                        </>
                    )}
                    <DETAIL_BOX label="CONTACT_VIA" val={user.phone || 'HIDDEN'} />
                    <DETAIL_BOX label="JOIN_TIMECODE" val={user.created_at?.split('T')[0] || '2026-03-24'} />
                </View>

                <View style={styles.actionHub}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, { borderColor: colors.neonBlue + '40' }]} 
                        onPress={() => navigation.navigate('Feedback')}
                    >
                        <View blurType="dark" blurAmount={3} style={styles.btnBlur}>
                            <Ionicons name="bug-outline" size={16} color={colors.neonBlue} />
                            <Text style={[styles.btnText, { color: colors.neonBlue }]}>REPORT_ANOMALY</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <LinearGradient colors={[colors.hot, '#000']} start={{x:0, y:0}} end={{x:2, y:2}} style={styles.logoutGrad}>
                            <Ionicons name="power" size={18} color="#000" />
                            <Text style={styles.logoutText}>TERMINATE_SESSION</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>ASTRA_OS v2.0.0_PRODUCTION_BUILD</Text>
                    <Text style={styles.footerSub}>SECURE_ENCLAVE_ACTIVE</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const DETAIL_BOX = ({ label, val }) => (
    <View blurType="dark" blurAmount={5} style={styles.detailCard}>
        <Text style={styles.detailLab}>{label}</Text>
        <Text style={styles.detailVal}>{val}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    ambientGlow: { position: 'absolute', width: width * 1.5, height: width * 1.5, top: 100, left: -width*0.25, borderRadius: width, blurRadius: 100 },
    
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 25, flexDirection: 'row', alignItems: 'center', gap: 20 },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    title: { fontFamily: 'Tanker', fontSize: 24, color: '#fff', letterSpacing: 1 },

    scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
    profileSection: { alignItems: 'center', marginVertical: 40 },
    avatarWrapper: { width: 120, height: 120, borderRadius: 40, borderWidth: 2, padding: 6, justifyContent: 'center', alignItems: 'center' },
    avatarInner: { width: '100%', height: '100%', borderRadius: 34, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontFamily: 'Tanker', fontSize: 48, color: '#000' },
    name: { fontFamily: 'Tanker', fontSize: 28, marginTop: 24, letterSpacing: 1 },
    roleLabel: { marginTop: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
    roleText: { fontFamily: 'Satoshi-Black', fontSize: 9, letterSpacing: 2 },

    detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
    detailCard: { width: (width - 60) / 2, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    detailLab: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, letterSpacing: 1, marginBottom: 6 },
    detailVal: { fontFamily: 'Satoshi-Bold', fontSize: 13, color: '#fff' },

    actionHub: { marginTop: 40, gap: 12 },
    actionBtn: { borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
    btnBlur: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
    btnText: { fontFamily: 'Satoshi-Black', fontSize: 11, letterSpacing: 2 },
    
    logoutBtn: { borderRadius: 20, overflow: 'hidden' },
    logoutGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
    logoutText: { fontFamily: 'Tanker', fontSize: 14, color: '#000', letterSpacing: 1 },

    footer: { marginTop: 60, alignItems: 'center', gap: 6, opacity: 0.3 },
    footerText: { fontFamily: 'Satoshi-Black', fontSize: 8, color: '#fff', letterSpacing: 3 },
    footerSub: { fontFamily: 'Satoshi-Bold', fontSize: 7, color: colors.neonBlue, letterSpacing: 1 }
});

