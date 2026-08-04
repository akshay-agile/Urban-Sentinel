import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Must run once, before any notification is scheduled/received.
 *
 * Two things this fixes:
 *   1. Without setNotificationHandler, alerts don't show while the app
 *      is foregrounded — which would make iOS's entire delivery
 *      mechanism (foreground-only local notifications) silently invisible.
 *   2. Without an explicit Android notification channel, Android 8+
 *      (API 26+) won't reliably play a sound or show a heads-up banner —
 *      channels are mandatory for that behavior, not optional.
 *
 * IMPORTANT Android caveat: channel settings are cached by the OS once a
 * channel ID is first created on a device. If you already ran an earlier
 * build that created a 'default' channel without sound, this update
 * won't retroactively fix it on that device — uninstall and reinstall
 * the dev client (or manually clear the channel in Android's app
 * notification settings) to pick up the new config.
 */
export async function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Emergency Alerts',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#EF4444',
      bypassDnd: true,
    });
  }
}
