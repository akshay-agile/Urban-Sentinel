import { useEffect, useRef } from 'react';

import { API_BASE_URL } from '../config';

const WS_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '').replace(/^http/, 'ws') + '/ws';
const RECONNECT_DELAY_MS = 3000;

/**
 * Generic live-event subscription — any screen can call this to react
 * instantly to backend events (incident_created, incident_updated, etc.)
 * instead of only refreshing when the screen regains focus.
 *
 * This is separate from notifications/useLiveAlerts.js, which has a
 * narrower job (fire a local notification when an event names the
 * current user) and lives once at the root. Multiple simultaneous
 * WebSocket connections from one app is fine at this scale — the
 * dashboard already does the same thing per-page.
 */
export function useLiveSocket(onMessage) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    let socket;
    let reconnectTimer;
    let cancelled = false;

    function connect() {
      socket = new WebSocket(WS_URL);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current?.(data);
        } catch {
          // ignore malformed messages
        }
      };
      socket.onclose = () => {
        if (!cancelled) reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };
      socket.onerror = () => socket.close();
    }

    connect();
    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);
}
