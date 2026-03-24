import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * getUniqueDeviceId
 * Returns a stable, hardware-linked unique identifier for the device.
 * Used for "One Student, One Phone" multi-device protection.
 */
export const getUniqueDeviceId = async () => {
    try {
        if (Platform.OS === 'android') {
            // Android ID is stable for the same app/signing key
            return Application.getAndroidId();
        } else if (Platform.OS === 'ios') {
            // iOS Identifier for Vendor
            return await Application.getIosIdForVendorAsync();
        }
        
        // Fallback for other platforms or failures
        return `anon_${Device.osBuildId || 'unknown'}`;
    } catch (e) {
        console.error('Failed to get Device ID:', e);
        return 'UNKNOWN_DEVICE_ID';
    }
};
