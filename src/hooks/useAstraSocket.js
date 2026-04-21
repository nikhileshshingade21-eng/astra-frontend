/**
 * ASTRA V4: useAstraSocket Hook
 * ===============================
 * Centralized socket + app lifecycle management for V4 event-driven architecture.
 *
 * Responsibilities:
 * - Establishes & manages Socket.IO connection to backend
 * - Emits APP_BACKGROUNDED when app goes to background
 * - Emits APP_RESUMED when app returns to foreground  
 * - Sends ACTIVITY_PING heartbeat every 60s while active
 * - Joins user's personal room for targeted notifications
 * - Handles LIVE_NOTIFICATION events
 * - Auto-reconnects on resume
 *
 * Usage:
 *   const { activeNotification, dismissNotification } = useAstraSocket(userId);
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import { API_BASE } from '../api/config';
import * as SecureStore from '../utils/storage';

const HEARTBEAT_INTERVAL = 60 * 1000; // 60 seconds

export function useAstraSocket(userId) {
    const socketRef = useRef(null);
    const heartbeatRef = useRef(null);
    const appStateRef = useRef(AppState.currentState);
    const [activeNotification, setActiveNotification] = useState(null);

    const dismissNotification = useCallback(() => {
        setActiveNotification(null);
    }, []);

    useEffect(() => {
        if (!userId) return;

        let socket = null;
        let isUnmounted = false;

        const initSocket = async () => {
            try {
                const token = await SecureStore.getItemAsync('token');
                
                socket = io(API_BASE, {
                    transports: ['websocket'],
                    query: { token: token || '' },
                    reconnection: true,
                    reconnectionAttempts: 10,
                    reconnectionDelay: 2000,
                });

                socketRef.current = socket;

                socket.on('connect', () => {
                    if (isUnmounted) return;
                    console.log('[ASTRA V4] Socket connected:', socket.id);
                    socket.emit('join_user', userId);

                    // Start heartbeat
                    startHeartbeat(socket);
                });

                // V4: Handle live notifications
                socket.on('LIVE_NOTIFICATION', (payload) => {
                    if (isUnmounted) return;
                    // Extract data from the formatted socket payload
                    const notifData = payload?.data || payload;
                    setActiveNotification(notifData);
                    setTimeout(() => {
                        if (!isUnmounted) setActiveNotification(null);
                    }, 6000);
                });

                // V4: Handle overdue alerts (show as notification)
                socket.on('OVERDUE_ALERT', (payload) => {
                    if (isUnmounted) return;
                    const alertData = payload?.data || payload;
                    setActiveNotification({
                        title: alertData.title || '👋 Check-in',
                        body: alertData.body || 'ASTRA hasn\'t seen you in a while.',
                        type: 'overdue_alert',
                        persona: alertData.persona,
                    });
                    setTimeout(() => {
                        if (!isUnmounted) setActiveNotification(null);
                    }, 8000);
                });

                socket.on('disconnect', (reason) => {
                    console.log('[ASTRA V4] Socket disconnected:', reason);
                    stopHeartbeat();
                });

                socket.on('connect_error', (err) => {
                    console.warn('[ASTRA V4] Socket connection error:', err.message);
                });

            } catch (err) {
                console.error('[ASTRA V4] Socket init failed:', err.message);
            }
        };

        // ─── Heartbeat (ACTIVITY_PING every 60s) ────────────────────────
        const startHeartbeat = (sock) => {
            stopHeartbeat(); // Clear any existing heartbeat
            heartbeatRef.current = setInterval(() => {
                if (sock?.connected) {
                    sock.emit('ACTIVITY_PING', { userId });
                }
            }, HEARTBEAT_INTERVAL);
        };

        const stopHeartbeat = () => {
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current);
                heartbeatRef.current = null;
            }
        };

        // ─── AppState Listener (Background / Foreground tracking) ───────
        const handleAppStateChange = (nextAppState) => {
            const sock = socketRef.current;
            
            if (appStateRef.current.match(/active/) && nextAppState.match(/inactive|background/)) {
                // App going to BACKGROUND
                console.log('[ASTRA V4] App → Background');
                if (sock?.connected) {
                    sock.emit('APP_BACKGROUNDED', { userId });
                }
                stopHeartbeat();
            }

            if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
                // App RESUMED from background
                console.log('[ASTRA V4] App → Resumed');
                if (sock?.connected) {
                    sock.emit('APP_RESUMED', { userId });
                    startHeartbeat(sock);
                } else if (sock) {
                    // Socket disconnected while backgrounded — force reconnect
                    sock.connect();
                }
            }

            appStateRef.current = nextAppState;
        };

        // Subscribe to AppState changes
        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        // Initialize socket
        initSocket();

        // ─── Cleanup ────────────────────────────────────────────────────
        return () => {
            isUnmounted = true;
            stopHeartbeat();
            appStateSubscription?.remove();
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [userId]);

    return {
        activeNotification,
        dismissNotification,
        getSocket: () => socketRef.current,
    };
}

export default useAstraSocket;
