/**
 * Urban Sentinel — Mobile App Entrypoint
 *
 * Session 6: full navigation + auth wired up. AuthProvider manages the
 * session (token in expo-secure-store); RootNavigator switches between
 * the logged-out (Login/Register) and logged-in (tab) experiences.
 */
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="light" />
    </AuthProvider>
  );
}
