import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Dimensions,
    Image,
    LayoutAnimation,
    Platform,
    UIManager
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const colors = {
    bg: '#020617',
    student: '#00f2ff',
    faculty: '#bf00ff',
    admin: '#ff0055',
    glass: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(255, 255, 255, 0.08)'
};

const roles = [
    {
        id: 'student',
        title: 'STUDENT_CORE',
        icon: 'person-outline',
        color: colors.student,
        desc: 'Access attendance, grades, and AI insights.',
        accent: '#0066ff'
    },
    {
        id: 'faculty',
        title: 'FACULTY_HUB',
        icon: 'easel-outline',
        color: colors.faculty,
        desc: 'Monitor live sessions and verify presence.',
        accent: '#8a00ff'
    },
    {
        id: 'admin',
        title: 'ADMIN_ROOT',
        icon: 'shield-half-outline',
        color: colors.admin,
        desc: 'Global system control and campus analytics.',
        accent: '#ff0000'
    }
];

export default function RoleSelectionScreen({ navigation }) {
    const handleRoleSelect = (role) => {
        navigation.navigate('Auth', { role });
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#020617', '#0f172a', '#1e1b4b']} style={StyleSheet.absoluteFill} />
            
            {/* Background Glows */}
            <View style={[styles.glow, { top: -100, left: -100, backgroundColor: colors.student + '20' }]} />
            <View style={[styles.glow, { bottom: -100, right: -100, backgroundColor: colors.faculty + '10' }]} />

            <View style={styles.content}>
                <View style={styles.header}>
                    <Image source={require('../../assets/logo.png')} style={styles.logo} />
                    <View style={styles.divider} />
                    <Text style={styles.tagline}>CHOOSE YOUR ACCESS PROTOCOL</Text>
                </View>

                <View style={styles.grid}>
                    {roles.map((role) => (
                        <TouchableOpacity
                            key={role.id}
                            style={styles.cardWrapper}
                            onPress={() => handleRoleSelect(role.id)}
                            activeOpacity={0.9}
                        >
                            <View style={[styles.roleCard, { borderColor: role.color + '30' }]}>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.iconBox, { backgroundColor: role.color + '15' }]}>
                                        <Ionicons name={role.icon} size={24} color={role.color} />
                                    </View>
                                    <View style={[styles.statusPill, { borderColor: role.color + '40' }]}>
                                        <View style={[styles.statusDot, { backgroundColor: role.color }]} />
                                        <Text style={[styles.statusText, { color: role.color }]}>READY</Text>
                                    </View>
                                </View>
                                <Text style={[styles.roleTitle, { color: role.color }]}>{role.title}</Text>
                                <Text style={styles.roleDesc}>{role.desc}</Text>
                                <View style={styles.cardFooter}>
                                    <Text style={styles.footerText}>INITIATE_LINK</Text>
                                    <Ionicons name="chevron-forward" size={12} color={role.color} />
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.bottomInfo}>
                    <Text style={styles.versionText}>ASTRA_OS V2.0.0 — SECURE_ENVIRONMENT</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.5, blurRadius: 100 },
    content: { flex: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40, justifyContent: 'space-between' },
    header: { alignItems: 'center' },
    logo: { width: 120, height: 60, resizeMode: 'contain' },
    divider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 15 },
    tagline: { fontFamily: 'Satoshi-Black', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 4 },
    
    grid: { gap: 16 },
    cardWrapper: { borderRadius: 24, overflow: 'hidden' },
    roleCard: { padding: 24, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.01)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontFamily: 'Satoshi-Black', fontSize: 8, letterSpacing: 1 },
    
    roleTitle: { fontFamily: 'Tanker', fontSize: 28, letterSpacing: 1, marginBottom: 8 },
    roleDesc: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 18, marginBottom: 20 },
    
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.6 },
    footerText: { fontFamily: 'Satoshi-Black', fontSize: 9, color: '#fff', letterSpacing: 2 },
    
    bottomInfo: { alignItems: 'center' },
    versionText: { fontFamily: 'Satoshi-Black', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }
});
