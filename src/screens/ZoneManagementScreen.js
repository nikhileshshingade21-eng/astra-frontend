import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const colors = {
    bg0: '#0f172a', surf: 'rgba(255, 255, 255, 0.05)',
    hot: '#3b82f6', green: '#10b981', cyan: '#0ea5e9', border: 'rgba(255, 255, 255, 0.12)'
};

export default function ZoneManagementScreen({ route, navigation }) {
    const [zones, setZones] = useState([
        { id: '1', name: 'Main Campus Gate', lat: '17.5472', lng: '78.3821', radius: '1000m', active: true },
        { id: '2', name: 'CS Block (A-301)', lat: '17.5478', lng: '78.3825', radius: '20m', active: true },
        { id: '3', name: 'Admin Block', lat: '17.5470', lng: '78.3819', radius: '50m', active: false },
    ]);

    const toggleZone = (id) => {
        setZones(prev => prev.map(z => z.id === id ? { ...z, active: !z.active } : z));
        Alert.alert('Protocol Updated', 'Zone status synchronized with central hub.');
    };

    const deleteZone = (id) => {
        Alert.alert('Caution', 'Are you sure you want to deactivate this zone?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Deactivate', style: 'destructive', onPress: () => setZones(prev => prev.filter(z => z.id !== id)) }
        ]);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>GEO MANAGEMENT</Text>
                <Text style={styles.sub}>Configure campus geofences & room coordinates</Text>
            </View>

            <TouchableOpacity style={styles.addBtn}>
                <LinearGradient colors={[colors.cyan, '#0090ff']} style={styles.addGradient}>
                    <Ionicons name="add" size={24} color="#000" />
                    <Text style={styles.addBtnText}>ADD NEW ZONE</Text>
                </LinearGradient>
            </TouchableOpacity>

            <FlatList
                data={zones}
                contentContainerStyle={{ padding: 20 }}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={[styles.zoneCard, !item.active && { opacity: 0.5 }]}>
                        <View style={styles.zoneHeader}>
                            <View>
                                <Text style={styles.zoneName}>{item.name}</Text>
                                <Text style={styles.zoneCoords}>{item.lat}, {item.lng}</Text>
                            </View>
                            <View style={[styles.statusPill, { backgroundColor: item.active ? colors.green + '20' : 'rgba(255,255,255,0.05)' }]}>
                                <Text style={[styles.statusText, { color: item.active ? colors.green : 'rgba(255,255,255,0.3)' }]}>
                                    {item.active ? 'OPERATIONAL' : 'INACTIVE'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.zoneFooter}>
                            <View style={styles.radiusRow}>
                                <Ionicons name="radio-outline" size={14} color={colors.cyan} />
                                <Text style={styles.radiusText}>RADIUS: {item.radius}</Text>
                            </View>
                            <View style={styles.actionRow}>
                                <TouchableOpacity style={styles.iconBtn} onPress={() => toggleZone(item.id)}>
                                    <Ionicons name={item.active ? "pause-outline" : "play-outline"} size={20} color={colors.cyan} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.iconBtn} onPress={() => deleteZone(item.id)}>
                                    <Ionicons name="trash-outline" size={20} color={colors.hot} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            />

            <View style={styles.securityInfo}>
                <Ionicons name="lock-closed-outline" size={14} color="rgba(255,255,255,0.3)" />
                <Text style={styles.securityText}>ZONE OVERRIDE REQUIRES LEVEL 3 CLEARANCE</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg0 },
    header: { padding: 24, paddingTop: 60 },
    title: { fontFamily: 'Tanker', fontSize: 32, color: '#fff', letterSpacing: 1 },
    sub: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
    addBtn: { marginHorizontal: 24, height: 60, borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
    addGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    addBtnText: { fontFamily: 'Tanker', fontSize: 16, color: '#000', letterSpacing: 1 },
    zoneCard: { backgroundColor: colors.surf, borderRadius: 24, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
    zoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    zoneName: { fontFamily: 'Tanker', fontSize: 20, color: '#fff', letterSpacing: 1 },
    zoneCoords: { fontFamily: 'Satoshi', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
    statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    statusText: { fontFamily: 'Satoshi-Bold', fontSize: 9, letterSpacing: 1 },
    zoneFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 15 },
    radiusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    radiusText: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: colors.cyan, letterSpacing: 1 },
    actionRow: { flexDirection: 'row', gap: 15 },
    iconBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    securityInfo: { padding: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: 0.5 },
    securityText: { fontFamily: 'Satoshi-Bold', fontSize: 9, color: '#fff', letterSpacing: 1 }
});
