import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
const shouldScheduleLocalNotification = require('./shouldScheduleLocalNotification');

const WS_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '').replace(/^http/, 'ws') + '/ws';
const RECONNECT_DELAY_MS = 3000;

/**
 * Listens to the backend's live event feed and fires a local notification
 * only for the local channel addressed to this user. Android's fcm channel
 * is displayed by FCM/Expo and must not also be scheduled locally.
 *
 * This is the ENTIRE iOS delivery mechanism (foreground-only, per the
 * Session 6/10 decision) — there is no APNs/remote push involved at all.
 * Android foreground and background delivery both use its FCM channel.
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

      socket.onopen = () => console.info('Notification event socket connected.');

      socket.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return; // ignore malformed messages
        }

        if (data?.type !== 'notification_created' || data?.user_id !== user.id) return;

        if (data.channel === 'fcm') {
          console.info('FCM notification event received over WebSocket; no local notification scheduled.');
          return;
        }

        if (shouldScheduleLocalNotification(data, user.id)) {
          Notifications.scheduleNotificationAsync({
            content: {
              title: data.title || 'Urban Sentinel Alert',
              body: data.body || 'An emergency has been reported near you.',
              // Explicit sound — without this, some Android/iOS versions
              // deliver silently even with the channel/handler configured.
              data: { incidentId: data.incident_id },
            },
            trigger: null, // fire immediately
          }).then((notificationId) => {
            console.info('Local notification scheduled by the app:', notificationId);
          }).catch((error) => {
            console.warn('Could not schedule local notification:', error?.message || 'unknown error');
          });
        }
      };

      socket.onclose = () => {
        console.warn('Notification event socket closed.');
        if (!cancelled) reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };
      socket.onerror = () => {
        console.warn('Notification event socket error.');
        socket.close();
      };
    }

    connect();
    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      socketRef.current?.close();
    };
  }, [user]);
}
