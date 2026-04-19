import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Dimensions,
    StatusBar,
    Platform,
    UIManager
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as SecureStore from '../utils/storage';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { fetchWithTimeout } from '../utils/api';
import Colors from '../theme/colors';

const { width, height } = Dimensions.get('window');

export default function NotificationCenterScreen({ navigation }) {
    const [notifications, setNotifications] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadNotifications = useCallback(async () => {
        setRefreshing(true);
        try {
            const token = await SecureStore.getItemAsync('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            // Fetch concurrently from both endpoints
            const [notifRes, annRes] = await Promise.all([
                fetchWithTimeout(`/api/notifications`, { headers }),
                fetchWithTimeout(`/api/announcements`, { headers })
            ]);

            let combinedLogs = [];

            if (notifRes.ok && notifRes.data && notifRes.data.notifications) {
                const notifs = notifRes.data.notifications.map(n => ({
                    id: `n_${n.id}`,
                    realId: n.id,
                    is_notification: true,
                    type: n.type || 'smart_alert',
                    title: n.title,
                    message: n.message,
                    time: n.created_at || n.time,
                    isRead: n.is_read
                }));
                combinedLogs = [...combinedLogs, ...notifs];
            }

            if (annRes.ok && annRes.data && annRes.data.announcements) {
                const anns = annRes.data.announcements.map(a => ({
                    id: `a_${a.id}`,
                    is_notification: false,
                    type: 'announcement',
                    title: a.title,
                    message: a.content || a.message,
                    time: a.created_at || a.time,
                    isRead: true // Announcements are typically broadcasted, so map to read
                }));
                combinedLogs = [...combinedLogs, ...anns];
            }

            // Sort by most recent
            combinedLogs.sort((a, b) => new Date(b.time) - new Date(a.time));
            
            // Format time dynamically for display
            const formatRelativeTime = (isoString) => {
                if (!isoString) return 'Recently';
                const diffMin = Math.round((new Date() - new Date(isoString)) / 60000);
                if (diffMin < 60) return `${diffMin || 1} min ago`;
                if (diffMin < 1440) return `${Math.floor(diffMin / 60)} hours ago`;
                return `${Math.floor(diffMin / 1440)} days ago`;
            };

            setNotifications(combinedLogs.map(log => ({ ...log, timeDisplay: formatRelativeTime(log.time) })));
        } catch (e) {
            console.warn('[NotificationCenter] Error fetching:', e);
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadNotifications(); }, [loadNotifications]);

    const markAsRead = async (id, isNotification, realId) => {
        // Optimistic UI update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        
        // Push state to backend if it's an actionable notification
        if (isNotification) {
            try {
                const token = await SecureStore.getItemAsync('token');
                await fetchWithTimeout(`/api/notifications/read/${realId}`, { 
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (e) {
                console.warn('[NotificationCenter] Failed to mark read:', e);
            }
        }
    };

    const getIconForType = (type) => {
        switch (type) {
            case 'smart_alert': return { name: 'warning', color: Colors.warning };
            case 'achievement': return { name: 'trophy', color: Colors.gold };
            case 'announcement': return { name: 'megaphone', color: Colors.primary };
            default: return { name: 'information-circle', color: Colors.textSecondary };
        }
    };

    const renderNotification = ({ item, index }) => {
        const iconData = getIconForType(item.type);
        
        return (
            <Animated.View entering={FadeInDown.delay(index * 50)}>
                <TouchableOpacity 
                    style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
                    onPress={() => !item.isRead && markAsRead(item.id, item.is_notification, item.realId)}
                    activeOpacity={0.8}
                >
                    {!item.isRead && <View style={styles.unreadDot} />}
                    
                    <View style={[styles.iconContainer, { backgroundColor: iconData.color + '20' }]}>
                        <Ionicons name={iconData.name} size={20} color={iconData.color} />
                    </View>
                    
                    <View style={styles.contentContainer}>
                        <View style={styles.cardHeader}>
                            <Text style={[styles.cardTitle, !item.isRead && { color: '#fff' }]}>{item.title}</Text>
                            <Text style={styles.timeText}>{item.timeDisplay || item.time}</Text>
                        </View>
                        <Text style={styles.cardMessage}>{item.message}</Text>
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
                <Text style={styles.title}>Notifications</Text>
            </View>

            <FlatList
                data={notifications}
                keyExtractor={item => item.id}
                renderItem={renderNotification}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={loadNotifications} tintColor={Colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="notifications-off-outline" size={48} color={Colors.textDisabled} />
                        <Text style={styles.emptyText}>All caught up!</Text>
                        <Text style={styles.emptySub}>No new notifications right now.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', gap: 16 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.glass, justifyContent: 'center', alignItems: 'center' },
    title: { fontFamily: 'Tanker', fontSize: 28, color: '#fff' },

    listContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 50 },

    notificationCard: { flexDirection: 'row', backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
    unreadCard: { backgroundColor: Colors.primaryGlass, borderColor: Colors.primary + '50' },
    
    unreadDot: { position: 'absolute', top: 16, right: 16, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
    
    iconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    
    contentContainer: { flex: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
    cardTitle: { fontWeight: 'bold', fontSize: 14, color: Colors.textSecondary, flex: 1, marginRight: 12 },
    timeText: { fontFamily: 'Satoshi-Medium', fontSize: 10, color: Colors.textMuted },
    cardMessage: { fontFamily: 'Satoshi-Medium', fontSize: 12, color: Colors.textPrimary, lineHeight: 18 },

    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: height * 0.2 },
    emptyText: { fontFamily: 'Satoshi-Bold', fontSize: 16, color: Colors.textSecondary, marginTop: 16 },
    emptySub: { fontFamily: 'Satoshi-Medium', fontSize: 13, color: Colors.textMuted, marginTop: 8 }
});
