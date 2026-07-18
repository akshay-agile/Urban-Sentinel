import { useEffect, useRef, useState } from 'react';

const HTTP_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const WS_URL = HTTP_BASE_URL.replace(/\/api\/v1\/?$/, '').replace(/^http/, 'ws') + '/ws';

const RECONNECT_DELAY_MS = 3000;

/**
 * Connects to the backend's live event feed (Session 8). Calls onMessage
 * for every event (sensor_reading, device_registered, incident_created,
 * incident_updated) — pages use this to refresh immediately instead of
 * waiting up to 10s for the next poll. Falls back gracefully: if the
 * socket is down, polling (already in place from Session 7) still keeps
 * everything eventually correct.
 */
export function useLiveSocket(onMessage) {
  const [isConnected, setIsConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    let socket;
    let reconnectTimer;
    let cancelled = false;

    function connect() {
      socket = new WebSocket(WS_URL);

      socket.onopen = () => setIsConnected(true);
      socket.onclose = () => {
        setIsConnected(false);
        if (!cancelled) {
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
      socket.onerror = () => socket.close();
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current?.(data);
        } catch {
          // ignore malformed messages
        }
      };
    }

    connect();
    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  return { isConnected };
}
