import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
// --- GLOBALLY INTERCEPT FETCH TO BYPASS LOCALTUNNEL WARNINGS ---
const originalFetch = global.fetch;
global.fetch = (url, options = {}) => {
    if (typeof url === 'string' && (url.includes('loca.lt') || url.includes('ngrok'))) {
        const headers = options.headers || {};
        if (headers instanceof Headers) {
            headers.append('bypass-tunnel-reminder', 'true');
        } else {
            options.headers = { ...headers, 'bypass-tunnel-reminder': 'true' };
        }
    }
    return originalFetch(url, options);
};

registerRootComponent(App);
