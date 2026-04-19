import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    ActivityIndicator,
    Dimensions,
    Image
} from 'react-native';
import * as SecureStore from '../utils/storage';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { fetchWithTimeout } from '../utils/api';
import { API_BASE } from '../api/config';
import Colors from '../theme/colors';
import io from 'socket.io-client';

const { width } = Dimensions.get('window');

export default function MarketplaceChatScreen({ route, navigation }) {
    const { conversationId, itemTitle, itemImage, sellerName, buyerId, sellerId, user } = route.params;
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    
    const flatListRef = useRef();
    const socketRef = useRef();

    useEffect(() => {
        setupSocket();
        loadMessages();
        
        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    const setupSocket = async () => {
        const token = await SecureStore.getItemAsync('token');
        socketRef.current = io(API_BASE, {
            extraHeaders: { Authorization: `Bearer ${token}` }
        });

        socketRef.current.on('connect', () => {
            socketRef.current.emit('join_user', user.id);
        });

        socketRef.current.on('marketplace_message', (data) => {
            if (data.conversation_id == conversationId) {
                setMessages(prev => [...prev, data.message]);
            }
        });
    };

    const loadMessages = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/marketplace/chat/messages/${conversationId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok && res.data) {
                setMessages(res.data.messages || []);
            }
        } catch (e) {
            console.warn(e);
        }
        setLoading(false);
    };

    const sendMessage = async () => {
        if (!input.trim() || sending) return;
        
        const messageText = input.trim();
        setInput('');
        setSending(true);

        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/marketplace/chat/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ conversationId, message: messageText })
            });
            
            if (res.ok && res.data) {
                setMessages(prev => [...prev, res.data.message]);
            } else {
                setInput(messageText); // Restore input on failure
            }
        } catch (e) {
            setInput(messageText);
        }
        setSending(false);
    };

    const renderMessage = ({ item, index }) => {
        const isMine = item.sender_id === user.id;
        return (
            <Animated.View 
                entering={FadeInDown.delay(index * 20)}
                style={[
                    styles.messageWrapper,
                    isMine ? styles.messageWrapperMine : styles.messageWrapperTheirs
                ]}
            >
                <View style={[
                    styles.messageBubble,
                    isMine ? styles.messageMine : styles.messageTheirs
                ]}>
                    <Text style={styles.messageText}>{item.message}</Text>
                    <Text style={styles.messageTime}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </Animated.View>
        );
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
            <LinearGradient colors={Colors.gradientBg} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.itemHeaderInfo}>
                    <View style={styles.itemThumbnailContainer}>
                        {itemImage ? (
                            <Image source={{ uri: API_BASE + itemImage }} style={styles.itemThumbnail} />
                        ) : (
                            <View style={[styles.itemThumbnail, styles.placeholderThumb]}>
                                <Ionicons name="cube-outline" size={14} color={Colors.textMuted} />
                            </View>
                        )}
                    </View>
                    <View style={{ marginLeft: 12 }}>
                        <Text style={styles.itemTitle} numberOfLines={1}>{itemTitle}</Text>
                        <Text style={styles.sellerName}>{user.id === sellerId ? 'Buyer: ' + sellerName : 'Seller: ' + sellerName}</Text>
                    </View>
                </View>
            </View>

            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.listContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <View style={styles.inputArea}>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        placeholderTextColor={Colors.textMuted}
                        value={input}
                        onChangeText={setInput}
                        multiline
                    />
                </View>
                
                <TouchableOpacity 
                    style={[styles.sendBtn, !input.trim() && { opacity: 0.5 }]} 
                    onPress={sendMessage}
                    disabled={!input.trim() || sending}
                >
                    <LinearGradient colors={Colors.gradientPrimary} style={styles.sendGrad}>
                        {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.glass, justifyContent: 'center', alignItems: 'center' },
    itemHeaderInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 15 },
    itemThumbnailContainer: { width: 40, height: 40, borderRadius: 10, overflow: 'hidden', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
    itemThumbnail: { width: '100%', height: '100%' },
    placeholderThumb: { justifyContent: 'center', alignItems: 'center' },
    itemTitle: { fontFamily: 'Satoshi-Bold', fontSize: 14, color: '#fff' },
    sellerName: { fontFamily: 'Satoshi-Medium', fontSize: 11, color: Colors.textMuted },

    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 20, paddingBottom: 40 },
    
    messageWrapper: { marginBottom: 16, maxWidth: '80%' },
    messageWrapperMine: { alignSelf: 'flex-end' },
    messageWrapperTheirs: { alignSelf: 'flex-start' },
    
    messageBubble: { padding: 12, borderRadius: 18 },
    messageMine: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
    messageTheirs: { backgroundColor: Colors.bgCard, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
    
    messageText: { fontFamily: 'Satoshi-Medium', fontSize: 14, color: '#fff', lineHeight: 20 },
    messageTime: { fontFamily: 'Satoshi-Medium', fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 4, alignSelf: 'flex-end' },

    inputArea: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.border },
    inputWrapper: { flex: 1, backgroundColor: Colors.glass, borderRadius: 22, minHeight: 44, maxHeight: 100, marginRight: 10, borderWidth: 1, borderColor: Colors.borderLight, paddingHorizontal: 16, paddingVertical: 10 },
    input: { color: '#fff', fontFamily: 'Satoshi-Medium', fontSize: 14, padding: 0 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
    sendGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
