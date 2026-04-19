import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
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

const { width } = Dimensions.get('window');

export default function MarketplaceChatsScreen({ route, navigation }) {
    const { user } = route.params || { user: { id: 0 } };
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadConversations = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/marketplace/chat/conversations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok && res.data) {
                setConversations(res.data.conversations || []);
            }
        } catch (e) {
            console.warn(e);
        }
        setLoading(false);
    };

    useEffect(() => { loadConversations(); }, []);

    const openChat = (conv) => {
        const isBuyer = conv.buyer_id === user.id;
        navigation.navigate('MarketplaceChat', {
            conversationId: conv.id,
            itemTitle: conv.item_title,
            itemImage: conv.item_image,
            sellerName: isBuyer ? conv.seller_name : conv.buyer_name,
            sellerId: conv.seller_id,
            user: user
        });
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now - d;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
        return d.toLocaleDateString();
    };

    const renderConversation = ({ item, index }) => {
        const isBuyer = item.buyer_id === user.id;
        const otherName = isBuyer ? item.seller_name : item.buyer_name;

        return (
            <Animated.View entering={FadeInDown.delay(index * 60)}>
                <TouchableOpacity style={styles.convCard} onPress={() => openChat(item)}>
                    <View style={styles.convImageContainer}>
                        {item.item_image ? (
                            <Image source={{ uri: API_BASE + item.item_image }} style={styles.convImage} />
                        ) : (
                            <View style={[styles.convImage, styles.convImagePlaceholder]}>
                                <Ionicons name="cube-outline" size={20} color={Colors.textMuted} />
                            </View>
                        )}
                    </View>
                    <View style={styles.convInfo}>
                        <Text style={styles.convItemTitle} numberOfLines={1}>{item.item_title}</Text>
                        <Text style={styles.convOtherName}>{isBuyer ? 'Seller' : 'Buyer'}: {otherName}</Text>
                        {item.last_message && (
                            <Text style={styles.convLastMsg} numberOfLines={1}>{item.last_message}</Text>
                        )}
                    </View>
                    <View style={styles.convMeta}>
                        <Text style={styles.convTime}>{formatTime(item.last_message_time)}</Text>
                        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
            <LinearGradient colors={Colors.gradientBg} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={{ marginLeft: 16 }}>
                    <Text style={styles.title}>My Chats</Text>
                    <Text style={styles.sub}>Marketplace Conversations</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderConversation}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="chatbubbles-outline" size={48} color={Colors.textMuted} />
                            <Text style={styles.emptyText}>No conversations yet</Text>
                            <Text style={styles.emptySub}>Chat with sellers from the Marketplace</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15, flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.glass, justifyContent: 'center', alignItems: 'center' },
    title: { fontFamily: 'Tanker', fontSize: 24, color: '#fff', letterSpacing: 0.5 },
    sub: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: Colors.textMuted },

    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 20, paddingBottom: 100 },

    convCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.bgCard,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    convImageContainer: { width: 50, height: 50, borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.glass },
    convImage: { width: '100%', height: '100%' },
    convImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
    convInfo: { flex: 1, marginLeft: 14, gap: 2 },
    convItemTitle: { fontFamily: 'Satoshi-Black', fontSize: 14, color: '#fff' },
    convOtherName: { fontFamily: 'Satoshi-Medium', fontSize: 11, color: Colors.textMuted },
    convLastMsg: { fontFamily: 'Satoshi-Medium', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    convMeta: { alignItems: 'flex-end', gap: 6 },
    convTime: { fontFamily: 'Satoshi-Medium', fontSize: 10, color: Colors.textMuted },

    emptyState: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontFamily: 'Tanker', fontSize: 20, color: Colors.textMuted, marginTop: 16 },
    emptySub: { fontFamily: 'Satoshi-Medium', fontSize: 13, color: Colors.textDisabled, marginTop: 4 },
});
