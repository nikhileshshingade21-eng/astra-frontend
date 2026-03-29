import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';

/**
 * getUniqueDeviceId
 * Returns a stable, hardware-linked unique identifier for the device.
 * Used for "One Student, One Phone" multi-device protection.
 */
export const getUniqueDeviceId = async () => {
    try {
        // DeviceInfo.getUniqueId() is consistent for the app/device
        return await DeviceInfo.getUniqueId();
    } catch (e) {
        console.error('Failed to get Device ID:', e);
        return 'UNKNOWN_DEVICE_ID';
    }
};
