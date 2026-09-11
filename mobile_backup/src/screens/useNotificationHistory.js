import { useCallback, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import * as api from '../api/endpoints';

/**
 * Fetches this user's notifications and enriches each with its incident's
 * type/severity, since Notification rows only store incident_id. Shared
 * by AlertsScreen and HistoryScreen so both stay consistent.
 */
export function useNotificationHistory() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const notifications = await api.getMyNotifications(user.id);
      const enriched = await Promise.all(
        notifications.map(async (n) => {
          try {
            const incident = await api.getIncidentById(n.incident_id);
            return { ...n, incident };
          } catch {
            return { ...n, incident: null };
          }
        })
      );
      setItems(enriched);
      setError('');
    } catch {
      setError("Couldn't load your alerts. Check your connection.");
    }
  }, [user]);

  return { items, error, load };
}
