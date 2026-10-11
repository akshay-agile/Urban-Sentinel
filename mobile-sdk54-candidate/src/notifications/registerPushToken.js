import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import * as api from '../api/endpoints';

/**
 * Requests notification permission and, on Android, registers the
 * device's real FCM token with the backend (which talks to Firebase
 * directly via firebase-admin — so we need the native device token, NOT
 * Expo's own push token service).
 *
 * iOS deliberately does not fetch a push token at all — per the Session
 * 6/10 decision, iOS is foreground-only local notifications, triggered by
 * the app's own WebSocket connection (see useLiveAlerts.js), which needs
 * no APNs credentials and therefore no Apple Developer Program enrollment.
 *
 * Returns { granted: boolean, error?: string } so the caller can show
 * useful feedback (e.g. the common case: running in plain Expo Go
 * instead of a development build, where getDevicePushTokenAsync throws).
 */
export async function registerForPushNotifications() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return { granted: false, error: 'Notification permission denied.' };
  }

  if (Platform.OS === 'android') {
    let tokenResponse;
    try {
      tokenResponse = await Notifications.getDevicePushTokenAsync();
    } catch (err) {
      return {
        granted: true,
        error:
          'Could not get a push token. This usually means Expo Go is in use; background push requires a development build.',
      };
    }

    const token = tokenResponse?.data;
    if (typeof token !== 'string' || token.length === 0) {
      return { granted: true, error: 'The device did not return a valid FCM token.' };
    }

    try {
      await api.updateMe({ push_token: token, platform: 'android' });
    } catch (err) {
      console.error('Push token registration failed:', err.response?.status || err.message);
      return {
        granted: true,
        error: 'The device token was obtained, but the server could not save it. Please try again.',
      };
    }
  } else {
    // iOS: no token to fetch. Just tell the backend the platform so the
    // Notification Engine picks the "local" channel for this user.
    await api.updateMe({ platform: 'ios' });
  }

  return { granted: true };
}
