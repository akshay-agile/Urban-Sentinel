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
      {/* dark icons/text — status bar sits on the light background now */}
      <StatusBar style="dark" />
    </AuthProvider>
  );
}
