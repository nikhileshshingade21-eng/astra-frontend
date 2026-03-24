import React, { useState, useEffect } from 'react';
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
    Dimensions
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE } from '../api/config';

const { width } = Dimensions.get('window');

const AnnouncementsScreen = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [userRole, setUserRole] = useState('student');
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newCategory, setNewCategory] = useState('General');

    const API_URL = `${API_BASE}/api/announcements`;

    useEffect(() => {
        fetchUserInfo();
        fetchAnnouncements();
    }, []);

    const fetchUserInfo = async () => {
        const role = await AsyncStorage.getItem('userRole');
        setUserRole(role || 'student');
    };

    const fetchAnnouncements = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await axios.get(API_URL, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setAnnouncements(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching announcements:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleCreate = async () => {
        if (!newTitle || !newContent) {
            Alert.alert('Empty Fields', 'Please fill in all fields.');
            return;
        }

        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await axios.post(API_URL, {
                title: newTitle,
                content: newContent,
                category: newCategory
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                Alert.alert('Success', 'Announcement posted successfully!');
                setModalVisible(false);
                setNewTitle('');
                setNewContent('');
                fetchAnnouncements();
            }
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to post announcement');
        }
    };

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'Exam': return 'school';
            case 'Holiday': return 'calendar';
            case 'Event': return 'star';
            default: return 'notifications';
        }
    };

    const renderItem = ({ item }) => (
        <BlurView intensity={20} tint="light" style={styles.announcementCard}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: getCategoryColor(item.category) }]}>
                    <Ionicons name={getCategoryIcon(item.category)} size={20} color="#FFF" />
                </View>
                <View style={styles.titleGroup}>
                    <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
                    <Text style={styles.titleText}>{item.title}</Text>
                </View>
                <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.contentText}>{item.content}</Text>
            <Text style={styles.authorText}>- {item.author || 'Faculty'}</Text>
        </BlurView>
    );

    const getCategoryColor = (cat) => {
        if (cat === 'Exam') return '#FF4757';
        if (cat === 'Holiday') return '#1E90FF';
        if (cat === 'Event') return '#FFA502';
        return '#707070';
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Alerts & Updates</Text>
                {userRole === 'teacher' && (
                    <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                        <Ionicons name="add" size={28} color="#007AFF" />
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={announcements}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchAnnouncements} />}
                ListEmptyComponent={<Text style={styles.emptyText}>No announcements yet.</Text>}
            />

            <Modal animationType="slide" transparent={true} visible={modalVisible}>
                <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Announcement</Text>
                        
                        <TextInput 
                            style={styles.input} 
                            placeholder="Title (e.g., Mid-Exam Schedule)"
                            placeholderTextColor="#666"
                            value={newTitle}
                            onChangeText={setNewTitle}
                        />

                        <TextInput 
                            style={[styles.input, styles.textArea]} 
                            placeholder="Detail message..."
                            placeholderTextColor="#666"
                            multiline
                            numberOfLines={4}
                            value={newContent}
                            onChangeText={setNewContent}
                        />

                        <View style={styles.categoryPicker}>
                            {['General', 'Exam', 'Holiday', 'Event'].map(cat => (
                                <TouchableOpacity 
                                    key={cat} 
                                    style={[styles.catButton, newCategory === cat && styles.catButtonActive]}
                                    onPress={() => setNewCategory(cat)}
                                >
                                    <Text style={[styles.catButtonText, newCategory === cat && styles.catButtonTextActive]}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.postBtn} onPress={handleCreate}>
                                <Text style={styles.postText}>Post Now</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </BlurView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { 
        paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, 
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' 
    },
    headerTitle: { fontSize: 28, fontWeight: '800', color: '#1A1A1A' },
    addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowOpacity: 0.1 },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    announcementCard: { 
        borderRadius: 20, padding: 20, marginBottom: 15, overflow: 'hidden',
        borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)'
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    iconContainer: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    titleGroup: { flex: 1, marginLeft: 12 },
    categoryText: { fontSize: 10, fontWeight: '700', color: '#666' },
    titleText: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
    dateText: { fontSize: 12, color: '#999' },
    contentText: { fontSize: 15, lineHeight: 22, color: '#444', marginBottom: 10 },
    authorText: { fontSize: 12, fontWeight: '600', color: '#707070', textAlign: 'right' },
    emptyText: { textAlign: 'center', marginTop: 100, color: '#999' },
    
    // Modal Styles
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: width * 0.9, backgroundColor: '#FFF', borderRadius: 30, padding: 25 },
    modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 20, color: '#1A1A1A' },
    input: { backgroundColor: '#F0F0F0', borderRadius: 12, padding: 15, marginBottom: 15, fontSize: 16 },
    textArea: { height: 120, textAlignVertical: 'top' },
    categoryPicker: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 25 },
    catButton: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: '#DDD', marginRight: 10, marginBottom: 10 },
    catButtonActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
    catButtonText: { fontSize: 12, fontWeight: '600', color: '#666' },
    catButtonTextActive: { color: '#FFF' },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
    cancelBtn: { padding: 15, width: '45%' },
    postBtn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 15, width: '45%', alignItems: 'center' },
    cancelText: { textAlign: 'center', fontWeight: '700', color: '#666' },
    postText: { color: '#FFF', fontWeight: '700' }
});

export default AnnouncementsScreen;
