import React, { useEffect } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import axios from 'axios';

// ASTRA V7 PRODUCTION: The current app version matching app.json
const CURRENT_VERSION = '1.2.1';
const API_BASE_URL = 'https://violet-toys-jump.loca.lt';

const VersionChecker = () => {
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/version`, {
            params: {
                platform: Platform.OS,
                currentVersion: CURRENT_VERSION
            }
        });

        const { latestVersion, updateAvailable, forceUpdate, downloadUrl, releaseNotes } = response.data;

        if (updateAvailable) {
          Alert.alert(
            forceUpdate ? '🚨 Mandatory Update Required' : '🚀 New Update Available',
            `A new version (${latestVersion}) of ASTRA is available.\n\nChanges:\n${releaseNotes}`,
            [
              {
                text: 'Update Now',
                onPress: () => Linking.openURL(downloadUrl)
              },
              !forceUpdate && {
                text: 'Later',
                style: 'cancel'
              }
            ].filter(Boolean),
            { cancelable: !forceUpdate }
          );
        }
      } catch (error) {
        console.log('[VersionChecker] Skip: No network or server down.');
      }
    };

    checkForUpdates();
  }, []);

  return null; // Silent background component
};

export default VersionChecker;
