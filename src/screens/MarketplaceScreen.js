import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TextInput, 
    TouchableOpacity, 
    ActivityIndicator, 
    Alert, 
    RefreshControl,
    StatusBar,
    Dimensions,
    Platform,
    UIManager
} from 'react-native';
import * as SecureStore from '../utils/storage';
import LinearGradient from 'react-native-linear-gradient';
// import { BlurView } from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown, LayoutAnimation } from 'react-native-reanimated';
import { fetchWithTimeout } from '../utils/api';

const { width } = Dimensions.get('window');

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
    hot: '#ff3d71'
};

export default function MarketplaceScreen({ route, navigation }) {
    const { user } = route.params || { user: { id: 0 } };
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [price, setPrice] = useState('');

    const loadItems = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/marketplace/items`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok && res.data) {
                setItems(res.data.items || []);
            } else {
                console.warn('[Marketplace] Load items failed:', res.data?.error || res.status);
            }
        } catch (e) {}
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => { loadItems(); }, []);

    const handleAddItem = async () => {
        if (!title || !price) return Alert.alert('DATA_VOID', 'Title and Price required.');
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/marketplace/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title, description: desc, price: parseFloat(price) })
            });
            if (res.ok && res.data) {
                Alert.alert('LISTED', 'Item broadcast to campus node.');
                setIsAdding(false); setTitle(''); setDesc(''); setPrice('');
                loadItems();
            } else {
                Alert.alert('LIST_FAILED', res.data?.error || 'Could not post item.');
            }
        } catch (e) {}
    };

    const handleDelete = async (id) => {
        Alert.alert("PURGE", "Permanently remove this listing?", [
            { text: "ABORT", style: "cancel" },
            { text: "PURGE", style: "destructive", onPress: async () => {
                try {
                    const token = await SecureStore.getItemAsync('token');
                    const res = await fetchWithTimeout(`/api/marketplace/items/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) loadItems();
                } catch (e) {}
            }}
        ]);
    };

    const renderItem = ({ item, index }) => (
        <Animated.View entering={FadeInDown.delay(index * 100)}>
            <View blurType="dark" blurAmount={3} style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.itemTitle}>{(item.title || 'UNTITLED').toUpperCase()}</Text>
                    <Text style={styles.itemPrice}>₹{item.price || 0}</Text>
                </View>
                <Text style={styles.itemDesc}>{item.description}</Text>
                <View style={styles.cardFooter}>
                    <View style={styles.meta}>
                        <Ionicons name="person-outline" size={10} color={colors.textDim} />
                        <Text style={styles.metaText}>ID_{item.seller_id || 'UNKNOWN'}</Text>
                    </View>
                    {item.seller_id === user.id ? (
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                            <Ionicons name="trash-outline" size={16} color={colors.hot} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.contactBtn}>
                            <Text style={styles.contactText}>SECURE_CONTACT</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>CAMPUS_EXCHANGE</Text>
                    <Text style={styles.sub}>P2P_TRADING_NODE_v2.0</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => { setIsAdding(!isAdding); }}>
                    <LinearGradient colors={[colors.neonBlue, colors.neonPurple]} style={styles.addBtnGrad}>
                        <Ionicons name={isAdding ? "close" : "add"} size={24} color="#000" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {isAdding && (
                <View style={styles.form}>
                    <View blurType="dark" blurAmount={10} style={styles.formGlass}>
                        <Text style={styles.formLab}>INITIALIZE_LISTING</Text>
                        <TextInput style={styles.input} placeholder="ITEM_TITLE..." placeholderTextColor="rgba(255,255,255,0.1)" value={title} onChangeText={setTitle} />
                        <TextInput style={styles.input} placeholder="PRICE_VAL..." placeholderTextColor="rgba(255,255,255,0.1)" keyboardType="numeric" value={price} onChangeText={setPrice} />
                        <TextInput style={[styles.input, { height: 80 }]} placeholder="DETAILED_LOG..." placeholderTextColor="rgba(255,255,255,0.1)" multiline value={desc} onChangeText={setDesc} />
                        <TouchableOpacity style={styles.deployBtn} onPress={handleAddItem}>
                            <LinearGradient colors={[colors.neonBlue, colors.neonPurple]} style={styles.deployGrad}>
                                <Text style={styles.deployText}>TRANSMIT_LISTING</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={item => (item.id || Math.random()).toString()}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadItems} tintColor={colors.neonBlue} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="cart-outline" size={60} color={colors.textDim} />
                        <Text style={styles.emptyText}>NO_ASSETS_DETECTED</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontFamily: 'Tanker', fontSize: 28, color: '#fff', letterSpacing: 1 },
    sub: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.neonBlue, letterSpacing: 2, marginTop: 4 },
    addBtn: { width: 44, height: 44, borderRadius: 12, overflow: 'hidden' },
    addBtnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    list: { paddingHorizontal: 24, paddingBottom: 100 },
    card: { padding: 20, borderRadius: 28, borderWidth: 1, borderColor: colors.border, marginBottom: 16, overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    itemTitle: { fontFamily: 'Tanker', fontSize: 18, color: '#fff' },
    itemPrice: { fontFamily: 'Tanker', fontSize: 20, color: colors.neonGreen },
    itemDesc: { fontFamily: 'Satoshi-Medium', fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 18 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: colors.border },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim },
    contactBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: colors.neonBlue + '40' },
    contactText: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.neonBlue, letterSpacing: 1 },
    deleteBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.hot + '10', justifyContent: 'center', alignItems: 'center' },

    form: { paddingHorizontal: 24, marginBottom: 25 },
    formGlass: { padding: 25, borderRadius: 32, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', gap: 12 },
    formLab: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.neonBlue, letterSpacing: 2, marginBottom: 5 },
    input: { height: 48, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, paddingHorizontal: 15, color: '#fff', fontFamily: 'Satoshi-Bold', fontSize: 13, borderWidth: 1, borderColor: colors.border },
    deployBtn: { height: 50, borderRadius: 12, overflow: 'hidden', marginTop: 10 },
    deployGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    deployText: { fontFamily: 'Tanker', fontSize: 16, color: '#000', letterSpacing: 1 },

    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontFamily: 'Tanker', fontSize: 18, color: colors.textDim, marginTop: 20, letterSpacing: 1 }
});

