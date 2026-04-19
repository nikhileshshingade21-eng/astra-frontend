import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    Platform,
    UIManager,
    Dimensions,
    Alert,
    ScrollView
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
// import { BlurView } from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as SecureStore from '../utils/storage';
import { API_BASE } from '../api/config';
import { fetchWithTimeout } from '../utils/api';
import { STUDENTS } from '../data/students';

const { width } = Dimensions.get('window');

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

const StudentDirectoryScreen = ({ navigation }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('All');
    const [selectedSection, setSelectedSection] = useState('All');
    const [liveData, setLiveData] = useState(STUDENTS);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    const init = useCallback(async () => {
        try {
            const userStr = await SecureStore.getItemAsync('user');
            if (userStr) setCurrentUser(JSON.parse(userStr));
            await fetchUsers();
        } catch (e) {
            console.log('Init error:', e);
        }
    }, [fetchUsers]);

    const fetchUsers = useCallback(async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            if (token) {
                const res = await fetchWithTimeout(`/api/admin/users`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok && res.data) {
                    const userList = Array.isArray(res.data) ? res.data : (res.data.users || []);
                    const dbUsers = userList.filter(u => u.role === 'student').map(u => ({
                        id: u.roll_number?.toUpperCase() || `U${u.id}`,
                        name: u.name,
                        branch: u.programme?.split(' ')[0] || 'Unknown',
                        prog: u.programme || 'Core',
                        section: u.section || 'General',
                        att: u.attendance_percentage || 100,
                        status: u.attendance_percentage < 75 ? 'at-risk' : 'perfect',
                        week: 12
                    }));
                    const merged = [...dbUsers];
                    const dbIds = new Set(dbUsers.map(u => u.id.toLowerCase()));
                    for (const s of STUDENTS) {
                        if (!dbIds.has(s.id.toLowerCase()) && s.section === 'CS') {
                            merged.push(s);
                        }
                    }
                    setLiveData(merged);
                }
            }
        } catch (e) {
            console.log('Error fetching directory:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        init();
    }, [init]);

    const resetDeviceBinding = async (rollNumber) => {
        Alert.alert(
            'Reset Device',
            `Are you sure you want to clear device binding for ${rollNumber}? The student will need to re-register.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'RESET',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const token = await SecureStore.getItemAsync('token');
                            const res = await fetchWithTimeout(`/api/admin/reset-device`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({ rollNumber })
                            });
                            if (res.ok) {
                                Alert.alert('SUCCESS', `Binding for ${rollNumber} has been cleared.`);
                            } else {
                                Alert.alert('ERROR', res.data?.error || 'Reset failed.');
                            }
                        } catch (err) {
                            Alert.alert('Connection Error', err.message);
                        }
                    }
                }
            ]
        );
    };

    const branches = useMemo(() => ['All', ...new Set(liveData.map(s => s.branch))], [liveData]);
    const sections = useMemo(() => ['All', ...new Set(liveData.map(s => s.section))], [liveData]);

    const filteredStudents = useMemo(() => {
        return liveData.filter(student => {
            const matchSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                student.id.toLowerCase().includes(searchQuery.toLowerCase());
            const matchBranch = selectedBranch === 'All' || student.branch === selectedBranch;
            const matchSection = selectedSection === 'All' || student.section === selectedSection;
            return matchSearch && matchBranch && matchSection;
        });
    }, [searchQuery, selectedBranch, selectedSection, liveData]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'perfect': return colors.neonGreen;
            case 'present': return colors.neonBlue;
            case 'at-risk': return colors.hot;
            default: return colors.textDim;
        }
    };

    const renderStudentItem = ({ item }) => (
        <View blurType="dark" blurAmount={3} style={style.studentCard}>
            <View style={[style.statusStrip, { backgroundColor: getStatusColor(item.status) }]} />
            <View style={style.studentInfo}>
                <Text style={style.studentName}>{item.name.toUpperCase()}</Text>
                <Text style={style.studentId}>{item.id} • {item.branch}_{item.section}</Text>
                <Text style={style.studentProgram}>{item.prog}</Text>
            </View>
            <View style={style.attendanceContainer}>
                <Text style={[style.attendanceText, { color: getStatusColor(item.status) }]}>{item.att}%</Text>
                <Text style={style.weekText}>Week 12</Text>
                
                {(currentUser?.role === 'admin' || currentUser?.role === 'faculty') && (
                    <TouchableOpacity 
                        style={style.resetBtn} 
                        onPress={() => resetDeviceBinding(item.id)}
                    >
                        <Ionicons name="refresh-circle" size={24} color={colors.hot} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <View style={style.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />
            
            <View style={style.header}>
                <View style={style.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={style.backButton}>
                        <Ionicons name="chevron-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={style.headerTitle}>Students</Text>
                    <View style={style.totalBadge}>
                        <Text style={style.totalVal}>{filteredStudents.length}</Text>
                        <Text style={style.totalLab}>TOTAL</Text>
                    </View>
                </View>

                <View blurType="dark" blurAmount={8} style={style.searchBox}>
                    <Ionicons name="search-outline" size={18} color={colors.neonBlue} style={style.searchIcon} />
                    <TextInput
                        style={style.searchInput}
                        placeholder="Search by name or roll number..."
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <View style={style.filtersScrollContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={style.filterRow}>
                        {branches.map(item => (
                            <TouchableOpacity
                                key={item}
                                onPress={() => {
                                    setSelectedBranch(item);
                                }}
                                style={[style.filterChip, selectedBranch === item && { borderColor: colors.neonBlue, backgroundColor: 'rgba(0, 242, 255, 0.1)' }]}
                            >
                                <Text style={[style.filterChipText, selectedBranch === item && { color: colors.neonBlue }]}>{item.toUpperCase()}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[style.filterRow, { marginTop: 10 }]}>
                        {sections.map(item => (
                            <TouchableOpacity
                                key={item}
                                onPress={() => {
                                    setSelectedSection(item);
                                }}
                                style={[style.filterChip, selectedSection === item && { borderColor: colors.neonPurple, backgroundColor: 'rgba(191, 0, 255, 0.1)' }]}
                            >
                                <Text style={[style.filterChipText, selectedSection === item && { color: colors.neonPurple }]}>{item.toUpperCase()}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>

            {loading ? (
                <View style={style.loader}>
                    <ActivityIndicator size="large" color={colors.neonBlue} />
                </View>
            ) : (
                <FlatList
                    data={filteredStudents}
                    keyExtractor={item => item.id}
                    renderItem={renderStudentItem}
                    contentContainerStyle={style.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={style.emptyContainer}>
                            <Ionicons name="alert-circle-outline" size={48} color={colors.textDim} />
                            <Text style={style.emptyText}>No students found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const style = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 25 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
    headerTitle: { fontFamily: 'Tanker', fontSize: 28, color: '#fff', letterSpacing: 1 },
    backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    totalBadge: { alignItems: 'flex-end' },
    totalVal: { fontFamily: 'Tanker', fontSize: 20, color: colors.neonBlue },
    totalLab: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, letterSpacing: 1 },

    searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    searchIcon: { marginRight: 12 },
    searchInput: { flex: 1, color: '#fff', fontFamily: 'Satoshi-Bold', fontSize: 13 },

    filtersScrollContainer: { marginTop: 20 },
    filterRow: { gap: 10 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: colors.border },
    filterChipText: { fontFamily: 'Satoshi-Black', fontSize: 9, color: colors.textDim, letterSpacing: 1 },

    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingHorizontal: 24, paddingBottom: 100 },
    studentCard: { flexDirection: 'row', borderRadius: 20, padding: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    statusStrip: { width: 3, height: '60%', borderRadius: 3, marginRight: 15 },
    studentInfo: { flex: 1 },
    studentName: { fontFamily: 'Tanker', fontSize: 16, color: '#fff', letterSpacing: 0.5 },
    studentId: { fontFamily: 'Satoshi-Bold', fontSize: 11, color: colors.textDim, marginTop: 4 },
    studentProgram: { fontFamily: 'Satoshi-Medium', fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 2 },
    attendanceContainer: { alignItems: 'flex-end' },
    attendanceText: { fontFamily: 'Tanker', fontSize: 20 },
    weekText: { fontFamily: 'Satoshi-Black', fontSize: 8, color: colors.textDim, marginTop: 4 },

    emptyContainer: { padding: 60, alignItems: 'center', gap: 15 },
    emptyText: { fontFamily: 'Satoshi-Black', fontSize: 10, color: colors.textDim, letterSpacing: 2 },
    resetBtn: { marginTop: 10, padding: 4 }
});

export default StudentDirectoryScreen;

