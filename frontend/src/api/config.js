// ASTRA Frontend Configuration
// Production API URL (Railway Deployed Backend)
export const API_BASE = 'https://astra-backend-production-e996.up.railway.app';

// AI Engine URL (for direct AI calls if needed)
export const AI_ENGINE_URL = 'https://astra-ai-engine.up.railway.app';

// App Version
export const APP_VERSION = '3.2.3';

// WebSocket URL (for real-time features)
export const WS_URL = API_BASE.replace('https://', 'wss://').replace('http://', 'ws://');

export const getTenantConfig = async () => {
    try {
        const response = await fetch(`${API_BASE}/api/tenant/config`);
        const json = await response.json();
        return json.success ? json.data : null;
    } catch (e) {
        console.error('Tenant fetch failed:', e);
        return null;
    }
};

export const getAppHealth = async () => {
    try {
        const response = await fetch(`${API_BASE}/api/health`);
        return await response.json();
    } catch (e) {
        console.error('Health check failed:', e);
        return null;
    }
};
