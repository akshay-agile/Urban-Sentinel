import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useAndroidPushTokenRefresh } from '../notifications/registerPushToken';
import { useLiveAlerts } from '../notifications/useLiveAlerts';
import { useFirstLaunchPermissions } from '../permissions/useFirstLaunchPermissions';
import { useNotificationTapNavigation } from '../notifications/useNotificationTapNavigation';
import { colors } from '../theme';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import { navigationRef, flushPendingNavigation } from './navigationRef';
import IncidentDetailScreen from '../screens/IncidentDetailScreen';

const RootStack = createNativeStackNavigator();
const lightNavigationTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.card,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.danger,
  },
};

export default function RootNavigator() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Session 10: this is what actually delivers alerts on iOS, and gives
  // Android a foreground bonus — active for the whole logged-in session,
  // regardless of which tab is showing.
  useLiveAlerts();
  useAndroidPushTokenRefresh(isAuthenticated);
  useFirstLaunchPermissions(isAuthenticated ? user : null);

  // Tapping a notification (foreground, background, or cold-start) opens
  // straight to that incident's detail screen, wherever the user
  // currently is in the app.
  useNotificationTapNavigation();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={flushPendingNavigation} theme={lightNavigationTheme}>
      {isAuthenticated ? (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Main" component={MainTabs} />
          <RootStack.Screen
            name="IncidentDetail"
            component={IncidentDetailScreen}
            options={{
              headerShown: true,
              title: 'Incident Details',
              presentation: 'modal',
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.textPrimary,
              headerTitleStyle: { fontWeight: '700' },
              headerShadowVisible: false,
              headerBackTitleVisible: false,
            }}
          />
        </RootStack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
});
