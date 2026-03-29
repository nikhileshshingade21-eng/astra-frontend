import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Image,
    Dimensions,
    LayoutAnimation,
    Platform,
    UIManager
} from 'react-native';
import * as SecureStore from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
// // import { BlurView } from '@react-native-community/blur'; // Removed for universal stability
import { authenticateWithBiometrics } from '../utils/biometrics';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import AstraLottie from '../components/AstraLottie';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getTenantConfig } from '../api/config';
import { getUniqueDeviceId } from '../utils/device';
import { fetchWithTimeout } from '../utils/api';
import RNFS from 'react-native-fs';

const { width, height } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const colors = {
    bg: '#020617',
    glass: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(255, 255, 255, 0.08)',
    textDim: 'rgba(255, 255, 255, 0.4)',
    student: '#0066ff',
    faculty: '#bf00ff',
    admin: '#ff0055',
    neonGreen: '#00ffaa',
    hot: '#ff3d71'
};

export default function AuthScreen({ route, navigation }) {
    const { role } = route.params || { role: 'student' };
    const [tenant, setTenant] = useState(null);
    const [idLabel, setIdLabel] = useState(role === 'student' ? 'STUDENT ID' : role === 'faculty' ? 'EMPLOYEE ID' : 'ADMIN ID');

    useEffect(() => {
        (async () => {
            const config = await getTenantConfig();
            if (config) setTenant(config);
        })();
    }, []);

    const roleColor = tenant?.primary_color || (role === 'admin' ? colors.admin : role === 'faculty' ? colors.faculty : colors.student);

    // Form States
    const [tab, setTab] = useState('login');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [loginId, setLoginId] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [regId, setRegId] = useState('');
    const [regName, setRegName] = useState('');
    const [programme, setProgramme] = useState('B.Tech CSC');
    const [section, setSection] = useState('CS');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [regPass, setRegPass] = useState('');
    const [faceImage, setFaceImage] = useState(null);
    const [formError, setFormError] = useState('');
    
    // Camera Logic
    const device = useCameraDevice('front');
    const { hasPermission, requestPermission } = useCameraPermission();
    const camera = React.useRef(null);

    const nextStep = () => {
        setStep(s => s + 1);
    };

    const handleInitialAuth = async () => {
        setFormError('');
        if (tab === 'login') {
            if (!loginId || !loginPass) return setFormError('ALL_FIELDS_REQUIRED');
        } else {
            if (!regId || !regName || !regPass) return setFormError('FORMS_INCOMPLETE');
        }

        if (role === 'student' && tab === 'register') {
            setLoading(true);
            try {
                const deviceId = await getUniqueDeviceId();
                const res = await fetchWithTimeout(`/api/auth/verify`, {
                    method: 'POST',
                    body: JSON.stringify({ roll_number: regId.trim(), device_id: deviceId })
                });
                if (!res.ok) {
                    setFormError(`REGISTRY_LINK_FAILED: ${res.data?.error || 'Unknown'}`);
                    setLoading(false);
                    return;
                }
            } catch (err) {
                setFormError(`NETWORK_LINK_ERROR: ${err.message}`);
                setLoading(false);
                return;
            }
        }
        setLoading(false);
        nextStep();
    };

    const runBiometric = async () => {
        const success = await authenticateWithBiometrics(
            `ASTRA_AUTH: Verify identity for ${tab === 'login' ? loginId : regId}`
        );
        if (success) {
            if (tab === 'register' && role === 'student') {
                const permission = await requestPermission();
                if (!permission) {
                    Alert.alert('CAMERA_ACCESS_REQUIRED', 'Institutional security requires camera access for biometric enrollment.');
                    return;
                }
                nextStep();
            } else {
                setStep(6); // Skip face for non-students or non-registration
            }
        }
    };

    const captureFace = async () => {
        if (camera.current) {
            try {
                const photo = await camera.current.takePhoto({
                    flash: 'off',
                    qualityPrioritization: 'quality'
                });
                // Need to convert path to base64 for API
                // For simplicity in this demo, I'll simulate or use a helper
                // In production, we'd use RNFS to read the file
                const base64 = await RNFS.readFile(photo.path, 'base64');
                setFaceImage(`data:image/jpeg;base64,${base64}`);
                nextStep();
            } catch (err) {
                Alert.alert('CAPTURE_ERROR', err.message);
            }
        }
    };


    const finishAuth = async () => {
        setLoading(true);
        try {
            const deviceId = await getUniqueDeviceId();
            let res;
            const body = tab === 'login' 
                ? { roll_number: loginId, password: loginPass, device_id: deviceId }
                : { 
                    roll_number: regId, name: regName, password: regPass, 
                    email, phone, programme, section, role, 
                    device_id: deviceId, biometric_enrolled: true,
                    face_image: faceImage // Pass the captured selfie
                };
            
            res = await fetchWithTimeout(tab === 'login' ? `/api/auth/login` : `/api/auth/register`, {
                method: 'POST',
                body: JSON.stringify(body)
            });

            if (res.ok && res.data?.token) {
                // SEC-005 FIX: Use SecureStore for sensitive tokens
                await SecureStore.setItemAsync('token', res.data.token);
                await SecureStore.setItemAsync('user', JSON.stringify(res.data.user));
                navigation.replace('Main', { user: res.data.user });
            } else {
                if (res.data?.error === 'ACCOUNT_NOT_REGISTERED') {
                    Alert.alert('REGISTRATION_REQUIRED', res.data.message);
                    setTab('register');
                } else {
                    Alert.alert('AUTH_FAILED', res.data?.error || 'Invalid credentials');
                }
                setStep(1);
            }
        } catch (e) {
            Alert.alert('LINK_FAILURE', e.message);
            setStep(1);
        } finally {
            setLoading(false);
        }
    };

    const renderStepDots = () => (
        <View style={styles.stepIndicator}>
            {[1, 2, 3, 4, 5, 6].map(s => (
                <React.Fragment key={s}>
                    <View style={[styles.stepDot, step >= s && { backgroundColor: roleColor, width: 12, height: 12 }]} />
                    {s < 6 && <View style={[styles.stepLine, step > s && { backgroundColor: roleColor }]} />}
                </React.Fragment>
            ))}
        </View>
    );

    // --- RENDER VIEWS ---

    if (step === 1) return (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.authLogoBox}>
                <Image source={require('../../assets/logo.png')} style={styles.authLogo} />
                <Text style={styles.instName}>{tenant?.institution_name || 'ASTRA_INSTITUTE'}</Text>
                <Text style={styles.authSub}>SECURE_ACCESS_ENVIRONMENT</Text>
            </View>

            {renderStepDots()}

            <View style={styles.formGlass}>
                <View style={styles.tabRow}>
                    <TouchableOpacity style={[styles.tab, tab === 'login' && styles.activeTab]} onPress={() => setTab('login')}>
                        <Text style={[styles.tabText, tab === 'login' && { color: roleColor }]}>LOGIN</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, tab === 'register' && styles.activeTab]} onPress={() => setTab('register')}>
                        <Text style={[styles.tabText, tab === 'register' && { color: roleColor }]}>REGISTER</Text>
                    </TouchableOpacity>
                </View>

                {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

                {tab === 'login' ? (
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{idLabel}</Text>
                        <TextInput style={styles.input} placeholder="e.g. 25N81..." placeholderTextColor="rgba(255,255,255,0.2)" value={loginId} onChangeText={setLoginId} />
                        <Text style={styles.inputLabel}>ACCESS_KEY</Text>
                        <TextInput style={styles.input} secureTextEntry placeholder="••••••••" placeholderTextColor="rgba(255,255,255,0.2)" value={loginPass} onChangeText={setLoginPass} />
                    </View>
                ) : (
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{idLabel}</Text>
                        <TextInput style={styles.input} value={regId} onChangeText={setRegId} />
                        <Text style={styles.inputLabel}>FULL_NAME</Text>
                        <TextInput style={styles.input} value={regName} onChangeText={setRegName} />
                        <View style={styles.gridRow}>
                            <View style={{flex: 1.5}}>
                                <Text style={styles.inputLabel}>PROG.</Text>
                                <TextInput style={styles.input} value={programme} onChangeText={setProgramme} />
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={styles.inputLabel}>SECTION</Text>
                                <TextInput 
                                    style={styles.input} 
                                    value={section} 
                                    onChangeText={setSection}
                                    autoCapitalize="characters"
                                    placeholder="e.g. S1"
                                />
                            </View>
                        </View>
                        <View style={styles.gridRow}>
                            <View style={{flex: 1}}>
                                <Text style={styles.inputLabel}>PHONE</Text>
                                <TextInput style={styles.input} keyboardType="numeric" value={phone} onChangeText={setPhone} />
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={styles.inputLabel}>EMAIL</Text>
                                <TextInput style={styles.input} keyboardType="email-address" value={email} onChangeText={setEmail} />
                            </View>
                        </View>
                        <Text style={styles.inputLabel}>CREATE_ACCESS_KEY</Text>
                        <TextInput style={styles.input} secureTextEntry value={regPass} onChangeText={setRegPass} />
                    </View>
                )}

                <TouchableOpacity style={styles.submitAction} onPress={handleInitialAuth} disabled={loading}>
                    <LinearGradient colors={[roleColor, '#000']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.submitGradient}>
                        {loading ? <AstraLottie type="loading" size={60} /> : <Text style={styles.submitText}>INITIATE PROTOCOL</Text>}
                    </LinearGradient>
                </TouchableOpacity>

                {tab === 'login' && (
                    <TouchableOpacity style={styles.ssoAction} onPress={() => Alert.alert('SSO_REDIRECT', 'Redirecting to Institutional OAuth (id.astra.edu)...')}>
                        <View style={styles.ssoGlass}>
                            <Ionicons name="shield-checkmark" size={18} color={colors.neonGreen} />
                            <Text style={styles.ssoText}>LOGIN_WITH_INSTITUTIONAL_SSO</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        </ScrollView>
    );

    if (step === 2) return (
        <View style={styles.stepScreen}>
            <LinearGradient colors={['#020617', '#1e293b']} style={StyleSheet.absoluteFill} />
            {renderStepDots()}
            <Text style={styles.stepTitle}>PROTOCOL_MAPPING: SUCCESS</Text>
            <View style={[styles.roleDisplay, { borderColor: roleColor, backgroundColor: 'rgba(15, 23, 42, 0.8)' }]}>
                <Ionicons name={role === 'admin' ? "shield-half" : role === 'faculty' ? "school" : "person"} size={64} color={roleColor} />
                <Text style={[styles.roleName, { color: roleColor }]}>{role.toUpperCase()}</Text>
                <Text style={styles.roleSub}>Institutional access clear. Handshake confirmed.</Text>
            </View>
            <TouchableOpacity style={[styles.stepBtn, { backgroundColor: roleColor }]} onPress={nextStep}>
                <Text style={styles.stepBtnText}>CONFIRM ROLE</Text>
            </TouchableOpacity>
        </View>
    );

    if (step === 3) return (
        <View style={styles.stepScreen}>
            <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />
            {renderStepDots()}
            <Text style={styles.stepTitle}>GEO_SYNC_VERIFICATION</Text>
            <View style={styles.radarHub}>
                <View style={[styles.radarRing, { width: 100, height: 100, opacity: 0.1 }]} />
                <View style={[styles.radarRing, { width: 200, height: 200, opacity: 0.05 }]} />
                <View style={[styles.radarPulse, { backgroundColor: roleColor }]} />
                <Ionicons name="location" size={42} color={roleColor} />
            </View>
            <View style={styles.gpsBox}>
                <Text style={styles.gpsVal}>LAT: 17.547 / LNG: 78.382</Text>
                <Text style={styles.gpsStatus}>AUTHORIZED_CAMPUS_ZONE</Text>
            </View>
            <TouchableOpacity style={[styles.stepBtn, { backgroundColor: roleColor }]} onPress={nextStep}>
                <Text style={styles.stepBtnText}>ESTABLISH LINK</Text>
            </TouchableOpacity>
        </View>
    );

    if (step === 4) return (
        <View style={styles.stepScreen}>
            <LinearGradient colors={['#020617', '#1e293b']} style={StyleSheet.absoluteFill} />
            {renderStepDots()}
            <Text style={styles.stepTitle}>BIOMETRIC_HANDSHAKE</Text>
            <TouchableOpacity onPress={runBiometric} style={[styles.biometricCircle, { borderColor: roleColor }]}>
                <LinearGradient colors={[roleColor + '30', 'transparent']} style={StyleSheet.absoluteFill} />
                <Ionicons name="finger-print" size={80} color={roleColor} />
            </TouchableOpacity>
            <Text style={[styles.bioStatus, { color: roleColor }]}>AWAITING_PHYSICAL_SIGNATURE</Text>
            <TouchableOpacity style={styles.skipLink} onPress={nextStep}>
                <Text style={styles.skipText}>Bypass Biometrics (Emergency)</Text>
            </TouchableOpacity>
        </View>
    );

    if (step === 5) return (
        <View style={styles.stepScreen}>
             <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />
             {renderStepDots()}
             <Text style={styles.stepTitle}>FACIAL_PROFILE_ENROLLMENT</Text>
             
             <View style={[styles.scannerWrapper, { borderColor: roleColor }]}>
                {device && hasPermission ? (
                    <Camera
                        ref={camera}
                        style={StyleSheet.absoluteFill}
                        device={device}
                        isActive={true}
                        photo={true}
                    />
                ) : (
                    <View style={styles.camPlaceholder}>
                        <Ionicons name="camera-outline" size={48} color={roleColor} />
                        <Text style={styles.camMsg}>Awaiting Camera Access...</Text>
                    </View>
                )}
                <View style={[styles.scannerCorner, styles.tl, { borderColor: roleColor }]} />
                <View style={[styles.scannerCorner, styles.tr, { borderColor: roleColor }]} />
                <View style={[styles.scannerCorner, styles.bl, { borderColor: roleColor }]} />
                <View style={[styles.scannerCorner, styles.br, { borderColor: roleColor }]} />
             </View>

             <Text style={styles.scanInstruction}>Position face clearly. Registration requires a live selfie.</Text>

             <TouchableOpacity style={[styles.stepBtn, { backgroundColor: roleColor }]} onPress={captureFace}>
                <Ionicons name="camera" size={24} color="#fff" />
                <Text style={styles.stepBtnText}>CAPTURE BIOMETRIC PROFILE</Text>
             </TouchableOpacity>
        </View>
    );

    if (step === 6) return (
        <View style={styles.stepScreen}>
            <LinearGradient colors={['#020617', '#001a1a']} style={StyleSheet.absoluteFill} />
            <Text style={[styles.verifiedTitle, { color: roleColor }]}>VERIFIED</Text>
            <Text style={styles.verifiedSub}>INSTITUTIONAL_BOND_COMPLETE</Text>
            
            <View style={styles.successList}>
                {['IDENTITY_SYNCED', 'BIOMETRIC_BOUND', 'GEO_PROXIMITY_OK', 'PROTOCOL_ESTABLISHED'].map((item, i) => (
                    <View key={i} style={styles.successItem}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.neonGreen} />
                        <Text style={styles.successText}>{item}</Text>
                    </View>
                ))}
            </View>

            <TouchableOpacity style={[styles.finishBtn, { backgroundColor: roleColor }]} onPress={finishAuth}>
                <Text style={styles.finishBtnText}>INITIALIZE DASHBOARD</Text>
            </TouchableOpacity>
        </View>
    );

    return null;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scrollContent: { paddingBottom: 60, alignItems: 'center', paddingHorizontal: 24, paddingTop: 60 },
    backBtn: { alignSelf: 'flex-start', marginBottom: 20 },
    authLogoBox: { alignItems: 'center', marginBottom: 30 },
    authLogo: { width: 140, height: 70, resizeMode: 'contain' },
    instName: { fontFamily: 'Tanker', fontSize: 18, color: '#fff', marginTop: 10, letterSpacing: 2 },
    authSub: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.textDim, letterSpacing: 3, marginTop: 5 },
    
    stepIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 30 },
    stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)' },
    stepLine: { width: 20, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
    
    formGlass: { width: '100%', padding: 24, borderRadius: 32, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(15, 23, 42, 0.8)', overflow: 'hidden' },
    tabRow: { flexDirection: 'row', gap: 12, marginBottom: 25 },
    tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)' },
    activeTab: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    tabText: { fontFamily: 'Satoshi-Black', fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },
    
    inputGroup: { gap: 15 },
    inputLabel: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, letterSpacing: 2 },
    input: { height: 50, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: '#fff', paddingHorizontal: 15, fontFamily: 'Satoshi-Bold' },
    gridRow: { flexDirection: 'row', gap: 12 },
    
    submitAction: { height: 60, borderRadius: 16, overflow: 'hidden', marginTop: 30 },
    submitGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    submitText: { fontFamily: 'Tanker', fontSize: 16, color: '#fff', letterSpacing: 1 },
    errorText: { color: colors.hot, fontFamily: 'Satoshi-Black', fontSize: 10, textAlign: 'center', marginBottom: 20 },

    ssoAction: { marginTop: 15, height: 50, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.neonGreen + '20' },
    ssoGlass: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    ssoText: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.neonGreen, letterSpacing: 1 },

    stepScreen: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 30 },
    stepTitle: { fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.textDim, letterSpacing: 4, marginBottom: 40 },
    roleDisplay: { width: '100%', padding: 40, borderRadius: 40, borderWidth: 1, alignItems: 'center', gap: 20, overflow: 'hidden' },
    roleName: { fontFamily: 'Tanker', fontSize: 42, letterSpacing: 2 },
    roleSub: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: colors.textDim, textAlign: 'center', lineHeight: 20 },
    stepBtn: { height: 60, width: '100%', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
    stepBtnText: { fontFamily: 'Tanker', fontSize: 16, color: '#fff', letterSpacing: 1 },

    radarHub: { width: 300, height: 300, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
    radarRing: { position: 'absolute', borderRadius: 200, borderWidth: 1, borderColor: '#fff' },
    radarPulse: { position: 'absolute', width: 2, height: 150, top: '50%', left: '50%', transform: [{translateX: -1}], opacity: 0.3 },
    gpsBox: { alignItems: 'center' },
    gpsVal: { fontFamily: 'Satoshi-Black', fontSize: 14, color: '#fff', letterSpacing: 1 },
    gpsStatus: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: colors.neonGreen, letterSpacing: 2, marginTop: 5 },

    biometricCircle: { width: 180, height: 180, borderRadius: 90, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 40, overflow: 'hidden' },
    bioStatus: { fontFamily: 'Tanker', fontSize: 18, letterSpacing: 2, textAlign: 'center' },
    skipLink: { marginTop: 30 },
    skipText: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: colors.textDim },

    camOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
    scannerWrapper: { width: width * 0.7, height: width * 1, justifyContent: 'center', alignItems: 'center' },
    scannerCorner: { position: 'absolute', width: 40, height: 40, borderWidth: 4 },
    tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
    meshDot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, opacity: 0.6 },
    scanFeedback: { width: '100%', alignItems: 'center', marginTop: 40 },
    scanLabel: { fontFamily: 'Satoshi-Black', fontSize: 12, letterSpacing: 2, marginBottom: 15 },
    progressTrack: { width: '60%', height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%' },

    verifiedTitle: { fontFamily: 'Tanker', fontSize: 72, letterSpacing: 4 },
    verifiedSub: { fontFamily: 'Satoshi-Black', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 4, marginBottom: 60 },
    successList: { width: '100%', gap: 15 },
    successItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
    successText: { fontFamily: 'Satoshi-Black', fontSize: 11, color: '#fff', letterSpacing: 1 },
    finishBtn: { width: '100%', height: 70, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
    finishBtnText: { fontFamily: 'Tanker', fontSize: 20, color: '#000', letterSpacing: 1 }
});

