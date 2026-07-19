/**
 * Urban Sentinel — Mobile App Entrypoint
 *
 * Session 10: notification handler configured once at startup, so
 * foreground alerts actually display (see notifications/configureNotificationHandler.js).
 */
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { configureNotificationHandler } from './src/notifications/configureNotificationHandler';

configureNotificationHandler();

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="light" />
    </AuthProvider>
  );
}
