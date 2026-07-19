import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useLiveAlerts } from '../notifications/useLiveAlerts';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  // Session 10: this is what actually delivers alerts on iOS, and gives
  // Android a foreground bonus — active for the whole logged-in session,
  // regardless of which tab is showing.
  useLiveAlerts();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#dc2626" />
      </View>
    );
  }

  return <NavigationContainer>{isAuthenticated ? <MainTabs /> : <AuthStack />}</NavigationContainer>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
});
