/**
 * Urban Sentinel — Mobile App Entrypoint
 */
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { configureNotificationHandler } from './src/notifications/configureNotificationHandler';
import { colors } from './src/theme';

configureNotificationHandler();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style="dark" backgroundColor={colors.background} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
