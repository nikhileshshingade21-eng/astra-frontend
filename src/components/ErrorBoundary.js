import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('CRITICAL_UI_CRASH:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Ionicons name="alert-circle" size={80} color="#ff3d71" />
                    <Text style={styles.title}>Something Went Wrong</Text>
                    <Text style={styles.subtitle}>The app ran into an unexpected error.</Text>
                    <Text style={styles.errorText}>{this.state.error?.toString()}</Text>
                    <TouchableOpacity 
                        style={styles.btn} 
                        onPress={() => this.setState({ hasError: false })}
                    >
                        <Text style={styles.btnText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center', padding: 40 },
    title: { fontFamily: 'Tanker', fontSize: 32, color: '#fff', marginTop: 20 },
    subtitle: { fontFamily: 'Satoshi-Bold', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 10, textAlign: 'center' },
    errorText: { fontFamily: 'Satoshi', fontSize: 10, color: '#ff3d71', marginTop: 20, textAlign: 'center', opacity: 0.8 },
    btn: { marginTop: 40, height: 50, paddingHorizontal: 30, borderRadius: 15, backgroundColor: '#00f2ff', justifyContent: 'center', alignItems: 'center' },
    btnText: { fontFamily: 'Tanker', fontSize: 14, color: '#fff' }
});

export default ErrorBoundary;
