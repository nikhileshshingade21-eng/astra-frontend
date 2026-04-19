import React, { useState, useEffect, useRef } from 'react';
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
    ScrollView,
    Image
} from 'react-native';
import * as SecureStore from '../utils/storage';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { fetchWithTimeout } from '../utils/api';
import { API_BASE } from '../api/config';
import Colors from '../theme/colors';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

const { width, height } = Dimensions.get('window');

const CATEGORIES = ['All', 'Books', 'Electronics', 'Stationery', 'Others'];

export default function MarketplaceScreen({ route, navigation }) {
    const { user } = route.params || { user: { id: 0 } };
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Search and Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    
    // Add Item State
    const [isAdding, setIsAdding] = useState(false);
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [price, setPrice] = useState('');
    const [itemCategory, setItemCategory] = useState('Books');
    const [imageUri, setImageUri] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // Camera State
    const [showCamera, setShowCamera] = useState(false);
    const { hasPermission, requestPermission } = useCameraPermission();
    const device = useCameraDevice('back');
    const cameraRef = useRef(null);

    const loadItems = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/marketplace/items`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok && res.data) {
                // Ensure all items have a category
                const fetched = (res.data.items || []).map(item => ({
                    ...item,
                    category: item.category || 'Others'
                }));
                setItems(fetched);
                applyFilters(fetched, searchQuery, selectedCategory);
            }
        } catch (e) {
            console.warn(e);
        }
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => { loadItems(); }, []);

    const applyFilters = (data, query, category) => {
        let filtered = data;
        if (category !== 'All') {
            filtered = filtered.filter(item => item.category === category);
        }
        if (query.trim() !== '') {
            filtered = filtered.filter(item => 
                (item.title || '').toLowerCase().includes(query.toLowerCase()) || 
                (item.description || '').toLowerCase().includes(query.toLowerCase())
            );
        }
        setFilteredItems(filtered);
    };

    const handleSearch = (text) => {
        setSearchQuery(text);
        applyFilters(items, text, selectedCategory);
    };

    const handleCategorySelect = (cat) => {
        setSelectedCategory(cat);
        applyFilters(items, searchQuery, cat);
    };

    const handleAddItem = async () => {
        if (!title.trim() || !price) return Alert.alert('Missing Info', 'Please provide a title and price.');
        
        // Ensure price is a valid number
        const numPrice = parseFloat(price);
        if (isNaN(numPrice)) return Alert.alert('Invalid Price', 'Price must be a valid number.');

        setIsUploading(true);
        try {
            const token = await SecureStore.getItemAsync('token');
            let uploadedUrl = null;

            // 1. Upload image if exists
            if (imageUri) {
                const formData = new FormData();
                formData.append('image', {
                    uri: Platform.OS === 'android' ? 'file://' + imageUri : imageUri,
                    name: 'item.jpg',
                    type: 'image/jpeg'
                });

                const uploadRes = await fetchWithTimeout(`/api/marketplace/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                    isMultipart: true
                });

                if (uploadRes.ok && uploadRes.data) {
                    uploadedUrl = uploadRes.data.image_url;
                } else {
                    setIsUploading(false);
                    return Alert.alert('Upload Failed', 'Could not upload item photo.');
                }
            }

            // 2. Post item
            const res = await fetchWithTimeout(`/api/marketplace/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    title, 
                    description: desc, 
                    price: numPrice,
                    category: itemCategory,
                    image_url: uploadedUrl
                })
            });
            if (res.ok && res.data) {
                Alert.alert('Success', 'Item listed successfully.');
                setIsAdding(false); 
                setTitle(''); setDesc(''); setPrice(''); setItemCategory('Books'); setImageUri(null);
                loadItems();
            } else {
                Alert.alert('Error', res.data?.error || 'Could not post item.');
            }
        } catch (e) {
            Alert.alert('Network Error', 'Failed to connect to the server.');
        }
        setIsUploading(false);
    };

    const handleReaction = async (itemId) => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/marketplace/items/react`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ itemId })
            });
            if (res.ok) {
                // Optimistic UI update or reload
                loadItems();
            }
        } catch (e) {}
    };

    const handleChat = async (item) => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/marketplace/chat/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ itemId: item.id, sellerId: item.seller_id })
            });

            if (res.ok && res.data) {
                navigation.navigate('MarketplaceChat', {
                    conversationId: res.data.conversation_id,
                    itemTitle: item.title,
                    itemImage: item.image_url,
                    sellerName: item.seller_name,
                    sellerId: item.seller_id,
                    user: user
                });
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to start chat.');
        }
    };

    const takePhoto = async () => {
        if (!hasPermission) {
            const result = await requestPermission();
            if (!result) return Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
        }
        setShowCamera(true);
    };

    const handleCapture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePhoto({
                    flash: 'off'
                });
                setImageUri(photo.path);
                setShowCamera(false);
            } catch (e) {
                Alert.alert('Error', 'Failed to capture photo');
            }
        }
    };

    const handleDelete = async (id) => {
        Alert.alert("Remove Item", "Are you sure you want to delete this listing?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
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
        <Animated.View entering={FadeInDown.delay(index * 50)} style={styles.itemWrapper}>
            <View style={styles.card}>
                <View style={styles.cardImageContainer}>
                    {item.image_url ? (
                        <Image source={{ uri: API_BASE + item.image_url }} style={styles.cardImage} />
                    ) : (
                        <View style={styles.cardImagePlaceholder}>
                            <Ionicons name="cube-outline" size={32} color={Colors.textDisabled} />
                        </View>
                    )}
                    <View style={styles.categoryTag}>
                        <Text style={styles.categoryTagText}>{item.category}</Text>
                    </View>
                    <TouchableOpacity 
                        style={[styles.reactBtn, item.has_reacted && styles.reactBtnActive]} 
                        onPress={() => handleReaction(item.id)}
                    >
                        <Ionicons name={item.has_reacted ? "heart" : "heart-outline"} size={16} color={item.has_reacted ? Colors.danger : "#fff"} />
                        {item.reaction_count > 0 && <Text style={styles.reactionCount}>{item.reaction_count}</Text>}
                    </TouchableOpacity>
                </View>
                
                <View style={styles.cardContent}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.itemPrice}>₹{item.price}</Text>
                    
                    <Text style={styles.itemDesc} numberOfLines={2}>
                        {item.description || 'No description provided.'}
                    </Text>
                    
                    <View style={styles.cardFooter}>
                        <View style={styles.meta}>
                            <Ionicons name="person-circle-outline" size={14} color={Colors.textMuted} />
                            <Text style={styles.metaText}>{item.seller_name || 'Seller'}</Text>
                        </View>
                        
                        {item.seller_id === user.id ? (
                            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                                <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.contactBtn} onPress={() => handleChat(item)}>
                                <Text style={styles.contactText}>Chat</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
            <LinearGradient colors={Colors.gradientBg} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={{ marginLeft: 16 }}>
                        <Text style={styles.title}>Marketplace</Text>
                        <Text style={styles.sub}>Campus Exchange</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => { setIsAdding(!isAdding); }}>
                    <Ionicons name={isAdding ? "close" : "add"} size={28} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Search and Filters */}
            {!isAdding && (
                <Animated.View entering={FadeInUp} style={styles.filtersContainer}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search items..."
                            placeholderTextColor={Colors.textMuted}
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => handleSearch('')}>
                                <Ionicons name="close-circle-outline" size={20} color={Colors.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                        {CATEGORIES.map(cat => (
                            <TouchableOpacity 
                                key={cat} 
                                style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
                                onPress={() => handleCategorySelect(cat)}
                            >
                                <Text style={[styles.filterChipText, selectedCategory === cat && { color: Colors.primaryLight }]}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Animated.View>
            )}

            {isAdding ? (
                <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
                    <Text style={styles.formTitle}>List a New Item</Text>
                    
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Title</Text>
                        <TextInput style={styles.input} placeholder="e.g. Scientific Calculator" placeholderTextColor={Colors.textDisabled} value={title} onChangeText={setTitle} />
                    </View>
                    
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Price (₹)</Text>
                        <TextInput style={styles.input} placeholder="e.g. 500" placeholderTextColor={Colors.textDisabled} keyboardType="numeric" value={price} onChangeText={setPrice} />
                    </View>
                    
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                            {CATEGORIES.filter(c => c !== 'All').map(cat => (
                                <TouchableOpacity 
                                    key={cat} 
                                    style={[styles.catSelectBtn, itemCategory === cat && styles.catSelectBtnActive]}
                                    onPress={() => setItemCategory(cat)}
                                >
                                    <Text style={[styles.catSelectText, itemCategory === cat && { color: Colors.primary }]}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                    
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Item Photo</Text>
                        <View style={styles.photoUploadContainer}>
                            {imageUri ? (
                                <View style={styles.previewContainer}>
                                    <Image source={{ uri: 'file://' + imageUri }} style={styles.previewImage} />
                                    <TouchableOpacity style={styles.removePhoto} onPress={() => setImageUri(null)}>
                                        <Ionicons name="close-circle" size={24} color={Colors.danger} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.photoPlaceholder} onPress={takePhoto}>
                                    <Ionicons name="camera-outline" size={32} color={Colors.textMuted} />
                                    <Text style={styles.photoPlaceholderText}>Capture Item</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Description</Text>
                        <TextInput style={[styles.input, styles.inputDesc]} placeholder="Condition, edition, specs..." placeholderTextColor={Colors.textDisabled} multiline value={desc} onChangeText={setDesc} textAlignVertical="top" />
                    </View>
                    
                    <TouchableOpacity style={styles.submitBtn} onPress={handleAddItem} disabled={isUploading}>
                        <LinearGradient colors={Colors.gradientPrimary} style={styles.submitGrad}>
                            {isUploading ? <ActivityIndicator size="small" color="#fff" /> : (
                                <>
                                    <Text style={styles.submitText}>List Item</Text>
                                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            ) : (
                <FlatList
                    data={filteredItems}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    numColumns={2}
                    columnWrapperStyle={styles.listRow}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadItems} tintColor={Colors.primary} />}
                    ListEmptyComponent={
                        !loading && (
                            <View style={styles.emptyState}>
                                <Ionicons name="basket-outline" size={48} color={Colors.textMuted} />
                                <Text style={styles.emptyText}>No items found</Text>
                                <Text style={styles.emptySub}>Try adjusting your search or filters</Text>
                            </View>
                        )
                    }
                />
            )}

            {showCamera && (
                <View style={StyleSheet.absoluteFill}>
                    <Camera
                        ref={cameraRef}
                        style={StyleSheet.absoluteFill}
                        device={device}
                        isActive={showCamera}
                        photo={true}
                    />
                    <View style={styles.cameraOverlay}>
                        <TouchableOpacity style={styles.cameraClose} onPress={() => setShowCamera(false)}>
                            <Ionicons name="close" size={30} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
                            <View style={styles.captureBtnInner} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.glass, justifyContent: 'center', alignItems: 'center' },
    title: { fontFamily: 'Tanker', fontSize: 24, color: '#fff', letterSpacing: 0.5 },
    sub: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: Colors.textMuted },
    addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryGlass, justifyContent: 'center', alignItems: 'center' },

    filtersContainer: { paddingHorizontal: 20, marginBottom: 15, zIndex: 10 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: 16, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, fontFamily: 'Satoshi-Medium', fontSize: 14, color: '#fff', padding: 0 },
    categoryScroll: { gap: 8 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
    filterChipActive: { backgroundColor: Colors.primaryGlass, borderColor: Colors.primary },
    filterChipText: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: Colors.textMuted },

    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    listRow: { justifyContent: 'space-between' },
    itemWrapper: { width: (width - 44) / 2, marginBottom: 16 },
    
    card: { backgroundColor: Colors.bgCard, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
    cardImageContainer: { height: 120, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: 'rgba(255,255,255,0.02)' },
    cardImage: { width: '100%', height: '100%' },
    cardImagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    categoryTag: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    categoryTagText: { fontFamily: 'Satoshi-Bold', fontSize: 9, color: '#fff' },
    
    reactBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
    reactBtnActive: { backgroundColor: 'rgba(255, 61, 113, 0.2)', borderColor: Colors.danger, borderWidth: 1 },
    reactionCount: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: '#fff' },
    
    cardContent: { padding: 12 },
    itemTitle: { fontFamily: 'Satoshi-Black', fontSize: 13, color: '#fff', marginBottom: 4 },
    itemPrice: { fontFamily: 'Tanker', fontSize: 18, color: Colors.primary, marginBottom: 8 },
    itemDesc: { fontFamily: 'Satoshi-Medium', fontSize: 11, color: Colors.textMuted, lineHeight: 16 },
    
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontFamily: 'Satoshi-Medium', fontSize: 10, color: Colors.textMuted },
    
    contactBtn: { backgroundColor: Colors.primaryLight + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    contactText: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: Colors.primaryLight },
    deleteBtn: { padding: 4 },

    emptyState: { alignItems: 'center', marginTop: height * 0.15 },
    emptyText: { fontFamily: 'Tanker', fontSize: 20, color: Colors.textMuted, marginTop: 16, letterSpacing: 0.5 },
    emptySub: { fontFamily: 'Satoshi-Medium', fontSize: 13, color: Colors.textDisabled, marginTop: 4 },

    formContent: { padding: 20, paddingBottom: 100 },
    formTitle: { fontFamily: 'Tanker', fontSize: 24, color: '#fff', marginBottom: 24 },
    inputGroup: { marginBottom: 20 },
    inputLabel: { fontFamily: 'Satoshi-Bold', fontSize: 13, color: Colors.textSecondary, marginBottom: 8, marginLeft: 4 },
    input: { backgroundColor: Colors.bgCard, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontFamily: 'Satoshi-Medium', fontSize: 14, color: '#fff', borderWidth: 1, borderColor: Colors.border },
    inputDesc: { height: 100, paddingTop: 14 },
    
    photoUploadContainer: { height: 150, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard, overflow: 'hidden' },
    photoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
    photoPlaceholderText: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: Colors.textMuted },
    previewContainer: { flex: 1 },
    previewImage: { width: '100%', height: '100%' },
    removePhoto: { position: 'absolute', top: 10, right: 10 },

    cameraOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40 },
    cameraClose: { position: 'absolute', top: 60, left: 24 },
    captureBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
    captureBtnInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' },
    
    catSelectBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.border },
    catSelectBtnActive: { backgroundColor: Colors.primaryGlass, borderColor: Colors.primary + '50' },
    catSelectText: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: Colors.textMuted },

    submitBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 10 },
    submitGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
    submitText: { fontFamily: 'Satoshi-Black', fontSize: 14, color: '#fff' }
});
