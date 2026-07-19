import * as Notifications from 'expo-notifications';

/**
 * Must run once, before any notification is scheduled/received. Without
 * this, expo-notifications defaults to NOT showing an alert while the
 * app is in the foreground — which would make iOS's entire delivery
 * mechanism (foreground-only local notifications, per the Session 6/10
 * decision) silently invisible.
 */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
