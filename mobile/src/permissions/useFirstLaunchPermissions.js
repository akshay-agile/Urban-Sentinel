import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

import * as api from '../api/endpoints';
import { registerForPushNotifications } from '../notifications/registerPushToken';

const PERMISSION_PROMPT_PREFIX = 'first_permission_prompt_v1';

function promptKey(userId, permission) {
  return `${PERMISSION_PROMPT_PREFIX}_${userId}_${permission}`;
}

function showRationale(title, message) {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Continue', onPress: () => resolve(true) },
    ], { cancelable: false });
  });
}

async function saveCurrentLocation(userId) {
  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await api.updateMe({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
    console.info(`Foreground location saved for account #${userId}.`);
  } catch (error) {
    console.warn('Location permission is granted, but current location could not be saved:', error.message || 'unknown error');
  }
}

async function requestOnce(userId, permission, getPermission, requestPermission, rationale) {
  const key = promptKey(userId, permission);
  if (await SecureStore.getItemAsync(key)) return false;

  const current = await getPermission();
  if (current.granted) {
    await SecureStore.setItemAsync(key, 'done');
    return true;
  }

  if (current.status === 'denied' && current.canAskAgain === false) {
    await SecureStore.setItemAsync(key, 'done');
    console.info(`${permission} permission is blocked by the OS; user can enable it in device settings.`);
    return false;
  }

  const accepted = await showRationale(rationale.title, rationale.message);
  // Remember both acceptance and “Not now” so login/app restarts never
  // repeatedly interrupt the user. Settings remains available later.
  await SecureStore.setItemAsync(key, 'done');
  if (!accepted) return false;

  const result = await requestPermission();
  return Boolean(result.granted || result.status === 'granted');
}

/** Ask once after authentication, with an in-app explanation before each OS prompt. */
export function useFirstLaunchPermissions(user) {
  useEffect(() => {
    if (!user?.id) return undefined;
    let active = true;

    const run = async () => {
      try {
        const locationGranted = await requestOnce(
          user.id,
          'location',
          Location.getForegroundPermissionsAsync,
          Location.requestForegroundPermissionsAsync,
          {
            title: 'Use your location?',
            message: 'Urban Sentinel uses foreground location to compare nearby incident reports with your area and to target local alerts. If you continue, your current coordinates will be saved to your account. Location is only accessed while using the app.',
          },
        );
        if (active && locationGranted) {
          await saveCurrentLocation(user.id);
        }

        const notificationsGranted = await requestOnce(
          user.id,
          'notifications',
          Notifications.getPermissionsAsync,
          Notifications.requestPermissionsAsync,
          {
            title: 'Allow safety notifications?',
            message: 'Urban Sentinel can show incident alerts on this device. Android push delivery also requires a configured native Firebase build and a registered device token.',
          },
        );
        if (active && notificationsGranted) {
          const result = await registerForPushNotifications();
          if (result.error) console.warn('Notification permission is allowed, but registration is incomplete:', result.error);
        }
      } catch (error) {
        console.warn('First-launch permission setup did not complete:', error.message || 'unknown error');
      }
    };

    void run();
    return () => { active = false; };
  }, [user?.id]);
}
