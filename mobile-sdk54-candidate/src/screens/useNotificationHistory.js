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
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
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
      setLastUpdated(new Date());
      setHasLoaded(true);
    } catch {
      setError("Couldn't load your alerts. Check your connection.");
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return { items, error, isLoading, isStale: Boolean(error && lastUpdated), lastUpdated, hasLoaded, load };
}
