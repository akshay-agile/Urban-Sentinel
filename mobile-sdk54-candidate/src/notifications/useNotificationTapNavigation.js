import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

import { navigateToIncident } from '../navigation/navigationRef';

function handleResponse(response) {
  const incidentId = response?.notification?.request?.content?.data?.incidentId;
  if (incidentId) navigateToIncident(incidentId);
}

/**
 * Covers three cases someone might tap a notification:
 *   1. App already open (foreground or backgrounded but alive) — the
 *      response listener fires immediately, navigator is already ready.
 *   2. App was fully closed and the tap launches it — there's a real
 *      race here: this code can run before NavigationContainer finishes
 *      mounting, so navigateToIncident() queues the target instead of
 *      calling .navigate() directly; RootNavigator's onReady prop
 *      flushes it once the navigator is actually ready.
 */
export function useNotificationTapNavigation() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });

    return () => subscription.remove();
  }, []);
}
