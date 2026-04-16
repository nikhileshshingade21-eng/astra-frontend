import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Modal,
    TextInput,
    Alert,
    Dimensions,
    StatusBar,
    Platform,
    UIManager,
    ScrollView,
    Image
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
// import { BlurView } from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as SecureStore from '../utils/storage';
import Animated, { 
    FadeInDown, 
    FadeInRight,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    withSequence,
    LayoutAnimation,
    interpolate
} from 'react-native-reanimated';
import { fetchWithTimeout } from '../utils/api';

const { width, height } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const colors = {
    bg: '#020617',
    glass: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(255, 255, 255, 0.08)',
    textDim: 'rgba(255, 255, 255, 0.4)',
    neonBlue: '#00f2ff',
    neonGreen: '#00ffaa',
    neonPink: '#ff00e5',
    neonPurple: '#bf00ff',
    hot: '#ff3d71',
    particle: 'rgba(0, 242, 255, 0.2)'
};

const DecodingText = ({ text, style, delay = 0 }) => {
    const [display, setDisplay] = useState('');
    useEffect(() => {
        let iterations = 0;
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
        const interval = setInterval(() => {
            setDisplay(
                text.split('').map((char, index) => {
                    if(index < iterations) return text[index];
                    return chars[Math.floor(Math.random() * chars.length)];
                }).join('')
            );
            if(iterations >= text.length) clearInterval(interval);
            iterations += 1/3;
        }, 30);
        return () => clearInterval(interval);
    }, [text]);
    return <Text style={style}>{display}</Text>;
};

const Particle = ({ delay }) => {
    const x = useSharedValue(Math.random() * width);
    const y = useSharedValue(Math.random() * height);
    const size = useSharedValue(Math.random() * 3 + 1);
    const opacity = useSharedValue(0);

    useEffect(() => {
        opacity.value = withDelay(delay, withRepeat(withTiming(0.4, { duration: 2000 }), -1, true));
        x.value = withRepeat(withTiming(x.value + (Math.random() - 0.5) * 100, { duration: 10000 }), -1, true);
        y.value = withRepeat(withTiming(y.value + (Math.random() - 0.5) * 100, { duration: 10000 }), -1, true);
    }, []);

    const style = useAnimatedStyle(() => ({
        position: 'absolute',
        left: x.value,
        top: y.value,
        width: size.value,
        height: size.value,
        borderRadius: size.value / 2,
        backgroundColor: colors.neonBlue,
        opacity: opacity.value
    }));

    return <Animated.View style={style} />;
};

