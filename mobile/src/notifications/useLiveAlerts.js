import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const WS_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '').replace(/^http/, 'ws') + '/ws';
const RECONNECT_DELAY_MS = 3000;

/**
 * Listens to the backend's live event feed (Session 8) and fires a local
 * notification whenever a notification_created event names this user.
 *
 * This is the ENTIRE iOS delivery mechanism (foreground-only, per the
 * Session 6/10 decision) — there is no APNs/remote push involved at all.
 * It also gives Android a near-instant experience while the app happens
 * to already be open; Android's actual background/closed-app delivery
 * comes independently from real FCM push (Session 10 backend), not this.
 *
 * Only connects while logged in; disconnects on logout.
 */
export function useLiveAlerts() {
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return undefined;

    let reconnectTimer;
    let cancelled = false;

    function connect() {
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return; // ignore malformed messages
        }

        if (data.type === 'notification_created' && data.user_id === user.id) {
          Notifications.scheduleNotificationAsync({
            content: {
              title: data.title || 'Urban Sentinel Alert',
              body: data.body || 'An emergency has been reported near you.',
              data: { incidentId: data.incident_id },
            },
            trigger: null, // fire immediately
          });
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
      socketRef.current?.close();
    };
  }, [user]);
}
