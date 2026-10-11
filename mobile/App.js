/**
 * Urban Sentinel — Mobile App Entrypoint
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
