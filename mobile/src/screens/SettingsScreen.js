import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

import { PageHeader, Screen } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';

export default function SettingsScreen() {
  const { user } = useAuth();
  const [notificationStatus, setNotificationStatus] = useState('Checking…');
  const [locationStatus, setLocationStatus] = useState('Checking…');
  const [error, setError] = useState('');

  const loadPermissions = useCallback(async () => {
    setError('');
    try {
      const [notifications, location] = await Promise.all([
        Notifications.getPermissionsAsync(),
        Location.getForegroundPermissionsAsync(),
      ]);
      setNotificationStatus(permissionLabel(notifications));
      setLocationStatus(permissionLabel(location));
    } catch {
      setError('Could not read device permissions. Open system settings to review them.');
    }
  }, []);

  useFocusEffect(useCallback(() => { loadPermissions(); }, [loadPermissions]));

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader eyebrow="Device access" title="Settings" subtitle="Review operating-system permissions used by Urban Sentinel."/>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PermissionCard icon="notifications-outline" title="Emergency notifications" status={notificationStatus} description={Platform.OS === 'android' ? 'Android alerts are delivered through native FCM. This app reads the OS permission; delivery also depends on device registration and service availability.' : 'iOS alerts are presented while the app is active through the account WebSocket. This app reads the OS permission; it does not configure server delivery.'}/>
        <PermissionCard icon="location-outline" title="Location access" status={locationStatus} description={user?.latitude != null && user?.longitude != null ? `A location is stored on your account (${Number(user.latitude).toFixed(4)}, ${Number(user.longitude).toFixed(4)}). Permission status alone does not update that location.` : 'No location is currently stored on your account. Use the Home setup action to request location and register it.'}/>
        <TouchableOpacity style={styles.settingsButton} onPress={() => Linking.openSettings()} activeOpacity={0.8}><Ionicons name="settings-outline" size={17} color={colors.primary}/><Text style={styles.settingsButtonText}>Open device settings</Text><Ionicons name="open-outline" size={15} color={colors.textMuted}/></TouchableOpacity>
        <TouchableOpacity style={styles.refreshButton} onPress={loadPermissions} activeOpacity={0.8}><Ionicons name="refresh-outline" size={15} color={colors.textSecondary}/><Text style={styles.refreshText}>Refresh permission status</Text></TouchableOpacity>
        <Text style={styles.note}>If you declined a permission or blocked it, Urban Sentinel will not keep prompting. Use Open device settings to enable it later, then return and refresh this page.</Text>
        <Text style={styles.version}>URBAN SENTINEL · v0.1.0</Text>
      </ScrollView>
    </Screen>
  );
}

function PermissionCard({ icon, title, status, description }) {
  const allowed = status === 'Allowed';
  return <View style={styles.card}><View style={styles.cardTop}><View style={styles.iconWrap}><Ionicons name={icon} size={18} color={colors.primary}/></View><View style={styles.cardTitleWrap}><Text style={styles.title}>{title}</Text><Text style={[styles.status, { color: allowed ? colors.success : status === 'Denied' ? colors.danger : colors.warning }]}>{status}</Text></View><Ionicons name={allowed ? 'checkmark-circle' : 'information-circle-outline'} size={19} color={allowed ? colors.success : colors.warning}/></View><Text style={styles.description}>{description}</Text></View>;
}

function permissionLabel(permission) {
  if (permission.granted) return 'Allowed';
  if (permission.status === 'denied' && permission.canAskAgain === false) return 'Blocked in device settings';
  if (permission.status === 'denied') return 'Denied';
  return 'Not requested';
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl, maxWidth: 720, width: '100%', alignSelf: 'center' },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  cardTitleWrap: { flex: 1 }, title: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' }, status: { fontSize: 10, fontWeight: '700', marginTop: 3 },
  description: { color: colors.textSecondary, fontSize: 11, lineHeight: 17, marginTop: spacing.md },
  settingsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm }, settingsButtonText: { color: colors.textPrimary, fontSize: 12, fontWeight: '700' },
  refreshButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, padding: spacing.md }, refreshText: { color: colors.textSecondary, fontSize: 11 }, error: { color: colors.danger, fontSize: 12, marginBottom: spacing.md }, note: { color: colors.textMuted, textAlign: 'center', fontSize: 10, lineHeight: 15, marginTop: spacing.sm }, version: { color: colors.textMuted, fontSize: 9, textAlign: 'center', marginTop: spacing.xl, letterSpacing: 1.2 },
});
