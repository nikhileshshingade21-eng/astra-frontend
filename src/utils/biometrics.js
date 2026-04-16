import ReactNativeBiometrics from 'react-native-biometrics';
import { Alert } from 'react-native';

const rnBiometrics = new ReactNativeBiometrics();

/**
 * Perform STRICT native biometric authentication (Face/Fingerprint).
 * No PIN/Pattern fallback as per user requirements.
 * 
 * @param {string} promptMessage Message shown in the biometric prompt
 * @returns {Promise<boolean>} Resolves to true if successful, false otherwise
 */
export const authenticateWithBiometrics = async (promptMessage = 'Authenticate to continue') => {
    try {
        const { available, error } = await rnBiometrics.isSensorAvailable();

        if (!available) {
            Alert.alert(
                'Biometrics Not Available',
                'Fingerprint or Face ID is required. Please set it up in your phone settings.'
            );
            return false;
        }

        // BIOMETRIC_STRONG only - Disable Device Credentials (PIN/Pattern/Password)
        const result = await rnBiometrics.simplePrompt({
            promptMessage: promptMessage,
            cancelButtonText: 'Cancel',
            fallbackPromptMessage: '', // iOS: Hides the "Enter Password" fallback button
            allowDeviceCredentials: false // Android: Forces BIOMETRIC_STRONG only. Falls back to default if unavailable
        });

        if (result.success) {
            return true;
        } else {
            console.warn('[Biometrics] Verification failed or cancelled');
            return false;
        }
    } catch (e) {
        console.error('[Biometrics] Enclave failure:', e);
        Alert.alert('Biometrics Error', 'Could not verify your identity. Please try again.');
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
