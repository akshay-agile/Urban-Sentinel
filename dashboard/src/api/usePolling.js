import { useCallback, useEffect, useState } from 'react';

/**
 * Polls a fetcher function on an interval. This is intentionally simple
 * polling, not a websocket push — real-time push is more naturally part
 * of Session 8 (Backend Integration) once the ingestion pipeline is fully
 * wired end-to-end. Polling every few seconds is enough to feel "live"
 * for a dashboard.
 */
export function usePolling(fetcher, intervalMs = 5000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await fetcher();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    load();
    const id = setInterval(load, intervalMs);
    return () => clearInterval(id);
  }, [load, intervalMs]);

  return { data, error, isLoading, refresh: load };
}
