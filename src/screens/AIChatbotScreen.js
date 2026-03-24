import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { API_BASE } from '../api/config';

const colors = {
    bg0: '#0f172a', surf: 'rgba(255, 255, 255, 0.05)',
    hot: '#3b82f6', green: '#10b981', cyan: '#0ea5e9', purp: '#6366f1', border: 'rgba(255, 255, 255, 0.12)'
};

export default function AIChatbotScreen({ route, navigation }) {
    const { user } = route.params || {};

    const [messages, setMessages] = useState([
        { id: 1, text: `Hello ${user.name || 'User'}! I'm your ASTRA V3 Assistant. How can I help you with your academic schedule, subjects, or institutional policies today?`, isBot: true, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [aiStatus, setAiStatus] = useState(''); // New status for CoT reasoning
    
    const scrollRef = useRef();

    const sendMessage = async (customMessage = null) => {
        const textToSend = customMessage || input.trim();
        if (!textToSend) return;
        
        const userMsg = {
            id: Date.now(),
            text: textToSend,
            isBot: false,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        };
        
        setMessages(prev => [...prev, userMsg]);
        if (!customMessage) setInput('');
        setIsTyping(true);
        setAiStatus('Reasoning...');

        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ message: userMsg.text })
            });
            
            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    text: data.response || "I encountered an anomaly processing that query.",
                    isBot: true,
                    time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                }]);
            } else {
                setMessages(prev => [...prev, { id: Date.now() + 1, text: "Connection to language core failed.", isBot: true, time: "System" }]);
            }
        } catch (e) {
            console.log('Detailed Chat Error:', e.message, e);
            setMessages(prev => [...prev, { id: Date.now() + 1, text: `Network intercept failed: ${e.message}`, isBot: true, time: "Error" }]);
        }
        setIsTyping(false);
        setAiStatus('');
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
                copyToCacheDirectory: true
            });
            
            if (!result.canceled) {
                const file = result.assets[0];
                uploadFile(file);
            }
        } catch (err) {
            console.log('Picker Error:', err);
        }
    };

    const uploadFile = async (file) => {
        setIsTyping(true);
        setAiStatus('Parsing Document...');
        
        try {
            const token = await AsyncStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', {
                uri: file.uri,
                name: file.name,
                type: file.mimeType || 'application/octet-stream'
            });

            const res = await fetch(`${API_BASE}/api/ai/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, {
                    id: Date.now(),
                    text: `📎 File Ingested: ${file.name}\n\n${data.message}`,
                    isBot: true,
                    time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                }]);
                // Automatically ask the AI to summarize it
                setTimeout(() => sendMessage(`Can you summarize the document I just uploaded?`), 1000);
            } else {
                alert("Failed to ingest document into AI Memory.");
            }
        } catch (e) {
            console.log('Upload err:', e);
            alert("Network error during file upload.");
        }
        setIsTyping(false);
        setAiStatus('');
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Ionicons name="hardware-chip" size={32} color={colors.cyan} />
                    <View style={{ marginLeft: 12 }}>
                        <Text style={styles.title}>ASTRA INTELLIGENCE</Text>
                        <View style={styles.liveIndicator}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>NEURAL NET ACTIVE</Text>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView 
                style={styles.chatArea} 
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                ref={scrollRef}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.map(msg => (
                    <View key={msg.id} style={[styles.messageWrapper, msg.isBot ? styles.msgWrapperBot : styles.msgWrapperUser]}>
                        {msg.isBot && <Ionicons name="planet" size={16} color={colors.cyan} style={styles.botAvatar} />}
                        
                        <View style={[styles.messageBubble, msg.isBot ? styles.msgBot : styles.msgUser]}>
                            <Text style={styles.messageText}>{msg.text}</Text>
                            <Text style={styles.messageTime}>{msg.time}</Text>
                        </View>
                    </View>
                ))}
                
                {isTyping && (
                    <View style={[styles.messageWrapper, styles.msgWrapperBot]}>
                        <Ionicons name="planet" size={16} color={colors.cyan} style={styles.botAvatar} />
                        <View style={[styles.messageBubble, styles.msgBot, { paddingVertical: 15, paddingHorizontal: 20 }]}>
                            <View style={styles.typingRow}>
                                <ActivityIndicator size="small" color={colors.cyan} />
                                {aiStatus ? <Text style={styles.aiStatusText}>{aiStatus.toUpperCase()}</Text> : null}
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            <View style={styles.inputArea}>
                <TouchableOpacity style={styles.attachBtn} onPress={pickDocument}>
                    <Ionicons name="add-circle-outline" size={24} color={colors.cyan} />
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    placeholder="Ask ASTRA (Upload PDFs/Notes)..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={input}
                    onChangeText={setInput}
                    onSubmitEditing={() => sendMessage()}
                    returnKeyType="send"
                />
                <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage()}>
                    <LinearGradient colors={[colors.cyan, colors.purp]} style={StyleSheet.absoluteFill} />
                    <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg0 },
    header: { padding: 24, paddingTop: 60, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: 'rgba(0,0,0,0.3)' },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    title: { fontFamily: 'Tanker', fontSize: 24, color: '#fff', letterSpacing: 1 },
    
    liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cyan, shadowColor: colors.cyan, shadowOpacity: 1, shadowRadius: 5 },
    liveText: { fontFamily: 'Satoshi-Bold', fontSize: 9, color: colors.cyan, letterSpacing: 1 },

    chatArea: { flex: 1 },
    messageWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16, maxWidth: '85%' },
    msgWrapperBot: { alignSelf: 'flex-start' },
    msgWrapperUser: { alignSelf: 'flex-end' },
    botAvatar: { marginRight: 8, marginBottom: 8 },
    
    messageBubble: { padding: 14, borderRadius: 20 },
    msgBot: { backgroundColor: colors.surf, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
    msgUser: { backgroundColor: colors.cyan + '30', borderBottomRightRadius: 4, borderWidth: 1, borderColor: colors.cyan + '80' },
    
    messageText: { fontFamily: 'Satoshi', fontSize: 15, color: '#fff', lineHeight: 22 },
    messageTime: { fontFamily: 'Satoshi-Bold', fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 8, textAlign: 'right', letterSpacing: 1 },

    inputArea: { flexDirection: 'row', padding: 20, paddingBottom: 30, backgroundColor: 'rgba(0,0,0,0.5)', borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' },
    attachBtn: { marginRight: 15 },
    input: { flex: 1, height: 50, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 25, paddingHorizontal: 20, color: '#fff', fontFamily: 'Satoshi', fontSize: 16, borderWidth: 1, borderColor: colors.border },
    sendBtn: { width: 50, height: 50, borderRadius: 25, marginLeft: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    
    typingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    aiStatusText: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: colors.cyan, letterSpacing: 1 }
});
