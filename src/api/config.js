export const API_BASE = 'https://astra-backend-production-a16d.up.railway.app';

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