export default function AnnouncementsScreen() {
    const [mode, setMode] = useState('broadcasts'); // broadcasts | activity
    const [announcements, setAnnouncements] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [userRole, setUserRole] = useState('student');
    const [selectedItem, setSelectedItem] = useState(null);

    // Form Stats
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newCategory, setNewCategory] = useState('General');
    const [newImageUrl, setNewImageUrl] = useState('');

    // HUD Animations
    const scanLine = useSharedValue(0);
    const pulse = useSharedValue(1);
    const gridShift = useSharedValue(0);

    useEffect(() => {
        fetchUserInfo();
        refreshAll();
        scanLine.value = withRepeat(withTiming(1, { duration: 3000 }), -1, false);
        pulse.value = withRepeat(withTiming(1.2, { duration: 1200 }), -1, true);
        gridShift.value = withRepeat(withTiming(1, { duration: 10000 }), -1, false);
    }, []);

    const fetchUserInfo = async () => {
        const userStr = await SecureStore.getItemAsync('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setUserRole(user.role || 'student');
        }
    };

    const refreshAll = async () => {
        setRefreshing(true);
        await Promise.all([fetchAnnouncements(), fetchNotifications()]);
        setRefreshing(false);
        setLoading(false);
    };

    const fetchAnnouncements = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/announcements`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok && res.data) {
                setAnnouncements(res.data.data || []);
            }
        } catch (e) {
            console.warn('[Announcements] Fetch error:', e.message);
        }
    };

    const fetchNotifications = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok && res.data) {
                setNotifications(res.data.notifications || []);
            }
        } catch (e) {
            console.warn('[Notifications] Fetch error:', e.message);
        }
    };

    const handleCreate = async () => {
        if (!newTitle || !newContent) return Alert.alert('Missing Info', 'Please fill in all fields.');
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/announcements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title: newTitle, content: newContent, category: newCategory, image_url: newImageUrl })
            });
            if (res.ok) {
                Alert.alert('Posted!', 'Announcement published successfully.');
                setModalVisible(false);
                setNewTitle('');
                setNewContent('');
                setNewImageUrl('');
                fetchAnnouncements();
            }
        } catch (error) {
            Alert.alert('Error', 'Could not post announcement.');
        }
    };

    const markRead = async (id) => {
        try {
            const token = await SecureStore.getItemAsync('token');
            await fetchWithTimeout(`/api/notifications/read/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
        } catch (e) {
            console.warn('[Notifications] Mark read error:', e.message);
        }
    };

    const getCatColors = (cat) => {
        switch (cat) {
            case 'Exam': return { main: colors.hot, glass: colors.hot + '15', label: 'EXAM' };
            case 'Holiday': return { main: colors.neonBlue, glass: colors.neonBlue + '15', label: 'HOLIDAY' };
            case 'Event': return { main: colors.neonPurple, glass: colors.neonPurple + '15', label: 'EVENT' };
            default: return { main: colors.neonGreen, glass: colors.neonGreen + '15', label: 'GENERAL' };
        }
    };

    const scanLineStyle = useAnimatedStyle(() => ({
        top: scanLine.value * height,
        opacity: interpolate(scanLine.value, [0, 0.5, 1], [0, 0.4, 0])
    }));

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
        opacity: 1.2 - pulse.value
    }));

    const renderBroadcast = ({ item, index }) => {
        const theme = getCatColors(item.category);
        return (
            <Animated.View entering={FadeInDown.delay(index * 100)}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setSelectedItem(item);
                }}>
                    <View blurType="dark" blurAmount={3} style={[styles.card, { borderColor: theme.main + '30' }]}>
                        <View style={styles.cardHeader}>
                            <View style={styles.headerLeft}>
                                <View style={[styles.statusRing, { borderColor: theme.main }]}>
                                    <View style={[styles.statusDot, { backgroundColor: theme.main }]} />
                                </View>
                                <View>
                                    <Text style={[styles.catLabel, { color: theme.main }]}>{theme.label}</Text>
                                    <DecodingText text={(item.title || 'Announcement').toUpperCase()} style={styles.cardTitle} />
                                </View>
                            </View>
                            <Text style={styles.dateBadge}>{new Date(item.created_at).toLocaleDateString([], { month: 'short', day: '2-digit' }).toUpperCase()}</Text>
                        </View>
                        
                        <Text style={styles.cardPreview} numberOfLines={2}>{item.content}</Text>
                        
                        {item.image_url ? (
                            <View style={styles.cardImageContainer}>
                                {item.image_url.toLowerCase().endsWith('.pdf') ? (
                                    <View style={styles.pdfPlaceholder}>
                                        <Ionicons name="document-text" size={32} color={theme.main} />
                                        <Text style={[styles.pdfText, { color: theme.main }]}>PDF Attached</Text>
                                    </View>
                                ) : (
                                    <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover" />
                                )}
                                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={StyleSheet.absoluteFill} />
                            </View>
                        ) : null}

                        <View style={styles.cardFooter}>
                            <View style={styles.authorTag}>
                                <Ionicons name="finger-print" size={10} color={colors.textDim} />
                                <Text style={styles.authorText}>{item.author?.slice(0,8) || 'Faculty'}</Text>
                            </View>
                            <View style={[styles.bracket, styles.br]} />
                        </View>
                        
                        {/* Recursive Border Accents */}
                        <View style={[styles.recursiveBorder, { borderColor: theme.main, opacity: 0.1 }]} />
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderActivity = ({ item, index }) => {
        const isRead = item.is_read === 1;
        return (
            <Animated.View entering={FadeInRight.delay(index * 50)}>
                <TouchableOpacity onPress={() => markRead(item.id)} activeOpacity={0.8}>
                    <View blurType="dark" blurAmount={3} style={[styles.activityCard, !isRead && { borderColor: colors.neonBlue + '40', backgroundColor: colors.neonBlue + '05' }]}>
                        <View style={styles.activityHeader}>
                            <View style={styles.activityIdentity}>
                                <View style={[styles.activityDot, { backgroundColor: item.type === 'success' ? colors.neonGreen : (item.type === 'warning' ? colors.hot : colors.neonBlue) }]} />
                                <Text style={styles.activityType}>{item.type?.toUpperCase() || 'SYSTEM'}</Text>
                            </View>
                            <Text style={styles.activityTime}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </View>
                        <Text style={[styles.activityTitle, !isRead && { color: '#fff' }]}>{(item.title || 'LOG_ENTRY').toUpperCase()}</Text>
                        <Text style={styles.activityMsg}>{item.message}</Text>
                        
                        {!isRead && (
                            <View style={styles.unreadGlow}>
                                <LinearGradient colors={[colors.neonBlue + '00', colors.neonBlue + '10']} start={{x:0,y:0}} end={{x:1,y:0}} style={StyleSheet.absoluteFill} />
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#080c14']} style={StyleSheet.absoluteFill} />
            
            {/* Tactical HUD Background */}
            <View style={styles.hudContainer}>
                <Animated.View style={[styles.scanLineHUD, scanLineStyle]} />
                <View style={[styles.grid, { opacity: 0.05 }]} />
                {Array(20)
                    .fill(0)
                    .map((_, i) => (
                        <Particle key={i} delay={i * 200} />
                    ))}
            </View>

            <View style={styles.header}>
                <View>
                    <View style={styles.systemStatus}>
                        <View style={styles.pulseContainer}>
                            <Animated.View style={[styles.pulseCircle, pulseStyle]} />
                            <View style={styles.pulseDot} />
                        </View>
                        <Text style={styles.statusText}>ASTRA ANNOUNCEMENTS • ONLINE</Text>
                    </View>
                    <DecodingText text="Announcements" style={styles.headerTitle} />
                </View>
                {(userRole === 'faculty' || userRole === 'admin') && (
                    <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                        <LinearGradient colors={[colors.neonBlue, colors.neonPurple]} style={styles.addBtnGrad}>
                            <Ionicons name="flash-outline" size={24} color="#000" />
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.navSection}>
                <View blurType="dark" blurAmount={3} style={styles.navBar}>
                    <TouchableOpacity 
                        style={[styles.navTab, mode === 'broadcasts' && styles.navTabActive]} 
                        onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setMode('broadcasts');
                        }}
                    >
                        <Text style={[styles.navText, mode === 'broadcasts' && { color: colors.neonBlue }]}>ANNOUNCEMENTS</Text>
                        {mode === 'broadcasts' && <Animated.View entering={FadeInRight} style={styles.navActiveLine} />}
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.navTab, mode === 'activity' && styles.navTabActive]} 
                        onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setMode('activity');
                        }}
                    >
                        <Text style={[styles.navText, mode === 'activity' && { color: colors.neonBlue }]}>NOTIFICATIONS</Text>
                        {mode === 'activity' && <Animated.View entering={FadeInRight} style={styles.navActiveLine} />}
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                key={mode}
                data={mode === 'broadcasts' ? announcements : notifications}
                renderItem={mode === 'broadcasts' ? renderBroadcast : renderActivity}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={colors.neonBlue} />}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <View style={styles.emptyCircle}>
                            <Ionicons name="radio-outline" size={40} color={colors.textDim} />
                        </View>
                        <Text style={styles.emptyText}>No Announcements Yet</Text>
                        <Text style={styles.emptySub}>Check back later for updates</Text>
                    </View>
                }
            />

            {/* Immersive Detail Display */}
            {selectedItem && (
                <Modal visible={true} transparent animationType="fade">
                    <View style={styles.detailOverlay}>
                        <View blurType="dark" blurAmount={20} style={StyleSheet.absoluteFill}>
                            <LinearGradient colors={['transparent', colors.bg]} style={StyleSheet.absoluteFill} />
                        </View>
                        <Animated.View entering={FadeInDown.springify()} style={styles.detailCard}>
                            <View style={styles.detailHeader}>
                                <TouchableOpacity onPress={() => setSelectedItem(null)} style={styles.closeDetail}>
                                    <Ionicons name="close" size={28} color="#fff" />
                                </TouchableOpacity>
                                <View style={styles.detailCat}>
                                    <Text style={[styles.detailCatText, { color: getCatColors(selectedItem.category).main }]}>{selectedItem.category.toUpperCase()}</Text>
                                </View>
                            </View>
                            
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
                                <Text style={styles.detailTitle}>{selectedItem.title.toUpperCase()}</Text>
                                <View style={styles.detailDivider} />
                                
                                {selectedItem.image_url && (
                                    <View style={styles.detailImageContainer}>
                                        <Image source={{ uri: selectedItem.image_url }} style={styles.detailImage} resizeMode="contain" />
                                    </View>
                                )}

                                <Text style={styles.detailContent}>{selectedItem.content}</Text>
                                
                                <View style={styles.detailFooter}>
                                    <View style={styles.footerItem}>
                                        <Text style={styles.footerLab}>POSTED BY</Text>
                                        <Text style={styles.footerVal}>{selectedItem.author || 'Faculty'}</Text>
                                    </View>
                                    <View style={styles.footerItem}>
                                        <Text style={styles.footerLab}>TIMESTAMP</Text>
                                        <Text style={styles.footerVal}>{new Date(selectedItem.created_at).toLocaleString()}</Text>
                                    </View>
                                </View>
                            </ScrollView>
                        </Animated.View>
                    </View>
                </Modal>
            )}

            {/* Immersive Creation Suite */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View blurType="dark" blurAmount={20} style={StyleSheet.absoluteFill} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Announcement</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLab}>TITLE</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="Enter subject identifier..."
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    value={newTitle}
                                    onChangeText={setNewTitle}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLab}>MESSAGE</Text>
                                <TextInput 
                                    style={[styles.input, styles.textArea]} 
                                    placeholder="Input message content..."
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    multiline
                                    numberOfLines={10}
                                    value={newContent}
                                    onChangeText={setNewContent}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLab}>IMAGE URL (Optional)</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="Enter image URL (CDN/Institutional Storage)..."
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    value={newImageUrl}
                                    onChangeText={setNewImageUrl}
                                />
                            </View>

                            <Text style={styles.inputLab}>CATEGORY</Text>
                            <View style={styles.catGrid}>
                                {['General', 'Exam', 'Holiday', 'Event'].map(cat => (
                                    <TouchableOpacity 
                                        key={cat} 
                                        style={[styles.catChip, newCategory === cat && { borderColor: colors.neonBlue, backgroundColor: colors.neonBlue + '20' }]}
                                        onPress={() => setNewCategory(cat)}
                                    >
                                        <Text style={[styles.catChipText, newCategory === cat && { color: colors.neonBlue }]}>{cat.toUpperCase()}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity style={styles.executeBtn} onPress={handleCreate}>
                                <LinearGradient colors={[colors.neonBlue, colors.neonPurple]} style={styles.executeGrad}>
                                    <Text style={styles.executeText}>POST ANNOUNCEMENT</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    hudContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
    scanLineHUD: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: colors.neonBlue },
    grid: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderColor: '#fff', borderStyle: 'dotted' },

    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    systemStatus: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 },
    pulseContainer: { width: 10, height: 10, justifyContent: 'center', alignItems: 'center' },
    pulseCircle: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: colors.neonGreen },
    pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.neonGreen },
    statusText: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.neonGreen, letterSpacing: 2 },
    headerTitle: { fontFamily: 'Tanker', fontSize: 34, color: '#fff', letterSpacing: 1 },
    addBtn: { width: 48, height: 48, borderRadius: 14, overflow: 'hidden' },
    addBtnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    navSection: { paddingHorizontal: 24, marginBottom: 25 },
    navBar: { flexDirection: 'row', borderRadius: 20, padding: 5, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    navTab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 15 },
    navTabActive: { backgroundColor: 'rgba(255,255,255,0.05)' },
    navText: { fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.textDim, letterSpacing: 2 },
    navActiveLine: { position: 'absolute', bottom: 0, width: 20, height: 2, backgroundColor: colors.neonBlue },

    list: { paddingHorizontal: 24, paddingBottom: 120 },
    card: { padding: 25, borderRadius: 35, borderWidth: 1, marginBottom: 20, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.01)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    statusRing: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
    statusDot: { width: 4, height: 4, borderRadius: 2 },
    catLabel: { fontFamily: 'Satoshi-Black', fontSize: 8, letterSpacing: 3, marginBottom: 2 },
    cardTitle: { fontFamily: 'Tanker', fontSize: 20, color: '#fff' },
    dateBadge: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, letterSpacing: 1 },
    cardPreview: { fontFamily: 'Satoshi-Medium', fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 22 },
    cardFooter: { marginTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    authorTag: { flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.5 },
    authorText: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim },
    bracket: { width: 10, height: 10, borderRightWidth: 1.5, borderBottomWidth: 1.5, borderColor: colors.border },
    recursiveBorder: { ...StyleSheet.absoluteFillObject, margin: 4, borderRadius: 31, borderWidth: 0.5 },

    cardImageContainer: { height: 150, borderRadius: 20, overflow: 'hidden', marginVertical: 15, borderWidth: 1, borderColor: colors.border },
    cardImage: { flex: 1 },

    detailImageContainer: { width: '100%', height: 250, borderRadius: 30, overflow: 'hidden', marginBottom: 25, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: colors.border },
    detailImage: { flex: 1 },

    activityCard: { padding: 20, borderRadius: 28, borderWidth: 1, borderColor: colors.border, marginBottom: 15, overflow: 'hidden' },
    activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    activityIdentity: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    activityDot: { width: 6, height: 6, borderRadius: 3 },
    activityType: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, letterSpacing: 2 },
    activityTime: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim },
    activityTitle: { fontFamily: 'Tanker', fontSize: 16, color: colors.textDim, marginBottom: 6 },
    activityMsg: { fontFamily: 'Satoshi-Medium', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 18 },
    unreadGlow: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },

    emptyBox: { alignItems: 'center', marginTop: 100 },
    emptyCircle: { width: 80, height: 80, borderRadius: 40, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyText: { fontFamily: 'Tanker', fontSize: 20, color: colors.textDim, letterSpacing: 2 },
    emptySub: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, marginTop: 5, letterSpacing: 1 },

    detailOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    detailCard: { width: '100%', height: '80%', backgroundColor: colors.bg, borderRadius: 45, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 30 },
    closeDetail: { width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    detailCatText: { fontFamily: 'Satoshi-Black', fontSize: 10, letterSpacing: 3 },
    detailScroll: { paddingHorizontal: 30, paddingBottom: 50 },
    detailTitle: { fontFamily: 'Tanker', fontSize: 32, color: '#fff', lineHeight: 40, marginBottom: 20 },
    detailDivider: { width: 40, height: 4, backgroundColor: colors.neonBlue, borderRadius: 2, marginBottom: 25 },
    detailContent: { fontFamily: 'Satoshi-Medium', fontSize: 16, color: 'rgba(255,255,255,0.8)', lineHeight: 28 },
    detailFooter: { marginTop: 40, paddingTop: 30, borderTopWidth: 1, borderColor: colors.border, flexDirection: 'row', gap: 30 },
    footerItem: { flex: 1 },
    footerLab: { fontFamily: 'Satoshi-Black', fontSize: 7, color: colors.textDim, letterSpacing: 1, marginBottom: 5 },
    footerVal: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: '#fff' },

    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalContent: { width: '100%', height: '92%', backgroundColor: colors.bg, borderTopLeftRadius: 50, borderTopRightRadius: 50, padding: 30, borderWidth: 1, borderColor: colors.border },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
    modalClose: { padding: 10 },
    modalTitle: { fontFamily: 'Tanker', fontSize: 28, color: '#fff', letterSpacing: 1 },
    inputGroup: { marginBottom: 30 },
    inputLab: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.textDim, letterSpacing: 3, marginBottom: 12 },
    input: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 24, color: '#fff', fontFamily: 'Satoshi-Bold', fontSize: 16, borderWidth: 1, borderColor: colors.border },
    textArea: { height: 180, textAlignVertical: 'top' },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 40 },
    catChip: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
    catChipText: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.textDim, letterSpacing: 1 },
    executeBtn: { height: 70, borderRadius: 25, overflow: 'hidden' },
    executeGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    executeText: { fontFamily: 'Tanker', fontSize: 22, color: '#000', letterSpacing: 1 }
});

