import * as SecureStore from './storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../api/config';

/**
 * fetchWithTimeout
 * A standardized fetch wrapper that implements a 90-second timeout 
 * and robust error handling for ASTRA v3.
 */
export const fetchWithTimeout = async (endpoint, options = {}) => {
    const { timeout = 90000, ...fetchOptions } = options;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
        
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
            headers: {
                'Content-Type': options.isMultipart ? undefined : 'application/json',
                ...fetchOptions.headers,
                'bypass-tunnel-reminder': 'true'
            }
        });
        
        clearTimeout(id);

        // Global 401 Handling: If the server rejects the token, we should probably clear it.
        if (response.status === 401) {
            console.warn(`[API_SEC_AUDIT] 401 Unauthorized at ${endpoint}. Clearing stale session.`);
            await SecureStore.deleteItemAsync('token').catch(() => {});
            // Note: Navigation must be handled by the calling screen or via a global event.
        }

        // Standardized data extraction with safety
        let data = null;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                const parsed = await response.json();
                // Contract System: Auto-unwrap global standardized payloads
                if (parsed && typeof parsed === 'object' && 'success' in parsed && 'data' in parsed && Object.keys(parsed).length <= 3) {
                    data = parsed.data !== null ? parsed.data : parsed;
                    response.apiMessage = parsed.message;
                    response.apiSuccess = parsed.success;
                    // Provide a raw reference just in case
                    response.rawContract = parsed; 
                } else {
                    data = parsed;
                }
            } catch (jsonErr) {
                console.warn('[API] Failed to parse JSON response');
            }
        } else {
            // Non-JSON response (e.g. error page HTML)
            const text = await response.text();
            data = { error: 'INTERNAL_SERVER_ERROR', message: 'The server returned an invalid response.', raw: text.slice(0, 100) };
        }

        // Attach data to response for easier handling
        response.data = data;
        return response;

    } catch (err) {
        clearTimeout(id);
        console.error('[API_LAYER_CRASH_PROTECT]:', err.message);
        
        if (err.name === 'AbortError') {
            throw new Error('NETWORK_TIMEOUT: Your connection was too slow. Please check your signal and try again.');
        }
        
        // Return a mock response object if the network call itself fails
        // to prevent screens from crashing on undefined responses.
        return {
            ok: false,
            status: 0,
            data: { error: 'CONNECTION_FAILURE', message: err.message || 'Could not connect to ASTRA Hub.' },
            json: async () => ({ error: 'CONNECTION_FAILURE' })
        };
    }
};

/**
 * fetchWithCache
 * Fetches data with a cache-first approach to improve Time to Interactive (TTI).
 * It will resolve with cached data immediately, and silently fetch fresh data.
 * Useful for Dashboard and Timetable endpoints.
 */
export const fetchWithCache = async (endpoint, options = {}, onCachedData) => {
    const cacheKey = `@astra_cache_${endpoint}`;
    
    // 1. Try to load from cache immediately
    try {
        const cachedStr = await AsyncStorage.getItem(cacheKey);
        if (cachedStr && onCachedData) {
            const cachedObj = JSON.parse(cachedStr);
            // Verify it hasn't expired (optional, defaulting to 2 hours here)
            if (Date.now() - cachedObj.timestamp < 7200000) {
                onCachedData({ ok: true, data: cachedObj.data, fromCache: true });
            }
        }
    } catch (e) {
        console.warn('Cache read error', e);
    }

    // 2. Perform network fetch
    const response = await fetchWithTimeout(endpoint, options);
    
    // 3. Update cache if successful AND has actual data (prevent cache poisoning from errors)
    if (response.ok && response.data) {
        const hasRealData = response.data.classes ? response.data.classes.length > 0 : true;
        if (hasRealData) {
            try {
                await AsyncStorage.setItem(cacheKey, JSON.stringify({
                    timestamp: Date.now(),
                    data: response.data
                }));
            } catch (e) {
                console.warn('Cache write error', e);
            }
        } else {
            // Wipe any stale cached empty result
            try { await AsyncStorage.removeItem(cacheKey); } catch(e) {}
        }
    }
    
    return response;
};
