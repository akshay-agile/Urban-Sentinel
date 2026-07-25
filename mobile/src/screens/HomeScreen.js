import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import * as api from '../api/endpoints';
import { registerForPushNotifications } from '../notifications/registerPushToken';
import { colors, radius, shadow, spacing, typography } from '../theme';

export default function HomeScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [incidentCount, setIncidentCount] = useState(null);
  const [locationStatus, setLocationStatus] = useState('unknown'); // unknown | granted | denied
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [setupWarning, setSetupWarning] = useState('');

  const loadIncidents = useCallback(async () => {
    try {
      const incidents = await api.getActiveIncidents();
      setIncidentCount(incidents.length);
    } catch {
      setIncidentCount(null);
    }
  }, []);

  const enableAlerts = useCallback(async () => {
    setSetupWarning('');

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationStatus('denied');
      return;
    }
    setLocationStatus('granted');
    const position = await Location.getCurrentPositionAsync({});
    await api.updateMe({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });

    const pushResult = await registerForPushNotifications();
    if (pushResult.error) {
      setSetupWarning(pushResult.error);
    }

    await refreshUser();
  }, [refreshUser]);

  useFocusEffect(
    useCallback(() => {
      loadIncidents();
    }, [loadIncidents])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadIncidents();
    setIsRefreshing(false);
  };

  const hasLocation = user?.latitude != null && user?.longitude != null;
  const hasIncidents = (incidentCount ?? 0) > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingLabel}>Welcome back</Text>
          <Text style={styles.greeting}>{user?.full_name?.split(' ')[0] || 'there'}</Text>
        </View>
        <View style={[styles.statusPill, hasIncidents ? styles.statusPillAlert : styles.statusPillSafe]}>
          <Ionicons
            name={hasIncidents ? 'warning' : 'checkmark-circle'}
            size={14}
            color={hasIncidents ? colors.danger : colors.secondary}
          />
          <Text style={[styles.statusPillText, { color: hasIncidents ? colors.danger : colors.secondary }]}>
            {hasIncidents ? 'Active alerts' : 'All clear'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardIconWrap}>
          <Ionicons name="pulse" size={20} color={colors.primary} />
        </View>
        <Text style={styles.cardLabel}>Active incidents citywide</Text>
        <Text style={styles.cardValue}>{incidentCount === null ? '—' : incidentCount}</Text>
        <Text style={styles.cardHint}>
          Nearby-only filtering by distance narrows this down once the Radius Engine matches your location.
        </Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={enableAlerts} activeOpacity={0.85}>
        <Ionicons name="notifications" size={18} color={colors.white} />
        <Text style={styles.primaryButtonText}>
          {hasLocation ? 'Update location & notification settings' : 'Enable alerts for your area'}
        </Text>
      </TouchableOpacity>

      {locationStatus === 'denied' && (
        <View style={styles.warningBox}>
          <Ionicons name="alert-circle" size={16} color={colors.warning} />
          <Text style={styles.warningText}>
            Location permission denied — you won't receive area-specific alerts until this is enabled in your
            phone's Settings.
          </Text>
        </View>
      )}

      {setupWarning ? (
        <View style={styles.warningBox}>
          <Ionicons name="alert-circle" size={16} color={colors.warning} />
          <Text style={styles.warningText}>{setupWarning}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('NearbyIncidents')}
        activeOpacity={0.7}
      >
        <Ionicons name="map" size={18} color={colors.textPrimary} />
        <Text style={styles.secondaryButtonText}>View Nearby Incidents</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingTop: 64, paddingBottom: spacing.xxxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xl },
  greetingLabel: { ...typography.caption, color: colors.textSecondary },
  greeting: { ...typography.h1, color: colors.textPrimary, marginTop: 2 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  statusPillSafe: { backgroundColor: colors.secondarySoft },
  statusPillAlert: { backgroundColor: colors.dangerSoft },
  statusPillText: { fontSize: 12, fontWeight: '600' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardLabel: { ...typography.caption, color: colors.textSecondary },
  cardValue: { fontSize: 40, fontWeight: '700', color: colors.textPrimary, marginTop: 4 },
  cardHint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 18 },
  primaryButton: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  primaryButtonText: { color: colors.white, textAlign: 'center', fontWeight: '600', fontSize: 15 },
  warningBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warningText: { color: '#92400E', fontSize: 13, flex: 1, lineHeight: 18 },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: { flex: 1, color: colors.textPrimary, fontWeight: '600', fontSize: 15 },
});
