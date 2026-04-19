import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TextInput, 
    TouchableOpacity, 
    Alert, 
    ActivityIndicator, 
    KeyboardAvoidingView, 
    Platform, 
    ScrollView,
    StatusBar,
    Dimensions
} from 'react-native';
import * as SecureStore from '../utils/storage';
import LinearGradient from 'react-native-linear-gradient';
// import { BlurView } from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { fetchWithTimeout } from '../utils/api';

const { width } = Dimensions.get('window');

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

export default function FeedbackScreen({ navigation }) {
    const [type, setType] = useState('bug');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!message.trim()) return Alert.alert('Empty Message', 'Please write something before sending.');
        setLoading(true);
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ type, message })
            });
            if (res.ok && res.data) {
                Alert.alert('Sent!', 'Thank you for your feedback.');
                navigation.goBack();
            } else {
                Alert.alert('Error', res.data?.error || 'Could not send your feedback.');
            }
        } catch (e) {
            Alert.alert('Connection Error', 'Could not send feedback. Please check your connection.');
        }
        setLoading(false);
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Feedback</Text>
                    <Text style={styles.sub}>Share your thoughts with us</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.fieldLab}>SELECT TYPE</Text>
                    <View style={styles.typeRow}>
                        {['bug', 'feature', 'general'].map(t => (
                            <TouchableOpacity 
                                key={t}
                                style={[styles.typeBtn, type === t && { borderColor: colors.neonPink, backgroundColor: colors.neonPink + '10' }]}
                                onPress={() => setType(t)}
                            >
                                <Text style={[styles.typeBtnText, type === t && { color: colors.neonPink }]}>{t.toUpperCase()}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.fieldLab, { marginTop: 30 }]}>YOUR MESSAGE</Text>
                    <View blurType="dark" blurAmount={10} style={styles.inputGlass}>
                        <TextInput
                            style={styles.input}
                            placeholder="Describe your feedback here..."
                            placeholderTextColor="rgba(255,255,255,0.1)"
                            multiline
                            numberOfLines={8}
                            value={message}
                            onChangeText={setMessage}
                        />
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
                        <LinearGradient colors={[colors.neonBlue, colors.neonPurple]} style={styles.submitGrad}>
                            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>SEND FEEDBACK</Text>}
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.securityHub}>
                        <Ionicons name="shield-checkmark" size={16} color={colors.neonGreen} />
                        <Text style={styles.securityText}>Your feedback is secure</Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scrollContent: { paddingBottom: 100 },
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 25 },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    title: { fontFamily: 'Tanker', fontSize: 32, color: '#fff', letterSpacing: 1 },
    sub: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.neonBlue, letterSpacing: 2, marginTop: 4 },

    form: { paddingHorizontal: 24 },
    fieldLab: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, letterSpacing: 2, marginBottom: 15 },
    typeRow: { flexDirection: 'row', gap: 10 },
    typeBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    typeBtnText: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.textDim, letterSpacing: 1 },

    inputGlass: { borderRadius: 24, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginTop: 10 },
    input: { padding: 20, color: '#fff', fontFamily: 'Satoshi-Bold', fontSize: 14, textAlignVertical: 'top', height: 200 },

    submitBtn: { height: 60, borderRadius: 20, overflow: 'hidden', marginTop: 30 },
    submitGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    submitText: { fontFamily: 'Tanker', fontSize: 18, color: '#fff', letterSpacing: 1 },

    securityHub: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 40, opacity: 0.5 },
    securityText: { fontFamily: 'Satoshi-Black', fontSize: 8, color: '#fff', letterSpacing: 1 }
});

