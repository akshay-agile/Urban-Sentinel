import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * Lives in its own file (not inside RootNavigator.js) specifically to
 * avoid a circular import: RootNavigator imports
 * useNotificationTapNavigation, which needs this ref — if this lived in
 * RootNavigator.js, that would import back from RootNavigator.js itself.
 */
export const navigationRef = createNavigationContainerRef();

// Fixes a real race condition: when the app is fully closed and someone
// taps a notification, the tap-handling code can run BEFORE
// NavigationContainer has finished mounting — navigationRef.isReady()
// is still false at that instant, so a direct .navigate() call silently
// does nothing, and the app just opens to the default Home screen. This
// queues the target and flushes it once the navigator actually becomes
// ready (see RootNavigator's onReady prop).
let pendingIncidentId = null;

export function navigateToIncident(incidentId) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('IncidentDetail', { incidentId });
  } else {
    pendingIncidentId = incidentId;
  }
}

export function flushPendingNavigation() {
  if (pendingIncidentId !== null && navigationRef.isReady()) {
    navigationRef.navigate('IncidentDetail', { incidentId: pendingIncidentId });
    pendingIncidentId = null;
  }
}
