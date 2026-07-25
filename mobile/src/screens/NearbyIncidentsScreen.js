import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import * as api from '../api/endpoints';
import { colors, radius, severityColors, shadow, spacing, typography } from '../theme';

const INCIDENT_ICONS = {
  fire: 'flame',
  gas_leak: 'warning',
  flood: 'water',
  structural_damage: 'business',
  temperature_spike: 'thermometer',
  explosion: 'nuclear',
};

function IncidentCard({ incident }) {
  const sev = severityColors[incident.severity] || severityColors.medium;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.iconWrap}>
          <Ionicons name={INCIDENT_ICONS[incident.incident_type] || 'alert-circle'} size={20} color={colors.primary} />
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.incidentType}>{incident.incident_type.replace('_', ' ')}</Text>
          <Text style={styles.detail}>
            {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)} · {incident.radius_meters}m radius
          </Text>
        </View>
        <View style={[styles.severityBadge, { backgroundColor: sev.bg }]}>
          <Text style={[styles.severityText, { color: sev.fg }]}>{incident.severity}</Text>
        </View>
      </View>
      <Text style={styles.timestamp}>Detected {new Date(incident.detected_at).toLocaleString()}</Text>
    </View>
  );
}

export default function NearbyIncidentsScreen() {
  const [incidents, setIncidents] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.getActiveIncidents();
      setIncidents(data);
      setError('');
    } catch {
      setError("Couldn't load incidents. Check your connection.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Nearby Incidents</Text>
        <Text style={styles.subtitle}>
          Showing all active incidents citywide — distance-based filtering arrives with the Radius Engine.
        </Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={incidents}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <IncidentCard incident={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="shield-checkmark" size={40} color={colors.secondary} />
            <Text style={styles.emptyText}>No active incidents right now.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 60, paddingHorizontal: spacing.xl },
  headerBlock: { marginBottom: spacing.lg },
  title: { ...typography.h2, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  error: { color: colors.danger, marginBottom: spacing.md },
  list: { paddingBottom: 40 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardTitleWrap: { flex: 1 },
  incidentType: { ...typography.h3, color: colors.textPrimary, textTransform: 'capitalize' },
  detail: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  severityBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  severityText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  timestamp: { ...typography.small, color: colors.textMuted, marginTop: spacing.md },
  empty: { alignItems: 'center', marginTop: 60, gap: spacing.md },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
});
