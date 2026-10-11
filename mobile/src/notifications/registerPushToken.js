import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useEffect } from 'react';

import * as api from '../api/endpoints';

async function saveAndroidDeviceToken(token) {
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('The device did not return a valid FCM token.');
  }
  await api.updateMe({ push_token: token, platform: 'android' });
}

function hasAndroidFirebaseConfiguration() {
  return Boolean(Constants.expoConfig?.android?.googleServicesFile);
}

/** Refresh the authenticated Android account's native FCM token without prompting. */
export function useAndroidPushTokenRefresh(enabled) {
  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') return undefined;

    let active = true;
    let refreshing = false;

    if (!hasAndroidFirebaseConfiguration()) {
      console.warn('Android FCM token refresh skipped: Firebase configuration is unavailable.');
      return undefined;
    }

    const refreshToken = async () => {
      if (!active || refreshing) return;
      refreshing = true;
      try {
        const permission = await Notifications.getPermissionsAsync();
        if (!permission.granted) return;

        const tokenResponse = await Notifications.getDevicePushTokenAsync();
        if (!active) return;
        await saveAndroidDeviceToken(tokenResponse?.data);
        console.info('Android FCM token refreshed with the backend (token omitted).');
      } catch (err) {
        console.warn(
          'Android FCM token refresh failed:',
          err.response?.status || err.message || 'unknown error',
        );
      } finally {
        refreshing = false;
      }
    };

    const tokenSubscription = Notifications.addPushTokenListener(async (tokenResponse) => {
      if (!active) return;
      try {
        const permission = await Notifications.getPermissionsAsync();
        if (!active || !permission.granted) return;
        await saveAndroidDeviceToken(tokenResponse?.data);
        console.info('Rotated Android FCM token saved (token omitted).');
      } catch (err) {
        console.warn(
          'Rotated Android FCM token could not be saved:',
          err.response?.status || err.message || 'unknown error',
        );
      }
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshToken();
    });

    void refreshToken();
    return () => {
      active = false;
      tokenSubscription.remove();
      appStateSubscription.remove();
    };
  }, [enabled]);
}

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
    if (!hasAndroidFirebaseConfiguration()) {
      return { granted: true, error: 'Firebase is not configured in this Android build, so push registration is unavailable.' };
    }
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

    try {
      await saveAndroidDeviceToken(tokenResponse?.data);
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
