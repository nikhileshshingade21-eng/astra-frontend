import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../api/config';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const colors = {
    bg0: '#0f172a', surf: 'rgba(255, 255, 255, 0.05)',
    hot: '#3b82f6', green: '#10b981', oran: '#ff8a1f', border: 'rgba(255, 255, 255, 0.12)'
};

export default function FeedbackScreen({ navigation }) {
    const [type, setType] = useState('bug'); // bug, feature, general
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!message.trim()) {
            Alert.alert('Empty Message', 'Please describe your feedback before submitting.');
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ type, message })
            });

            const data = await res.json();
            if (res.ok) {
                Alert.alert('Thank You!', 'Your feedback has been received. We will look into it ASAP.');
                navigation.goBack();
            } else {
                Alert.alert('Error', data.error || 'Failed to submit feedback.');
            }
        } catch (e) {
            Alert.alert('Network Error', 'Could not reach the server.');
        }
        setLoading(false);
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.title}>BETA FEEDBACK</Text>
                    <Text style={styles.subtitle}>Help us make ASTRA better for your campus.</Text>
                </LinearGradient>

                <View style={styles.form}>
                    <Text style={styles.label}>FEEDBACK TYPE</Text>
                    <View style={styles.typeRow}>
                        {['bug', 'feature', 'general'].map(t => (
                            <TouchableOpacity 
                                key={t}
                                style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                                onPress={() => setType(t)}
                            >
                                <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                                    {t.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.label, { marginTop: 24 }]}>MESSAGE</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Describe the issue or suggest a new feature..."
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        multiline
                        numberOfLines={6}
                        value={message}
                        onChangeText={setMessage}
                    />

                    <TouchableOpacity 
                        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>SUBMIT FEEDBACK</Text>}
                    </TouchableOpacity>

                    <View style={styles.infoBox}>
                        <Ionicons name="shield-checkmark-outline" size={16} color={colors.green} />
                        <Text style={styles.infoText}>Your feedback is linked to your account to help us debug issues specific to your profile.</Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg0 },
    scrollContent: { flexGrow: 1 },
    header: { padding: 24, paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    backBtn: { marginBottom: 16 },
    title: { fontFamily: 'Tanker', fontSize: 32, color: '#fff', letterSpacing: 1 },
    subtitle: { fontFamily: 'Satoshi', fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
    form: { padding: 24 },
    label: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: colors.hot, letterSpacing: 1.5, marginBottom: 12 },
    typeRow: { flexDirection: 'row', gap: 10 },
    typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.surf, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    typeBtnActive: { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: colors.hot },
    typeBtnText: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: 'rgba(255,255,255,0.4)' },
    typeBtnTextActive: { color: colors.hot },
    input: { backgroundColor: colors.surf, borderRadius: 16, padding: 16, color: '#fff', textAlignVertical: 'top', height: 150, fontFamily: 'Satoshi', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    submitBtn: { backgroundColor: colors.hot, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 24, shadowColor: colors.hot, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    submitBtnDisabled: { opacity: 0.7 },
    submitBtnText: { fontFamily: 'Tanker', fontSize: 18, color: '#fff', letterSpacing: 1 },
    infoBox: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: 16, borderRadius: 12, marginTop: 30, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.1)' },
    infoText: { flex: 1, fontFamily: 'Satoshi', fontSize: 11, color: 'rgba(16, 185, 129, 0.8)', lineHeight: 16 }
});
