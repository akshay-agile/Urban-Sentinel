import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

// Mirrors backend/app/services/notification_content.py's guidance text.
const SAFETY_GUIDANCE = {
  fire: "Move away from the area now. Don't use elevators. Follow evacuation routes if you're in a building.",
  gas_leak: "Don't use open flames, switches, or your car ignition nearby. Move upwind and away from the source.",
  flood: "Move to higher ground. Don't walk or drive through moving water, even if it looks shallow.",
  structural_damage: "Stay well clear of the structure. Don't enter or go near damaged buildings.",
  temperature_spike: 'Avoid strenuous activity outdoors. Stay hydrated and seek shade or air conditioning.',
  explosion: 'Move away from the area immediately. Follow instructions from local authorities if given.',
};

/**
 * Universal Google Maps deep link — opens the Google Maps app if
 * installed (Android or iOS) with turn-by-turn directions ready to go,
 * or falls back to Google Maps in the browser if it isn't. No native
 * dependency needed (React Native's built-in Linking API), and no
 * dev-build/rebuild required either way.
 *
 * Chosen over an embedded static map (the previous approach) because an
 * actual navigation app is what helps someone get there — a picture of
 * a map inside the app can't give turn-by-turn directions.
 */
function openDirections(latitude, longitude) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  Linking.openURL(url);
}

export default function IncidentDetailScreen({ route }) {
  const { incidentId } = route.params;
  const [incident, setIncident] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.getIncidentById(incidentId);
      setIncident(data);
    } catch {
      setError("Couldn't load incident details. Check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !incident) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle" size={32} color={colors.danger} />
        <Text style={styles.errorText}>{error || 'Incident not found.'}</Text>
      </View>
    );
  }

  const sev = severityColors[incident.severity] || severityColors.medium;
  const guidance = SAFETY_GUIDANCE[incident.incident_type] || 'Stay alert and follow guidance from local authorities.';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name={INCIDENT_ICONS[incident.incident_type] || 'alert-circle'} size={22} color={colors.primary} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>{incident.incident_type.replace('_', ' ')}</Text>
          <Text style={styles.subtitle}>
            {incident.status === 'active' ? 'Active' : 'Resolved'} · Detected{' '}
            {new Date(incident.detected_at).toLocaleString()}
          </Text>
        </View>
        <View style={[styles.severityBadge, { backgroundColor: sev.bg }]}>
          <Text style={[styles.severityText, { color: sev.fg }]}>{incident.severity}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.directionsButton}
        onPress={() => openDirections(incident.latitude, incident.longitude)}
        activeOpacity={0.85}
      >
        <Ionicons name="navigate" size={18} color={colors.white} />
        <Text style={styles.directionsButtonText}>Get Directions</Text>
        <Ionicons name="open-outline" size={16} color={colors.white} />
      </TouchableOpacity>
      <Text style={styles.directionsHint}>Opens Google Maps for turn-by-turn navigation to this location.</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Alert radius</Text>
        <Text style={styles.cardValue}>{incident.radius_meters}m</Text>
      </View>

      <View style={styles.guidanceCard}>
        <View style={styles.guidanceHeader}>
          <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
          <Text style={styles.guidanceTitle}>What to do</Text>
        </View>
        <Text style={styles.guidanceText}>{guidance}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  errorText: { color: colors.danger, textAlign: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerTextWrap: { flex: 1 },
  title: { ...typography.h2, color: colors.textPrimary, textTransform: 'capitalize' },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  severityBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full, marginTop: 4 },
  severityText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  directionsButton: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  directionsButtonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  directionsHint: { ...typography.small, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.lg },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardLabel: { ...typography.caption, color: colors.textSecondary },
  cardValue: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
  guidanceCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  guidanceHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  guidanceTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  guidanceText: { ...typography.body, color: colors.textPrimary, lineHeight: 21 },
});
