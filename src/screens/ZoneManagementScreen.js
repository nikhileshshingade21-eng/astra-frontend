import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    FlatList,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    ActivityIndicator
} from 'react-native';
import * as SecureStore from '../utils/storage';
import LinearGradient from 'react-native-linear-gradient';
// import { BlurView } from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming, 
    FadeInDown,
    interpolate
} from 'react-native-reanimated';
import { fetchWithTimeout } from '../utils/api';
import Colors from '../theme/colors';
import AstraTouchable from '../components/AstraTouchable';

const { width } = Dimensions.get('window');

const colors = Colors;

export default function ZoneManagementScreen({ navigation }) {
    const [zones, setZones] = useState([]);
    const [newZone, setNewZone] = useState({ name: '', lat: '', lng: '', radius: '' });
    const [isAddingZone, setIsAddingZone] = useState(false);
    const [loading, setLoading] = useState(true);

    const radarAngle = useSharedValue(0);

    useEffect(() => {
        fetchZones();
        radarAngle.value = withRepeat(withTiming(360, { duration: 4000 }), -1, false);
    }, []);

    const fetchZones = async () => {
        try {
                        const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/admin/zones`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok && res.data) {
                const zoneList = Array.isArray(res.data) ? res.data : (res.data.zones || []);
                setZones(zoneList.map(z => ({
                    id: z.id,
                    name: z.name,
                    lat: String(z.lat),
                    lng: String(z.lng),
                    radius: `${z.radius_m}m`,
                    active: !!z.active
                })));
            }
        } catch (error) {
            Alert.alert("Connection Error", "Could not load campus zones.");
        } finally {
            setLoading(false);
        }
    };

    const addZone = async () => {
        if (!newZone.name || !newZone.lat || !newZone.lng || !newZone.radius) {
            return Alert.alert('Missing Info', 'Please fill in all zone details.');
        }
        try {
                        const token = await SecureStore.getItemAsync('token');
            const res = await fetchWithTimeout(`/api/admin/zone`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newZone.name,
                    lat: parseFloat(newZone.lat),
                    lng: parseFloat(newZone.lng),
                    radius_m: parseInt(newZone.radius)
                })
            });
            if (res.ok && res.data) {
                setNewZone({ name: '', lat: '', lng: '', radius: '' });
                setIsAddingZone(false);
                fetchZones();
            } else {
                Alert.alert("Error", res.data?.error || "Could not save zone.");
            }
        } catch (error) {
            Alert.alert("Error", "Could not save zone.");
        }
    };

    const toggleZone = async (id, currentStatus) => {
        try {
                        const token = await SecureStore.getItemAsync('token');
            setZones(prev => prev.map(z => z.id === id ? { ...z, active: !currentStatus } : z));
            const res = await fetchWithTimeout(`/api/admin/zones/${id}/toggle`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !currentStatus })
            });
            if (!res.ok) throw new Error('Toggle failed');
        } catch (error) {
            setZones(prev => prev.map(z => z.id === id ? { ...z, active: currentStatus } : z));
            Alert.alert("Error", "Could not update zone status.");
        }
    };

    const deleteZone = (id) => {
        Alert.alert('Delete Zone', 'Are you sure you want to delete this zone?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const token = await SecureStore.getItemAsync('token');
                        const res = await fetchWithTimeout(`/api/admin/zones/${id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (res.ok && res.data) {
                            setZones(prev => prev.filter(z => z.id !== id));
                        }
                    } catch (error) {
                        Alert.alert("Error", "Could not delete zone.");
                    }
                }
            }
        ]);
    };

    const radarStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${radarAngle.value}deg` }]
    }));

    const renderZoneCard = ({ item, index }) => (
        <Animated.View entering={FadeInDown.delay(index * 100)}>
            <View blurType="dark" blurAmount={3} style={[styles.card, !item.active && styles.cardInactive]}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.zoneTitle}>{item.name.toUpperCase()}</Text>
                        <View style={styles.coordBox}>
                            <Ionicons name="location" size={10} color={colors.neonBlue} />
                            <Text style={styles.coordText}>{parseFloat(item.lat).toFixed(4)}, {parseFloat(item.lng).toFixed(4)}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: item.active ? colors.neonGreen + '20' : colors.hot + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: item.active ? colors.neonGreen : colors.hot }]} />
                        <Text style={[styles.statusText, { color: item.active ? colors.neonGreen : colors.hot }]}>
                            {item.active ? 'ACTIVE' : 'INACTIVE'}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardFooter}>
                    <View style={styles.footerInfo}>
                        <View style={styles.footerItem}>
                            <Text style={styles.footerLab}>RADIUS</Text>
                            <Text style={styles.footerVal}>{item.radius}</Text>
                        </View>
                        <View style={styles.footerItem}>
                            <Text style={styles.footerLab}>ZONE ID</Text>
                            <Text style={styles.footerVal}>#{item.id}</Text>
                        </View>
                    </View>
                    <View style={styles.actions}>
                        <TouchableOpacity 
                            style={[styles.actionBtn, { borderColor: item.active ? colors.hot + '40' : colors.neonGreen + '40' }]} 
                            onPress={() => toggleZone(item.id, item.active)}
                        >
                            <Ionicons name={item.active ? "power" : "play"} size={16} color={item.active ? colors.hot : colors.neonGreen} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]} onPress={() => deleteZone(item.id)}>
                            <Ionicons name="trash-outline" size={16} color={colors.textDim} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />
            
            <View style={styles.radarWrapper}>
                <Animated.View style={[styles.radarLine, radarStyle]} />
            </View>

            <View style={styles.header}>
                <AstraTouchable onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </AstraTouchable>
                <View>
                    <Text style={styles.title}>Campus Zones</Text>
                    <Text style={styles.sub}>Manage location areas</Text>
                </View>
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <TouchableOpacity 
                    style={styles.formTrigger}
                    onPress={() => {
                        setIsAddingZone(!isAddingZone);
                    }}
                >
                    <View blurType="dark" blurAmount={5} style={[styles.formBtn, isAddingZone && { borderColor: colors.neonPink }]}>
                        <Ionicons name={isAddingZone ? "close" : "add"} size={22} color={isAddingZone ? colors.neonPink : colors.neonBlue} />
                        <Text style={[styles.formBtnText, { color: isAddingZone ? colors.neonPink : colors.neonBlue }]}>
                            {isAddingZone ? "Cancel" : "Add New Zone"}
                        </Text>
                    </View>
                </TouchableOpacity>

                {isAddingZone && (
                    <View style={styles.form}>
                        <View style={styles.formRow}>
                            <View style={{ flex: 2 }}>
                                <Text style={styles.inputLab}>ZONE NAME</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Name..."
                                    placeholderTextColor="rgba(255,255,255,0.1)"
                                    value={newZone.name}
                                    onChangeText={t => setNewZone({...newZone, name: t})}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLab}>RADIUS (m)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="METERS..."
                                    placeholderTextColor="rgba(255,255,255,0.1)"
                                    keyboardType="numeric"
                                    value={newZone.radius}
                                    onChangeText={t => setNewZone({...newZone, radius: t})}
                                />
                            </View>
                        </View>
                        <View style={styles.formRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLab}>LATITUDE</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="X.XXXX..."
                                    placeholderTextColor="rgba(255,255,255,0.1)"
                                    keyboardType="numeric"
                                    value={newZone.lat}
                                    onChangeText={t => setNewZone({...newZone, lat: t})}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLab}>LONGITUDE</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Y.YYYY..."
                                    placeholderTextColor="rgba(255,255,255,0.1)"
                                    keyboardType="numeric"
                                    value={newZone.lng}
                                    onChangeText={t => setNewZone({...newZone, lng: t})}
                                />
                            </View>
                        </View>
                        <TouchableOpacity style={styles.deployBtn} onPress={addZone}>
                            <LinearGradient colors={[colors.neonBlue, colors.neonPurple]} style={styles.deployGrad}>
                                <Text style={styles.deployText}>SAVE ZONE</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}

                <FlatList
                    data={zones}
                    renderItem={renderZoneCard}
                    keyExtractor={item => item.id.toString()}
                    scrollEnabled={false}
                    ListEmptyComponent={
                        !loading && (
                            <View style={styles.empty}>
                                <Ionicons name="map-outline" size={48} color={colors.textDim} />
                                <Text style={styles.emptyText}>No zones added yet</Text>
                            </View>
                        )
                    }
                />
            </ScrollView>

            <View blurType="dark" blurAmount={3} style={styles.footer}>
                <View style={styles.pulseDot} />
                <Text style={styles.footerText}>Location services active</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    radarWrapper: { position: 'absolute', width: width * 2, height: width * 2, top: -width * 0.5, left: -width * 0.5, opacity: 0.1 },
    radarLine: { position: 'absolute', width: '50%', height: 2, backgroundColor: colors.neonBlue, top: '50%', left: '50%', transformOrigin: 'left center' },
    
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 15 },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    title: { fontFamily: 'Tanker', fontSize: 26, color: '#fff', letterSpacing: 1 },
    sub: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.neonBlue, letterSpacing: 2, marginTop: 4 },

    scrollContent: { paddingHorizontal: 24, paddingBottom: 150 },
    formTrigger: { marginVertical: 20, borderRadius: 16, overflow: 'hidden' },
    formBtn: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: colors.neonBlue + '30' },
    formBtnText: { fontFamily: 'Satoshi-Black', fontSize: 11, letterSpacing: 2 },

    form: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.border, marginBottom: 30, gap: 15 },
    formRow: { flexDirection: 'row', gap: 12 },
    inputLab: { fontFamily: 'Satoshi-Black', fontSize: 7, color: colors.textDim, letterSpacing: 2, marginBottom: 8 },
    input: { height: 48, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, paddingHorizontal: 15, color: '#fff', fontFamily: 'Satoshi-Bold', fontSize: 13, borderWidth: 1, borderColor: colors.border },
    deployBtn: { height: 50, borderRadius: 12, overflow: 'hidden', marginTop: 10 },
    deployGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    deployText: { fontFamily: 'Tanker', fontSize: 16, color: '#fff', letterSpacing: 1 },

    card: { padding: 20, borderRadius: 28, borderWidth: 1, borderColor: colors.border, marginBottom: 16, overflow: 'hidden' },
    cardInactive: { opacity: 0.5 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    zoneTitle: { fontFamily: 'Tanker', fontSize: 18, color: '#fff', letterSpacing: 1 },
    coordBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    coordText: { fontFamily: 'Satoshi-Bold', fontSize: 10, color: colors.textDim },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusDot: { width: 5, height: 5, borderRadius: 2.5 },
    statusText: { fontFamily: 'Satoshi-Black', fontSize: 8, letterSpacing: 1 },
    
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 15 },
    
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    footerInfo: { flexDirection: 'row', gap: 20 },
    footerItem: { gap: 4 },
    footerLab: { fontFamily: 'Satoshi-Black', fontSize: 7, color: colors.textDim, letterSpacing: 1 },
    footerVal: { fontFamily: 'Satoshi-Black', fontSize: 11, color: '#fff' },
    actions: { flexDirection: 'row', gap: 10 },
    actionBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'center', alignItems: 'center', borderWidth: 1 },

    empty: { alignItems: 'center', marginTop: 60, gap: 15 },
    emptyText: { fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.textDim, letterSpacing: 2 },

    footer: { position: 'absolute', bottom: 30, left: 24, right: 24, height: 50, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.neonGreen },
    footerText: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, letterSpacing: 2 }
});

