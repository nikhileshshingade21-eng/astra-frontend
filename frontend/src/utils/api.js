import * as SecureStore from './storage';
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
                data = await response.json();
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
