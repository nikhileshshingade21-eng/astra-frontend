import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    ActivityIndicator,
    Dimensions
} from 'react-native';
import * as SecureStore from '../utils/storage';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DocumentPicker from 'react-native-document-picker';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming, 
    FadeInDown,
    FadeInUp
} from 'react-native-reanimated';
import { fetchWithTimeout } from '../utils/api';
import Colors from '../theme/colors';
import TypingIndicator from '../components/TypingIndicator';

const { width } = Dimensions.get('window');

const SUGGESTIONS = [
    "What classes do I have today?",
    "Am I safe in attendance?",
    "Show my weekly summary",
    "Predict my grade"
];

export default function AIChatbotScreen({ route, navigation }) {
    const { user } = route.params || { user: { name: 'Student' } };
    const [messages, setMessages] = useState([
        { 
            id: 1, 
            text: `Hi ${user.name?.split(' ')[0] || ''}! I'm ASTRA AI. Ask me about your schedule, attendance, or upload notes for me to summarize.`, 
            isBot: true, 
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [aiStatus, setAiStatus] = useState('');
    
    const scrollRef = useRef();
    const corePulse = useSharedValue(1);

    useEffect(() => {
        corePulse.value = withRepeat(withTiming(1.1, { duration: 1000 }), -1, true);
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
        setAiStatus('Thinking...');

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
                    text: res.data.response || "Sorry, I couldn't process that request.",
                    isBot: true,
                    time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                }]);
            } else {
                setMessages(prev => [...prev, { id: Date.now() + 1, text: res.data?.error || "Connection error. Please try again.", isBot: true, time: "SYS" }]);
            }
        } catch (e) {
            setMessages(prev => [...prev, { id: Date.now() + 1, text: "Network error occurred.", isBot: true, time: "ERR" }]);
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
        setAiStatus('Reading document...');
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
            
            if (res.ok && res.data) {
                setMessages(prev => [...prev, {
                    id: Date.now(),
                    text: `📎 Uploaded: ${file.name}\n\n${res.data.message || 'File processed successfully.'}`,
                    isBot: true,
                    time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                }]);
                setTimeout(() => sendMessage(`Please summarize the document: ${file.name}`), 1000);
            }
        } catch (e) {
            setMessages(prev => [...prev, { id: Date.now() + 1, text: "Failed to upload document.", isBot: true, time: "ERR" }]);
        }
        setIsTyping(false);
        setAiStatus('');
    };

    const coreStyle = useAnimatedStyle(() => ({
        transform: [{ scale: corePulse.value }],
        opacity: isTyping ? 1 : 0.4
    }));

    // Suggestion chips at the bottom
    const renderSuggestions = () => {
        if (messages.length > 1) return null; // Only show initially
        
        return (
            <Animated.View entering={FadeInUp.delay(500)} style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>Suggested queries</Text>
                <View style={styles.chipsWrapper}>
                    {SUGGESTIONS.map((s, i) => (
                        <TouchableOpacity 
                            key={i} 
                            style={styles.chip}
                            onPress={() => sendMessage(s)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.chipText}>{s}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </Animated.View>
        );
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
            <LinearGradient colors={Colors.gradientBg} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.title}>ASTRA AI</Text>
                    <Text style={styles.subTitle}>Academic Assistant</Text>
                </View>
                <Animated.View style={[styles.aiCoreIndicator, coreStyle]}>
                    <View style={styles.aiCoreInner} />
                </Animated.View>
            </View>

            <ScrollView 
                ref={scrollRef}
                style={styles.chatArea}
                contentContainerStyle={styles.chatContent}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                showsVerticalScrollIndicator={false}
            >
                {messages.map((msg, index) => (
                    <Animated.View 
                        key={msg.id} 
                        entering={FadeInDown.springify().damping(15).stiffness(150)}
                        style={[
                            styles.messageWrapper,
                            msg.isBot ? styles.messageWrapperBot : styles.messageWrapperUser
                        ]}
                    >
                        {msg.isBot && (
                            <View style={styles.botAvatar}>
                                <Ionicons name="sparkles" size={14} color="#fff" />
                            </View>
                        )}
                        <View style={[
                            styles.messageBubble,
                            msg.isBot ? styles.messageBot : styles.messageUser,
                            { borderRadius: 16 } // Explicitly 16px as requested
                        ]}>
                            <Text style={styles.messageText}>{msg.text}</Text>
                        </View>
                    </Animated.View>
                ))}
                
                {renderSuggestions()}

                {isTyping && (
                    <View style={styles.typingWrapper}>
                        <View style={styles.botAvatarSmall}>
                            <Ionicons name="sparkles" size={10} color="#fff" />
                        </View>
                        <View style={styles.typingIndicator}>
                            <TypingIndicator />
                            <Text style={styles.typingText}>{aiStatus || 'Thinking...'}</Text>
                        </View>
                    </View>
                )}
            </ScrollView>

            <View style={styles.inputArea}>
                <TouchableOpacity style={styles.attachBtn} onPress={pickDocument}>
                    <Ionicons name="document-attach-outline" size={24} color={Colors.textMuted} />
                </TouchableOpacity>
                
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.input}
                        placeholder="Ask ASTRA..."
                        placeholderTextColor={Colors.textMuted}
                        value={input}
                        onChangeText={setInput}
                        multiline
                    />
                </View>
                
                <TouchableOpacity 
                    style={[styles.sendBtn, !input.trim() && { opacity: 0.5 }]} 
                    onPress={() => sendMessage()}
                    disabled={!input.trim()}
                >
                    <LinearGradient colors={Colors.gradientPrimary} style={styles.sendGrad}>
                        <Ionicons name="send" size={18} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.glass, justifyContent: 'center', alignItems: 'center' },
    headerTitleContainer: { flex: 1, marginLeft: 16 },
    title: { fontFamily: 'Tanker', fontSize: 24, color: '#fff', letterSpacing: 0.5 },
    subTitle: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: Colors.textMuted },
    aiCoreIndicator: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.accentGlass, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.accent },
    aiCoreInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },

    chatArea: { flex: 1 },
    chatContent: { padding: 24, paddingBottom: 40 },
    
    messageWrapper: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-end', maxWidth: '85%' },
    messageWrapperBot: { alignSelf: 'flex-start' },
    messageWrapperUser: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
    
    botAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 4 },
    
    messageBubble: { padding: 14, borderRadius: 20 },
    messageBot: { backgroundColor: Colors.bgCard, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
    messageUser: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
    
    messageText: { fontFamily: 'Satoshi-Medium', fontSize: 14, color: '#fff', lineHeight: 22 },
    
    suggestionsContainer: { marginTop: 10, marginBottom: 20 },
    suggestionsTitle: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: Colors.textMuted, marginBottom: 12, marginLeft: 4 },
    chipsWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { backgroundColor: Colors.primaryGlass, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: Colors.primary + '50' },
    chipText: { fontFamily: 'Satoshi-Bold', fontSize: 13, color: Colors.primaryLight },

    typingWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
    botAvatarSmall: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 6, marginBottom: 4 },
    typingIndicator: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 4, 
        alignSelf: 'flex-start', 
        paddingRight: 15, 
        backgroundColor: Colors.bgCard, 
        borderRadius: 16, 
        borderBottomLeftRadius: 4, 
        borderWidth: 1, 
        borderColor: Colors.border,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4
    },
    typingText: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: Colors.textMuted, marginLeft: -4 },

    inputArea: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 20, paddingVertical: 15, paddingBottom: Platform.OS === 'ios' ? 30 : 20, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.border },
    attachBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    inputWrapper: { flex: 1, backgroundColor: Colors.glass, borderRadius: 22, minHeight: 44, maxHeight: 100, marginHorizontal: 8, borderWidth: 1, borderColor: Colors.borderLight, paddingHorizontal: 16, paddingVertical: 12 },
    input: { color: '#fff', fontFamily: 'Satoshi-Medium', fontSize: 14, padding: 0 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
    sendGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
