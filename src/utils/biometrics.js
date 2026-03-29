import ReactNativeBiometrics from 'react-native-biometrics';
import { Alert } from 'react-native';

const rnBiometrics = new ReactNativeBiometrics();

/**
 * Perform native biometric authentication (Face/Fingerprint).
 * No PIN/Pattern fallback as per user requirements.
 * 
 * @param {string} promptMessage Message shown in the biometric prompt
 * @returns {Promise<boolean>} Resolves to true if successful, false otherwise
 */
export const authenticateWithBiometrics = async (promptMessage = 'Authenticate to continue') => {
    try {
        const { available, biometryType, error } = await rnBiometrics.isSensorAvailable();

        if (!available) {
            Alert.alert(
                'HARDWARE_ERROR',
                `Biometric authentication is not available on this device: ${error || 'Sensor offline'}`
            );
            return false;
        }

        const result = await rnBiometrics.simplePrompt({
            promptMessage: promptMessage,
            cancelButtonText: 'ABORT_PROTOCOL',
        });

        if (result.success) {
            return true;
        } else {
            // User cancelled or authentication failed multiple times
            return false;
        }
    } catch (e) {
        console.error('[Biometrics] Handshake failure:', e);
        Alert.alert('ENCLAVE_FAILURE', 'Could not establish secure biometric handshake.');
        return false;
    }
};

/**
 * Check if biometrics are available on the device.
 * @returns {Promise<boolean>}
 */
export const isBiometricsAvailable = async () => {
    const { available } = await rnBiometrics.isSensorAvailable();
    return available;
};
