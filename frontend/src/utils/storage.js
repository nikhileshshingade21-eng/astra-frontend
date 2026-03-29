import * as Keychain from 'react-native-keychain';

/**
 * A wrapper for react-native-keychain that mimics expo-secure-store API.
 */
export const setItemAsync = async (key, value) => {
  try {
    await Keychain.setGenericPassword(key, value, { service: key });
  } catch (error) {
    console.error(`Error setting item for key ${key}:`, error);
    throw error;
  }
};

export const getItemAsync = async (key) => {
  try {
    const credentials = await Keychain.getGenericPassword({ service: key });
    if (credentials) {
      return credentials.password;
    }
    return null;
  } catch (error) {
    console.error(`Error getting item for key ${key}:`, error);
    return null;
  }
};

export const deleteItemAsync = async (key) => {
  try {
    await Keychain.resetGenericPassword({ service: key });
  } catch (error) {
    console.error(`Error deleting item for key ${key}:`, error);
    throw error;
  }
};
