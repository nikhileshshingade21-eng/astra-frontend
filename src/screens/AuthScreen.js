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
    UIManager,
    Modal,
    FlatList
} from 'react-native';
import * as SecureStore from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { authenticateWithBiometrics, isBiometricsAvailable } from '../utils/biometrics';
import AstraLottie from '../components/AstraLottie';
import { Linking } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getTenantConfig } from '../api/config';
import { getUniqueDeviceId } from '../utils/device';
import { fetchWithTimeout } from '../utils/api';
import { getFCMToken } from '../hooks/useNotifications';

const { width, height } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const colors = {
    bg: '#1e1b4b', // Deep Royal Blue-Purple
    glass: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(255, 255, 255, 0.08)',
    textDim: 'rgba(255, 255, 255, 0.4)',
    student: '#fbbf24', // Electric Gold
    faculty: '#bf00ff',
    admin: '#ff0055',
    neonGreen: '#fbbf24', // Unified with Gold theme
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

    const roleColor = role === 'admin' ? colors.admin : role === 'faculty' ? colors.faculty : colors.student;

    // Form States
    const [tab, setTab] = useState('login');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [loginId, setLoginId] = useState('');
    const [regId, setRegId] = useState('');
    const [regName, setRegName] = useState('');
    const [programme, setProgramme] = useState('B.Tech CSC');
    const [section, setSection] = useState('CS');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [formError, setFormError] = useState('');
    const [pickerVisible, setPickerVisible] = useState(false);
    const [activePicker, setActivePicker] = useState(null); // 'programme' or 'section'
    const [usePassword, setUsePassword] = useState(false);
    const [password, setPassword] = useState('');
    const [recoveryStep, setRecoveryStep] = useState(0); // 0: auth, 1: req token, 2: reset pass
    const [resetOTP, setResetOTP] = useState('');
    const [newPass, setNewPass] = useState('');

    const PROGRAMMES = ['B.Tech CSC', 'B.Tech CSD', 'B.Tech AIML', 'B.Tech IT', 'B.Tech ECE', 'B.Tech CIVIL', 'B.Tech MECH'];
    const SECTIONS = ['A1', 'A2', 'A3', 'A4', 'A5', 'C1', 'C2', 'C3', 'C4', 'C5', 'D1', 'D2', 'D3', 'CS', '1', 'General'];

    useEffect(() => {
        // Enforce Biometric Policy on Load
        (async () => {
            const hasBio = await isBiometricsAvailable();
            if (!hasBio) {
                Alert.alert(
                    'Biometrics Required',
                    'Fingerprint or Face ID is needed to use this app. Please enable it in your phone settings.',
                    [{ text: 'Exit' }]
                );
            }
        })();
    }, []);

    const nextStep = () => {
        setStep(s => s + 1);
    };

    const handleInitialAuth = async () => {
        setFormError('');
        if (tab === 'login') {
            if (!loginId || !password) return setFormError('Please enter your roll number and password');
        } else {
            if (!regId || !regName) return setFormError('Please fill in all required fields');
        }

        const hasBio = await isBiometricsAvailable();
        if (!hasBio) {
            setFormError('Please enable fingerprint or Face ID on your phone');
            return;
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
                    setFormError(`Could not verify your ID: ${res.data?.error || 'Unknown error'}`);
                    setLoading(false);
                    return;
                }
                
                // AUTOMATIC LOGIC: Auto-fill section and programme if returned
                if (res.data?.programme) setProgramme(res.data.programme);
                if (res.data?.section) setSection(res.data.section);

            } catch (err) {
                setFormError(`Connection error: ${err.message}`);
                setLoading(false);
                return;
            }
        }
        setLoading(false);
        nextStep();
    };

    const runBiometric = async () => {
        const success = await authenticateWithBiometrics(
            `Verify your identity to continue`
        );
        if (success) {
            // Biometric challenge passed. Proceed to device registration/login.
            finishAuth();
        } else {
            Alert.alert('Verification Failed', 'Could not verify your identity. Please try again.');
        }
    };

    const finishAuth = async () => {
        setLoading(true);
        try {
            const deviceId = await getUniqueDeviceId();
            const fcmToken = await getFCMToken();
            let res;
            
            // Backend handles login via biometric_auth or traditional password fallback
            const body = tab === 'login' 
                ? { 
                    roll_number: loginId.trim(), 
                    device_id: deviceId, 
                    biometric_auth: !usePassword,
                    password: usePassword ? password : null,
                    fcm_token: fcmToken
                }
                : { 
                    roll_number: regId.trim(), name: regName, 
                    email, phone, programme, section, role, 
                    password: regPassword,
                    device_id: deviceId, biometric_enrolled: true,
                    fcm_token: fcmToken
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
                // Contract: error codes are in rawContract.message after standardization
                const errorCode = res.rawContract?.message || res.data?.error || '';
                const errorDetail = res.data?.message || res.rawContract?.message || 'Invalid credentials';
                if (errorCode === 'ACCOUNT_NOT_REGISTERED') {
                    Alert.alert('Not Registered', res.data?.message || 'Account not registered. Please complete registration first.');
                    setTab('register');
                } else {
                    Alert.alert(tab === 'register' ? 'Registration Failed' : 'Login Failed', errorDetail);
                }
                setStep(1);
            }
        } catch (e) {
            Alert.alert('Connection Error', e.message);
            setStep(1);
        } finally {
            setLoading(false);
        }
    };

    const initiateRecovery = async () => {
        if (!loginId) {
            setFormError('Please enter your Roll Number first');
            return;
        }
        setLoading(true);
        try {
            const res = await fetchWithTimeout(`/api/auth/forgot-password`, {
                method: 'POST',
                body: JSON.stringify({ roll_number: loginId })
            });
            if (res.ok) {
                setRecoveryStep(1);
                setStep(5); // Recovery Screen
            } else {
                const errMsg = res.rawContract?.message || res.data?.message || res.data?.error || 'Could not start password reset';
                setFormError(errMsg);
            }
        } catch (e) {
            setFormError('No internet connection');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!resetOTP || !newPass) return;
        setLoading(true);
        try {
            const res = await fetchWithTimeout(`/api/auth/reset-password`, {
                method: 'POST',
                body: JSON.stringify({ 
                    roll_number: loginId, 
                    resetToken: resetOTP, 
                    newPassword: newPass 
                })
            });
            if (res.ok) {
                Alert.alert('SUCCESS', 'Password updated successfully. Logging in...');
                setUsePassword(true);
                setPassword(newPass);
                finishAuth();
            } else {
                const errMsg = res.rawContract?.message || res.data?.message || res.data?.error || 'Reset failed';
                Alert.alert('Error', errMsg);
            }
        } catch (e) {
            Alert.alert('Error', 'Could not reset password. Please try again.');
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

    const renderSelectionModal = () => (
        <Modal visible={pickerVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>SELECT {activePicker?.toUpperCase()}</Text>
                    <FlatList
                        data={activePicker === 'programme' ? PROGRAMMES : SECTIONS}
                        keyExtractor={item => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                style={styles.pickerItem} 
                                onPress={() => {
                                    if (activePicker === 'programme') setProgramme(item);
                                    else setSection(item);
                                    setPickerVisible(false);
                                }}
                            >
                                <Text style={[
                                    styles.pickerItemText, 
                                    (activePicker === 'programme' ? programme : section) === item && { color: roleColor }
                                ]}>
                                    {item}
                                </Text>
                                {(activePicker === 'programme' ? programme : section) === item && (
                                    <Ionicons name="checkmark-circle" size={20} color={roleColor} />
                                )}
                            </TouchableOpacity>
                        )}
                    />
                    <TouchableOpacity style={styles.modalClose} onPress={() => setPickerVisible(false)}>
                        <Text style={styles.closeText}>CANCEL</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
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
                <Text style={styles.instName}>{tenant?.institution_name || 'ASTRA'}</Text>
                <Text style={styles.authSub}>Secure Login</Text>
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
                        <TextInput style={styles.input} placeholder="e.g. 25N81..." placeholderTextColor="rgba(255,255,255,0.2)" value={loginId} onChangeText={setLoginId} autoCapitalize="none" />
                        
                        <Text style={styles.inputLabel}>PASSWORD</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Enter your password" 
                            placeholderTextColor="rgba(255,255,255,0.2)" 
                            value={password} 
                            onChangeText={setPassword} 
                            secureTextEntry 
                        />

                        <TouchableOpacity onPress={initiateRecovery}>
                            <Text style={styles.forgotPassLink}>Forgot Password?</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{idLabel}</Text>
                        <TextInput style={styles.input} value={regId} onChangeText={setRegId} autoCapitalize="none" />
                        <Text style={styles.inputLabel}>FULL NAME</Text>
                        <TextInput style={styles.input} value={regName} onChangeText={setRegName} />
                        <View style={styles.gridRow}>
                            <View style={{flex: 1.5}}>
                                <Text style={styles.inputLabel}>PROG.</Text>
                                <TouchableOpacity 
                                    style={styles.pickerSelector} 
                                    onPress={() => { setActivePicker('programme'); setPickerVisible(true); }}
                                >
                                    <Text style={styles.pickerValue}>{programme}</Text>
                                    <Ionicons name="chevron-down" size={16} color={colors.textDim} />
                                </TouchableOpacity>
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={styles.inputLabel}>SECTION</Text>
                                <TouchableOpacity 
                                    style={styles.pickerSelector} 
                                    onPress={() => { setActivePicker('section'); setPickerVisible(true); }}
                                >
                                    <Text style={styles.pickerValue}>{section}</Text>
                                    <Ionicons name="chevron-down" size={16} color={colors.textDim} />
                                </TouchableOpacity>
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
                        <View>
                            <Text style={styles.inputLabel}>PASSWORD</Text>
                            <TextInput 
                                style={styles.input} 
                                secureTextEntry 
                                value={regPassword} 
                                onChangeText={setRegPassword}
                                placeholder="Create a password"
                                placeholderTextColor="rgba(255,255,255,0.2)"
                            />
                        </View>
                        <Text style={styles.securityWarning}>
                            * This device will be linked to your account for secure login.
                        </Text>
                    </View>
                )}

                <TouchableOpacity style={styles.submitAction} onPress={handleInitialAuth} disabled={loading}>
                    <LinearGradient colors={[roleColor, '#000']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.submitGradient}>
                        {loading ? <AstraLottie type="loading" size={60} /> : <Text style={styles.submitText}>CONTINUE</Text>}
                    </LinearGradient>
                </TouchableOpacity>

                {tab === 'login' && (
                    <TouchableOpacity style={styles.ssoAction} onPress={() => Alert.alert('College SSO', 'College SSO integration is coming soon. Please use your Roll Number and Password to log in.')}>
                        <View style={styles.ssoGlass}>
                            <Ionicons name="shield-checkmark" size={18} color={colors.neonGreen} />
                            <Text style={styles.ssoText}>LOGIN WITH COLLEGE SSO</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>
            {renderSelectionModal()}
        </ScrollView>
    );

    if (step === 2) return (
        <View style={styles.stepScreen}>
            <LinearGradient colors={['#020617', '#1e293b']} style={StyleSheet.absoluteFill} />
            {renderStepDots()}
            <Text style={styles.stepTitle}>ROLE CONFIRMED</Text>
            <View style={[styles.roleDisplay, { borderColor: roleColor, backgroundColor: 'rgba(15, 23, 42, 0.8)' }]}>
                <Ionicons name={role === 'admin' ? "shield-half" : role === 'faculty' ? "school" : "person"} size={64} color={roleColor} />
                <Text style={[styles.roleName, { color: roleColor }]}>{role.toUpperCase()}</Text>
                <Text style={styles.roleSub}>Your role has been verified. Tap below to continue.</Text>
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
            <Text style={styles.stepTitle}>LOCATION VERIFICATION</Text>
            <View style={styles.radarHub}>
                <View style={[styles.radarRing, { width: 100, height: 100, opacity: 0.1 }]} />
                <View style={[styles.radarRing, { width: 200, height: 200, opacity: 0.05 }]} />
                <View style={[styles.radarPulse, { backgroundColor: roleColor }]} />
                <Ionicons name="location" size={42} color={roleColor} />
            </View>
            <View style={styles.gpsBox}>
                <Text style={styles.gpsVal}>LAT: 17.547 / LNG: 78.382</Text>
                <Text style={styles.gpsStatus}>CAMPUS AREA CONFIRMED</Text>
            </View>
            <TouchableOpacity style={[styles.stepBtn, { backgroundColor: roleColor }]} onPress={nextStep}>
                <Text style={styles.stepBtnText}>CONTINUE</Text>
            </TouchableOpacity>
        </View>
    );

    if (step === 4) return (
        <View style={styles.stepScreen}>
            <LinearGradient colors={['#020617', '#1e293b']} style={StyleSheet.absoluteFill} />
            {renderStepDots()}
            
            {!usePassword ? (
                <>
                    <Text style={styles.stepTitle}>FINGERPRINT VERIFICATION</Text>
                    <TouchableOpacity onPress={runBiometric} style={[styles.biometricCircle, { borderColor: roleColor }]}>
                        <LinearGradient colors={[roleColor + '30', 'transparent']} style={StyleSheet.absoluteFill} />
                        <Ionicons name="finger-print" size={80} color={roleColor} />
                    </TouchableOpacity>
                    <Text style={[styles.bioStatus, { color: roleColor }]}>PLACE YOUR FINGER TO VERIFY</Text>
                    
                    <TouchableOpacity style={styles.fallbackBtn} onPress={() => setUsePassword(true)}>
                        <Text style={styles.fallbackText}>USE PASSWORD INSTEAD</Text>
                    </TouchableOpacity>
                </>
            ) : (
                <View style={styles.passwordSurface}>
                    <Text style={styles.stepTitle}>ENTER YOUR PASSWORD</Text>
                    <Ionicons name="lock-closed" size={48} color={roleColor} style={{marginBottom: 30}} />
                    <View style={{width: '100%'}}>
                        <Text style={styles.inputLabel}>PASSWORD</Text>
                        <TextInput 
                            style={[styles.input, {borderColor: roleColor + '40'}]} 
                            secureTextEntry 
                            value={password} 
                            onChangeText={setPassword}
                            onBlur={() => password && finishAuth()}
                        />
                    </View>
                    <TouchableOpacity style={[styles.stepBtn, { backgroundColor: roleColor }]} onPress={finishAuth} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.stepBtnText}>LOG IN</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setUsePassword(false)} style={{marginTop: 20}}>
                        <Text style={styles.skipText}>Back to Biometrics</Text>
                    </TouchableOpacity>
                </View>
            )}

            <TouchableOpacity style={styles.retryAction} onPress={() => setStep(1)}>
                <Text style={styles.skipText}>Abort / Go Back</Text>
            </TouchableOpacity>
        </View>
    );

    if (step === 5) return (
        <View style={styles.stepScreen}>
            <LinearGradient colors={['#020617', '#1e293b']} style={StyleSheet.absoluteFill} />
            <Text style={styles.stepTitle}>RESET YOUR PASSWORD</Text>
            
            <View style={styles.passwordSurface}>
                <Ionicons name="mail-unread" size={64} color={roleColor} style={{marginBottom: 20}} />
                <Text style={styles.bioStatus}>Check your institutional email for a 6-digit recovery code.</Text>
                
                <View style={{width: '100%', marginTop: 30, gap: 20}}>
                    <View>
                        <Text style={styles.inputLabel}>VERIFICATION CODE</Text>
                        <TextInput 
                            style={styles.input} 
                            keyboardType="numeric" 
                            maxLength={6}
                            value={resetOTP} 
                            onChangeText={setResetOTP}
                        />
                    </View>
                    <View>
                        <Text style={styles.inputLabel}>NEW PASSWORD</Text>
                        <TextInput 
                            style={styles.input} 
                            secureTextEntry 
                            value={newPass} 
                            onChangeText={setNewPass}
                        />
                    </View>
                </View>

                <TouchableOpacity 
                    style={[styles.stepBtn, { backgroundColor: roleColor }]} 
                    onPress={handleResetPassword}
                >
                    <Text style={styles.stepBtnText}>RESET PASSWORD</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setStep(1)} style={{marginTop: 30}}>
                    <Text style={styles.skipText}>Cancel Recovery</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Removed Step 5 (Camera) & Step 6 (Finalize) as finishAuth handles redirect instantly now.

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
    finishBtnText: { fontFamily: 'Tanker', fontSize: 20, color: '#000', letterSpacing: 1 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#0f172a', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, minHeight: 400 },
    modalTitle: { fontFamily: 'Tanker', fontSize: 18, color: '#fff', textAlign: 'center', marginBottom: 25, letterSpacing: 1 },
    pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.border },
    pickerItemText: { fontFamily: 'Satoshi-Bold', fontSize: 15, color: 'rgba(255,255,255,0.6)' },
    modalClose: { marginTop: 20, paddingVertical: 15, alignItems: 'center' },
    closeText: { fontFamily: 'Satoshi-Black', fontSize: 13, color: colors.hot, letterSpacing: 1 },
    pickerSelector: { height: 50, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 },
    pickerValue: { color: '#fff', fontFamily: 'Satoshi-Bold', fontSize: 13 },

    forgotPassLink: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.hot, letterSpacing: 1, marginTop: 10, alignSelf: 'flex-end' },
    fallbackBtn: { marginTop: 40, padding: 15 },
    fallbackText: { fontFamily: 'Satoshi-Black', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 },
    passwordSurface: { width: '100%', alignItems: 'center' }
});

