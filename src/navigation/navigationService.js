import React from 'react';
import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * ─────────────────────────────────────────────────────────────
 *  ASTRA Navigation Service
 * ─────────────────────────────────────────────────────────────
 *  Global navigation ref that can be used OUTSIDE of React
 *  components. This is critical for:
 *    - Navigating when a notification is tapped
 *    - Navigating from background/headless tasks
 *    - Navigating from native modules
 *
 *  Usage from any file:
 *    import { navigationRef, navigate } from '../navigation/navigationService';
 *    navigate('Board');  // Opens NotificationCenterScreen
 * ─────────────────────────────────────────────────────────────
 */

export const navigationRef = createNavigationContainerRef();

/**
 * Navigate to a screen from anywhere (even outside React tree).
 * Safely queues navigation until the navigator is ready.
 */
export function navigate(name, params) {
    if (navigationRef.isReady()) {
        navigationRef.navigate(name, params);
    } else {
        // Queue navigation for when the navigator becomes ready
        const checkInterval = setInterval(() => {
            if (navigationRef.isReady()) {
                clearInterval(checkInterval);
                navigationRef.navigate(name, params);
            }
        }, 100);

        // Safety: stop trying after 5 seconds
        setTimeout(() => clearInterval(checkInterval), 5000);
    }
}

/**
 * Reset the navigation state (useful for auth flows)
 */
export function resetTo(name, params) {
    if (navigationRef.isReady()) {
        navigationRef.reset({
            index: 0,
            routes: [{ name, params }],
        });
    }
}
