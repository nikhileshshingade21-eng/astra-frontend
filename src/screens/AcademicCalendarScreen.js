import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Dimensions,
    StatusBar,
    Platform,
    UIManager,
    TextInput,
    Modal,
    Alert
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInUp, SlideInRight } from 'react-native-reanimated';
import { Colors } from '../theme/colors';
import { fetchWithTimeout } from '../utils/api';
import * as SecureStore from '../utils/storage';

const { width } = Dimensions.get('window');

const TYPE_CONFIG = {
    holiday: { color: Colors.danger, label: 'Holiday', icon: 'sunny-outline' },
    exam: { color: Colors.accent, label: 'Exams', icon: 'document-text-outline' },
    instruction: { color: Colors.success, label: 'Classroom', icon: 'school-outline' },
    event: { color: Colors.primary, label: 'Event', icon: 'star-outline' }
};

export default function AcademicCalendarScreen({ route, navigation }) {
    const { user } = route.params || { user: { role: 'student' } };
    const isAdmin = user.role === 'admin';
    
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Modal states for Admin
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [formData, setFormData] = useState({
        event_name: '',
        start_date: '',
        end_date: '',
        type: 'holiday',
        is_system_holiday: true
    });

    const fetchEvents = useCallback(async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout('/api/calendar', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok && res.data) {
                setEvents(res.data.events || []);
            }
        } catch (e) {
            console.error('[Calendar] Fetch error:', e.message);
        }
        setLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleSave = async () => {
        if (!formData.event_name || !formData.start_date || !formData.end_date) {
            alert('Please fill all required fields');
            return;
        }

        try {
            const token = await SecureStore.getItemAsync('token');
            const method = editingEvent ? 'PUT' : 'POST';
            const url = editingEvent ? `/api/calendar/${editingEvent.id}` : '/api/calendar';

            const res = await fetchWithTimeout(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    is_system_holiday: formData.is_system_holiday ? 1 : 0
                })
            });

            if (res.ok) {
                setIsModalOpen(false);
                setEditingEvent(null);
                fetchEvents();
            } else {
                alert(res.data.error || 'Failed to save event');
            }
        } catch (err) {
            alert('Network error');
        }
    };

    const handleDelete = (id) => {
        Alert.alert(
            'Delete Event',
            'Are you sure you want to remove this event from the calendar?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                        const token = await SecureStore.getItemAsync('token');
                        await fetchWithTimeout(`/api/calendar/${id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        fetchEvents();
                    }
                }
            ]
        );
    };

    const openEdit = (event) => {
        setEditingEvent(event);
        setFormData({
            event_name: event.event_name,
            start_date: event.start_date,
            end_date: event.end_date,
            type: event.type,
            is_system_holiday: event.is_system_holiday === 1
        });
        setIsModalOpen(true);
    };

    const formatDateRange = (start, end) => {
        const options = { month: 'long', day: 'numeric', year: 'numeric' };
        const s = new Date(start).toLocaleDateString('en-US', options);
        const e = new Date(end).toLocaleDateString('en-US', options);
        return s === e ? s : `${s} - ${e}`;
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <LinearGradient colors={Colors.gradientBg} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>Academic Calendar</Text>
                    <Text style={styles.sub}>Institutional Roadmap 2025-2026</Text>
                </View>
                {isAdmin && (
                    <TouchableOpacity 
                        onPress={() => {
                            setEditingEvent(null);
                            setFormData({ event_name: '', start_date: '2026-04-14', end_date: '2026-04-14', type: 'holiday', is_system_holiday: true });
                            setIsModalOpen(true);
                        }} 
                        style={styles.addBtn}
                    >
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchEvents} tintColor={Colors.primary} />}
            >
                {events.length === 0 && !loading && (
                    <View style={styles.empty}>
                        <Ionicons name="calendar-outline" size={60} color={Colors.textMuted} />
                        <Text style={styles.emptyText}>No events scheduled yet.</Text>
                    </View>
                )}

                {events.map((item, index) => {
                    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.event;
                    return (
                        <View key={item.id} style={styles.timelineRow}>
                            <View style={styles.timelineLeft}>
                                <View style={[styles.dot, { backgroundColor: config.color }]} />
                                {index !== events.length - 1 && <View style={styles.line} />}
                            </View>
                            
                            <Animated.View 
                                entering={FadeInUp.delay(index * 100)} 
                                style={[styles.card, { borderLeftColor: config.color }]}
                            >
                                <View style={styles.cardHeader}>
                                    <Text style={[styles.typeLabel, { color: config.color }]}>{config.label}</Text>
                                    {isAdmin && (
                                        <View style={styles.adminActions}>
                                            <TouchableOpacity onPress={() => openEdit(item)}>
                                                <Ionicons name="pencil" size={16} color={Colors.textMuted} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDelete(item.id)}>
                                                <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                                
                                <Text style={styles.eventName}>{item.event_name}</Text>
                                
                                <View style={styles.dateRow}>
                                    <View style={styles.dateBadge}>
                                        <Text style={styles.dateText}>{formatDateRange(item.start_date, item.end_date)}</Text>
                                    </View>
                                </View>

                                <View style={styles.iconOverlay}>
                                    <Ionicons name={config.icon} size={40} color={config.color} style={{ opacity: 0.05 }} />
                                </View>
                            </Animated.View>
                        </View>
                    );
                })}
            </ScrollView>

            {/* Admin Modal */}
            <Modal visible={isModalOpen} animationType="slide" transparent>
                <View style={styles.modalBg}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingEvent ? 'Edit Event' : 'Add Calendar Event'}</Text>
                        
                        <Text style={styles.label}>Event Name</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g. Mid-Term Exams"
                            placeholderTextColor={Colors.textMuted}
                            value={formData.event_name}
                            onChangeText={(v) => setFormData({...formData, event_name: v})}
                        />

                        <View style={styles.formRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Start (YYYY-MM-DD)</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="2026-04-14"
                                    placeholderTextColor={Colors.textMuted}
                                    value={formData.start_date}
                                    onChangeText={(v) => setFormData({...formData, start_date: v})}
                                />
                            </View>
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={styles.label}>End (YYYY-MM-DD)</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="2026-04-20"
                                    placeholderTextColor={Colors.textMuted}
                                    value={formData.end_date}
                                    onChangeText={(v) => setFormData({...formData, end_date: v})}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Event Type</Text>
                        <View style={styles.typeSelector}>
                            {Object.keys(TYPE_CONFIG).map(t => (
                                <TouchableOpacity 
                                    key={t}
                                    onPress={() => setFormData({...formData, type: t})}
                                    style={[
                                        styles.typeBtn, 
                                        formData.type === t && { backgroundColor: TYPE_CONFIG[t].color + '30', borderColor: TYPE_CONFIG[t].color }
                                    ]}
                                >
                                    <Text style={[styles.typeBtnText, formData.type === t && { color: TYPE_CONFIG[t].color }]}>
                                        {t.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity 
                            style={styles.holidayToggle}
                            onPress={() => setFormData({...formData, is_system_holiday: !formData.is_system_holiday})}
                        >
                            <Ionicons 
                                name={formData.is_system_holiday ? "checkbox" : "square-outline"} 
                                size={20} 
                                color={formData.is_system_holiday ? Colors.primary : Colors.textMuted} 
                            />
                            <Text style={styles.holidayToggleText}>Is System Holiday (Blocks Attendance)</Text>
                        </TouchableOpacity>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCancel}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSave} style={styles.modalSave}>
                                <Text style={styles.saveText}>Save Event</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 25, flexDirection: 'row', alignItems: 'center', gap: 15 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.glass, justifyContent: 'center', alignItems: 'center' },
    title: { fontFamily: 'Tanker', fontSize: 28, color: '#fff', letterSpacing: 0.5 },
    sub: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: Colors.textMuted, letterSpacing: 1 },
    addBtn: { marginLeft: 'auto', width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: Colors.primary, shadowRadius: 10, shadowOpacity: 0.3 },

    scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
    
    empty: { marginTop: 100, alignItems: 'center' },
    emptyText: { fontFamily: 'Satoshi-Bold', color: Colors.textMuted, marginTop: 15 },

    timelineRow: { flexDirection: 'row', gap: 15 },
    timelineLeft: { width: 12, alignItems: 'center', paddingTop: 30 },
    dot: { width: 10, height: 10, borderRadius: 5, zIndex: 2, borderWidth: 2, borderColor: Colors.bg },
    line: { flex: 1, width: 2, backgroundColor: Colors.divider },

    card: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 24, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4, overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    typeLabel: { fontFamily: 'Satoshi-Black', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
    adminActions: { flexDirection: 'row', gap: 15 },
    
    eventName: { fontFamily: 'Tanker', fontSize: 20, color: '#fff', letterSpacing: 0.5, marginBottom: 15 },
    dateRow: { flexDirection: 'row', alignItems: 'center' },
    dateBadge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    dateText: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: Colors.textSecondary },
    
    iconOverlay: { position: 'absolute', right: -10, bottom: -10 },

    // Modal Styles
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: Colors.bgCard, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
    modalTitle: { fontFamily: 'Tanker', fontSize: 24, color: '#fff', marginBottom: 25, textAlign: 'center' },
    label: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: Colors.textMuted, marginBottom: 8, marginTop: 15 },
    input: { backgroundColor: Colors.bgElevated, borderRadius: 16, padding: 16, color: '#fff', fontFamily: 'Satoshi-Medium', borderWidth: 1, borderColor: Colors.border },
    formRow: { flexDirection: 'row' },
    typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
    typeBtnText: { fontFamily: 'Satoshi-Black', fontSize: 9, color: Colors.textMuted },
    holidayToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 25 },
    holidayToggleText: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: '#fff' },
    modalFooter: { flexDirection: 'row', gap: 15, marginTop: 40 },
    modalCancel: { flex: 1, padding: 18, borderRadius: 16, alignItems: 'center' },
    modalSave: { flex: 2, backgroundColor: Colors.primary, padding: 18, borderRadius: 16, alignItems: 'center' },
    cancelText: { fontFamily: 'Satoshi-Bold', color: Colors.textMuted },
    saveText: { fontFamily: 'Satoshi-Black', color: '#fff' }
});
