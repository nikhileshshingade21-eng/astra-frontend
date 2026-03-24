import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../api/config';
import { STUDENTS } from '../data/students';

const StudentDirectoryScreen = ({ navigation }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('All');
    const [selectedSection, setSelectedSection] = useState('All');
    const [liveData, setLiveData] = useState(STUDENTS);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                if (token) {
                    const res = await fetch(`${API_BASE}/api/admin/users`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const dbUsers = (data.users || []).filter(u => u.role === 'student').map(u => ({
                            id: u.roll_number?.toUpperCase() || `U${u.id}`,
                            name: u.name,
                            branch: u.programme?.split(' ')[0] || 'Unknown',
                            prog: u.programme || 'Core',
                            section: u.section || 'General',
                            att: 100,
                            status: 'perfect',
                            week: 12
                        }));

                        const merged = [...dbUsers];
                        const dbIds = new Set(dbUsers.map(u => u.id.toLowerCase()));
                        
                        // Only add mock students for the CS section if they aren't already in DB
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
            }
            setLoading(false);
        };
        fetchUsers();
    }, []);

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
            case 'perfect': return '#00ffcc';
            case 'present': return '#3399ff';
            case 'at-risk': return '#ff3366';
            default: return '#888';
        }
    };

    const renderStudentItem = ({ item }) => (
        <View style={style.studentCard}>
            <View style={[style.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
            <View style={style.studentInfo}>
                <Text style={style.studentName}>{item.name}</Text>
                <Text style={style.studentId}>{item.id} • {item.branch} • {item.section}</Text>
                <Text style={style.studentProgram}>{item.prog}</Text>
            </View>
            <View style={style.attendanceContainer}>
                <Text style={[style.attendanceText, { color: getStatusColor(item.status) }]}>{item.att}%</Text>
                <Text style={style.weekText}>Week {item.week}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={style.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#0f172a', '#1e293b']} style={style.header}>
                <View style={style.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={style.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={style.headerTitle}>Student Directory</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={style.searchContainer}>
                    <Ionicons name="search" size={20} color="#94a3b8" style={style.searchIcon} />
                    <TextInput
                        style={style.searchInput}
                        placeholder="Search name or ID..."
                        placeholderTextColor="#64748b"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <View style={style.filtersContainer}>
                    <View style={style.filterRow}>
                        <Text style={style.filterLabel}>Branch:</Text>
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={branches}
                            keyExtractor={item => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => setSelectedBranch(item)}
                                    style={[style.filterChip, selectedBranch === item && style.activeFilterChip]}
                                >
                                    <Text style={[style.filterChipText, selectedBranch === item && style.activeFilterChipText]}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                    <View style={[style.filterRow, { marginTop: 10 }]}>
                        <Text style={style.filterLabel}>Section:</Text>
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={sections}
                            keyExtractor={item => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => setSelectedSection(item)}
                                    style={[style.filterChip, selectedSection === item && style.activeFilterChip]}
                                >
                                    <Text style={[style.filterChipText, selectedSection === item && style.activeFilterChipText]}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </LinearGradient>

            {loading ? (
                <View style={[style.emptyContainer, { flex: 1, justifyContent: 'center' }]}>
                    <ActivityIndicator size="large" color="#3399ff" />
                </View>
            ) : (
                <FlatList
                    data={filteredStudents}
                    keyExtractor={item => item.id}
                    renderItem={renderStudentItem}
                    contentContainerStyle={style.listContent}
                    ListHeaderComponent={
                        <View style={style.listHeader}>
                            <Text style={style.listHeaderTitle}>Total Students: {filteredStudents.length}</Text>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={style.emptyContainer}>
                            <Ionicons name="people-outline" size={60} color="#334155" />
                            <Text style={style.emptyText}>No students found in this protocol</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const style = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        padding: 20,
        paddingTop: 60,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    headerTitle: {
        fontFamily: 'Tanker',
        fontSize: 24,
        color: '#fff',
        letterSpacing: 1,
    },
    backButton: {
        padding: 0,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        height: 45,
        fontSize: 14,
        fontFamily: 'Satoshi-Bold',
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterLabel: {
        color: 'rgba(255,255,255,0.4)',
        marginRight: 10,
        fontSize: 10,
        fontFamily: 'Satoshi-Bold',
        letterSpacing: 1,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginRight: 8,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    activeFilterChip: {
        backgroundColor: 'rgba(0, 210, 255, 0.15)',
        borderColor: '#0ea5e9',
    },
    filterChipText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontFamily: 'Satoshi-Bold',
    },
    activeFilterChipText: {
        color: '#0ea5e9',
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    studentCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    statusIndicator: {
        width: 3,
        height: '80%',
        borderRadius: 2,
        marginRight: 12,
    },
    studentInfo: {
        flex: 1,
    },
    studentName: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 15,
        color: '#fff',
        marginBottom: 4,
    },
    studentId: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        marginBottom: 2,
    },
    studentProgram: {
        fontFamily: 'Satoshi',
        fontSize: 10,
        color: 'rgba(255,255,255,0.3)',
    },
    attendanceContainer: {
        alignItems: 'flex-end',
    },
    attendanceText: {
        fontFamily: 'Tanker',
        fontSize: 18,
    },
    weekText: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 9,
        color: 'rgba(255,255,255,0.3)',
        marginTop: 2,
        letterSpacing: 0.5,
    },
    listHeader: {
        marginBottom: 15,
    },
    listHeaderTitle: {
        fontFamily: 'Satoshi-Bold',
        fontSize: 10,
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontFamily: 'Satoshi-Bold',
        color: 'rgba(255,255,255,0.3)',
        fontSize: 13,
        marginTop: 20,
    },
});

export default StudentDirectoryScreen;
