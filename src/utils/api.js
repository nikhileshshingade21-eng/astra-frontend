import { API_BASE } from '../api/config';

/**
 * fetchWithTimeout
 * A standardized fetch wrapper that implements a 90-second timeout 
 * to handle slow campus signals and large data payloads.
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
                ...fetchOptions.headers,
                'bypass-tunnel-reminder': 'true'
            }
        });
        
        clearTimeout(id);
        return response;
    } catch (err) {
        clearTimeout(id);
        if (err.name === 'AbortError') {
            throw new Error('NETWORK_TIMEOUT: Your connection was too slow. Please check your signal and try again.');
        }
        throw err;
    }
};
