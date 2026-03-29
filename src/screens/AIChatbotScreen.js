import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    Dimensions
} from 'react-native';
import * as SecureStore from '../utils/storage';
import LinearGradient from 'react-native-linear-gradient';
// import { BlurView } from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DocumentPicker from 'react-native-document-picker';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming, 
    withSequence 
} from 'react-native-reanimated';
import { API_BASE } from '../api/config';
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

export default function AIChatbotScreen({ route, navigation }) {
    const { user } = route.params || { user: { name: 'OPERATOR' } };
    const [messages, setMessages] = useState([
        { id: 1, text: `GREETINGS ${user.name?.toUpperCase()}. ASTRA_NEURAL_CORE V2.0 ONLINE. PROTOCOL: ACADEMIC_SYNTHESIS. STATUS: READY.`, isBot: true, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [aiStatus, setAiStatus] = useState('');
    
    const scrollRef = useRef();
    const corePulse = useSharedValue(1);

    useEffect(() => {
        corePulse.value = withRepeat(withTiming(1.2, { duration: 1000 }), -1, true);
    }, []);

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
        setAiStatus('REASONING');

        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ message: userMsg.text })
            });
            
            if (res.ok && res.data) {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    text: res.data.response || "NEURAL_INTERCEPT_ANOMALY: DATA_VOID.",
                    isBot: true,
                    time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                }]);
            } else {
                setMessages(prev => [...prev, { id: Date.now() + 1, text: res.data?.error || "CORE_LINK_FAILURE: RETRY_HANDSHAKE.", isBot: true, time: "SYS" }]);
            }
        } catch (e) {
            setMessages(prev => [...prev, { id: Date.now() + 1, text: "NETWORK_ISOLATION_DETECTED.", isBot: true, time: "ERR" }]);
        }
        setIsTyping(false);
        setAiStatus('');
    };

    const pickDocument = async () => {
        try {
            const res = await DocumentPicker.pick({
                type: [DocumentPicker.types.pdf, DocumentPicker.types.docx, DocumentPicker.types.plainText],
            });
            uploadFile(res[0]);
        } catch (err) {
            if (DocumentPicker.isCancel(err)) {
                // User cancelled the picker
            } else {
                console.error(err);
            }
        }
    };

    const uploadFile = async (file) => {
        setIsTyping(true);
        setAiStatus('PARSING_DATA');
        try {
            const token = await SecureStore.getItemAsync('token');
            const formData = new FormData();
            formData.append('file', { uri: file.uri, name: file.name, type: file.type || 'application/octet-stream' });
            const res = await fetchWithTimeout(`/api/ai/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
                isMultipart: true
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, {
                    id: Date.now(),
                    text: `📎 INGESTED: ${file.name}\n\n${data.message}`,
                    isBot: true,
                    time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                }]);
                setTimeout(() => sendMessage(`SYNTHESIZE_DOC: ${file.name}`), 1000);
            }
        } catch (e) {}
        setIsTyping(false);
        setAiStatus('');
    };

    const coreStyle = useAnimatedStyle(() => ({
        transform: [{ scale: corePulse.value }],
        opacity: isTyping ? 1 : 0.6
    }));

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>NEURAL_CORE</Text>
                    <View style={styles.statusRow}>
                        <Animated.View style={[styles.statusDot, { backgroundColor: colors.neonBlue }, coreStyle]} />
                        <Text style={styles.statusText}>{isTyping ? aiStatus : 'SYSTEM_IDLE'}</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.actionBtn}>
                    <Ionicons name="ellipsis-horizontal" size={20} color={colors.textDim} />
                </TouchableOpacity>
            </View>

            <ScrollView 
                style={styles.chatArea} 
                contentContainerStyle={styles.chatContent}
                ref={scrollRef}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                showsVerticalScrollIndicator={false}
            >
                {messages.map(msg => (
                    <View key={msg.id} style={[styles.msgWrapper, msg.isBot ? styles.msgBot : styles.msgUser]}>
                        <View blurType="dark" blurAmount={msg.isBot ? 5 : 2} style={[styles.bubble, msg.isBot ? styles.bubbleBot : styles.bubbleUser]}>
                            <Text style={styles.msgText}>{msg.text}</Text>
                            <Text style={styles.msgTime}>{msg.time.toUpperCase()}</Text>
                        </View>
                        {msg.isBot && <View style={[styles.botAccent, { backgroundColor: colors.neonBlue }]} />}
                    </View>
                ))}
                {isTyping && (
                    <View style={[styles.msgWrapper, styles.msgBot]}>
                        <View blurType="dark" blurAmount={3} style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
                            <ActivityIndicator size="small" color={colors.neonBlue} style={{ marginRight: 10 }} />
                            <Text style={styles.typingText}>NEURAL_PROCESSING...</Text>
                        </View>
                    </View>
                )}
            </ScrollView>

            <View blurType="dark" blurAmount={15} style={styles.inputArea}>
                <TouchableOpacity style={styles.attachBtn} onPress={pickDocument}>
                    <Ionicons name="add" size={24} color={colors.neonBlue} />
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    placeholder="QUERY_CORE_IDENTITY..."
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={input}
                    onChangeText={setInput}
                    onSubmitEditing={() => sendMessage()}
                    returnKeyType="send"
                />
                <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage()}>
                    <LinearGradient colors={[colors.neonBlue, colors.neonPurple]} style={StyleSheet.absoluteFill} />
                    <Ionicons name="flash" size={18} color="#000" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    headerInfo: { flex: 1 },
    title: { fontFamily: 'Tanker', fontSize: 24, color: '#fff', letterSpacing: 1 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.neonBlue, letterSpacing: 2 },
    actionBtn: { padding: 8 },

    chatArea: { flex: 1 },
    chatContent: { padding: 24, paddingBottom: 40 },
    msgWrapper: { marginBottom: 20, maxWidth: '85%' },
    msgBot: { alignSelf: 'flex-start' },
    msgUser: { alignSelf: 'flex-end' },
    bubble: { padding: 16, borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
    bubbleBot: { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: colors.border, borderBottomLeftRadius: 4 },
    bubbleUser: { backgroundColor: 'rgba(0, 242, 255, 0.05)', borderColor: colors.neonBlue + '30', borderBottomRightRadius: 4 },
    msgText: { fontFamily: 'Satoshi-Medium', fontSize: 14, color: '#fff', lineHeight: 22 },
    msgTime: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, marginTop: 10, letterSpacing: 1 },
    botAccent: { position: 'absolute', left: -2, top: '20%', bottom: '20%', width: 2, borderRadius: 2 },

    typingBubble: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    typingText: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.neonBlue, letterSpacing: 1 },

    inputArea: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 15, paddingBottom: Platform.OS === 'ios' ? 40 : 20, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
    attachBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    input: { flex: 1, height: 48, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, paddingHorizontal: 20, color: '#fff', fontFamily: 'Satoshi-Bold', fontSize: 14, borderWidth: 1, borderColor: colors.border },
    sendBtn: { width: 48, height: 48, borderRadius: 24, marginLeft: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }
});

