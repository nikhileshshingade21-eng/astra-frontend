import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE } from '../api/config';

const colors = {
    bg0: '#0f172a', surf: 'rgba(255, 255, 255, 0.05)',
    hot: '#3b82f6', green: '#10b981', cyan: '#0ea5e9', purp: '#6366f1', border: 'rgba(255, 255, 255, 0.12)',
    danger: '#ff3b5c'
};

export default function MarketplaceScreen({ route, navigation }) {
    const { user } = route.params || {};

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // New item states
    const [isAdding, setIsAdding] = useState(false);
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [price, setPrice] = useState('');

    const loadItems = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/marketplace/items`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
            }
        } catch (e) {
            console.log('Marketplace fetch err:', e);
        }
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => { loadItems(); }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadItems();
    };

    const handleAddItem = async () => {
        if (!title || !price) {
            Alert.alert('Error', 'Title and Price are required.');
            return;
        }
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/marketplace/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title, description: desc, price: parseFloat(price) })
            });

            if (res.ok) {
                Alert.alert('Success', 'Item posted to campus marketplace!');
                setIsAdding(false);
                setTitle(''); setDesc(''); setPrice('');
                loadItems();
            } else {
                Alert.alert('Failed', 'Could not post item.');
            }
        } catch (e) {
            console.log('Add item err:', e);
        }
    };

    const handleMarkSold = async (id) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/marketplace/items/${id}/sold`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                Alert.alert('Success', 'Item marked as sold!');
                loadItems();
            }
        } catch (e) {
            console.log('Mark sold err:', e);
        }
    };

    const handleDeleteItem = async (id) => {
        Alert.alert(
            "Delete Item",
            "Are you sure you want to permanently delete this item?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: async () => {
                    try {
                        const token = await AsyncStorage.getItem('token');
                        const res = await fetch(`${API_BASE}/api/marketplace/items/${id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (res.ok) {
                            Alert.alert('Success', 'Item deleted.');
                            loadItems();
                        } else {
                            Alert.alert('Failed', 'Could not delete item.');
                        }
                    } catch (e) {
                        console.log('Delete err:', e);
                    }
                }}
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.cyan} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>CAMPUS MARKET</Text>
                <Text style={styles.subTitle}>Peer-to-Peer Trading Hub</Text>
            </View>

            {isAdding ? (
                <View style={styles.addForm}>
                    <Text style={styles.formTitle}>POST NEW ITEM</Text>
                    
                    <View style={styles.inputGhost}>
                        <Ionicons name="pricetag" size={20} color={colors.cyan} style={styles.inputIcon} />
                        <TextInput style={styles.inputField} placeholder="Item Title (e.g. Physics Textbook)" placeholderTextColor="rgba(255,255,255,0.4)" value={title} onChangeText={setTitle} />
                    </View>
                    
                    <View style={styles.inputGhost}>
                        <Ionicons name="cash" size={20} color={colors.green} style={styles.inputIcon} />
                        <TextInput style={styles.inputField} placeholder="Price (₹)" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="numeric" value={price} onChangeText={setPrice} />
                    </View>

                    <View style={[styles.inputGhost, { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
                        <Ionicons name="document-text" size={20} color={colors.purp} style={styles.inputIcon} />
                        <TextInput style={[styles.inputField, { height: 60, textAlignVertical: 'top' }]} placeholder="Description (Optional)" placeholderTextColor="rgba(255,255,255,0.4)" multiline value={desc} onChangeText={setDesc} />
                    </View>

                    <View style={styles.formActions}>
                        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.surf, borderColor: colors.border, borderWidth: 1 }]} onPress={() => setIsAdding(false)}>
                            <Text style={styles.btnText}>CANCEL</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.cyan }]} onPress={handleAddItem}>
                            <Text style={styles.btnText}>POST ITEM</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <TouchableOpacity style={styles.triggerAddBtn} onPress={() => setIsAdding(true)}>
                    <LinearGradient colors={[colors.cyan, colors.purp]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    <Ionicons name="add-circle" size={24} color="#fff" />
                    <Text style={styles.triggerText}>SELL AN ITEM</Text>
                </TouchableOpacity>
            )}

            <FlatList
                data={items}
                keyExtractor={item => item.id.toString()}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
                contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                ListEmptyComponent={<Text style={styles.emptyText}>No items available currently.</Text>}
                renderItem={({ item }) => (
                    <View style={styles.itemCard}>
                        <View style={styles.itemHeader}>
                            <Text style={styles.itemTitle}>{item.title}</Text>
                            <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
                        </View>
                        <Text style={styles.itemDesc}>{item.description}</Text>
                        
                        <View style={styles.itemFooter}>
                            <View style={styles.sellerBadge}>
                                <Ionicons name="person" size={12} color="rgba(255,255,255,0.6)" />
                                <Text style={styles.sellerName}>Seller ID: {item.seller_id}</Text>
                            </View>

                            {item.status === 'sold' ? (
                                <Text style={styles.soldText}>SOLD OUT</Text>
                            ) : (
                                item.seller_id === user.id ? (
                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        <TouchableOpacity style={styles.markSoldBtn} onPress={() => handleMarkSold(item.id)}>
                                            <Text style={styles.markSoldText}>MARK SOLD</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.markSoldBtn, { borderColor: colors.danger, backgroundColor: 'rgba(255, 59, 92, 0.1)' }]} onPress={() => handleDeleteItem(item.id)}>
                                            <Ionicons name="trash" size={14} color={colors.danger} />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity style={styles.buyBtn}>
                                        <Text style={styles.buyText}>CONTACT SELLER</Text>
                                    </TouchableOpacity>
                                )
                            )}
                        </View>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg0 },
    centerContainer: { flex: 1, backgroundColor: colors.bg0, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 24, paddingTop: 60, paddingBottom: 20 },
    title: { fontFamily: 'Tanker', fontSize: 32, color: '#fff', letterSpacing: 1 },
    subTitle: { fontFamily: 'Satoshi', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
    
    emptyText: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 40, fontFamily: 'Satoshi' },
    
    triggerAddBtn: { marginHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18, borderRadius: 16, overflow: 'hidden' },
    triggerText: { fontFamily: 'Tanker', fontSize: 20, color: '#fff', letterSpacing: 1 },

    addForm: { margin: 24, padding: 20, backgroundColor: colors.surf, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    formTitle: { fontFamily: 'Tanker', fontSize: 20, color: '#fff', marginBottom: 20, letterSpacing: 1 },
    inputGhost: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12, paddingHorizontal: 16, height: 55 },
    inputIcon: { marginRight: 12 },
    inputField: { flex: 1, color: '#fff', fontFamily: 'Satoshi', fontSize: 16 },
    formActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
    btn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
    btnText: { fontFamily: 'Tanker', fontSize: 16, color: '#fff', letterSpacing: 1 },

    itemCard: { backgroundColor: colors.surf, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemTitle: { fontFamily: 'Tanker', fontSize: 22, color: '#fff', flex: 1, marginRight: 10 },
    itemPrice: { fontFamily: 'Tanker', fontSize: 24, color: colors.green },
    itemDesc: { fontFamily: 'Satoshi', fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 10, lineHeight: 20 },
    itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
    
    sellerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    sellerName: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 },
    
    soldText: { fontFamily: 'Tanker', fontSize: 16, color: colors.hot, letterSpacing: 1 },
    markSoldBtn: { backgroundColor: colors.surf, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
    markSoldText: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: '#fff', letterSpacing: 1 },
    buyBtn: { backgroundColor: colors.cyan + '20', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.cyan },
    buyText: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: colors.cyan, letterSpacing: 1 }
});
