import { useCallback, useEffect, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import * as api from '../api/endpoints';
import { HazardIcon, Screen, SeverityBadge, StatePanel } from '../components/UI';
import { colors, radius, spacing, typography } from '../theme';

const SAFETY_GUIDANCE = {
  fire: "Move away from the area now. Don't use elevators. Follow evacuation routes if you're in a building.",
  gas_leak: "Don't use open flames, switches, or your car ignition nearby. Move upwind and away from the source.",
  flood: "Move to higher ground. Don't walk or drive through moving water, even if it looks shallow.",
  structural_damage: "Stay well clear of the structure. Don't enter or go near damaged buildings.",
  temperature_spike: 'Avoid strenuous activity outdoors. Stay hydrated and seek shade or air conditioning.',
  explosion: 'Move away from the area immediately. Follow instructions from local authorities if given.',
};

async function openDirections(latitude, longitude) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  await Linking.openURL(url);
}

export default function IncidentDetailScreen({ route }) {
  const { incidentId } = route.params;
  const [incident, setIncident] = useState(null);
  const [error, setError] = useState('');
  const [linkError, setLinkError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setIncident(await api.getIncidentById(incidentId));
    } catch {
      setError("Couldn't load incident details. Check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, [incidentId]);
  useEffect(() => { load(); }, [load]);

  if (isLoading && !incident) return <Screen edges={['bottom']}><StatePanel loading title="Loading incident" message="Retrieving the recorded incident details."/></Screen>;
  if (error && !incident) return <Screen edges={['bottom']}><View style={styles.center}><StatePanel icon="cloud-offline-outline" title="Incident unavailable" message={error} actionLabel="Try again" onAction={load} error/></View></Screen>;
  if (!incident) return null;

  const guidance = SAFETY_GUIDANCE[incident.incident_type] || 'Stay alert, keep a safe distance, and follow guidance from local authorities.';
  const statusColor = incident.status === 'active' ? colors.warning : colors.success;

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} tintColor={colors.primary} colors={[colors.primary]}/> }>
        {error ? <View style={styles.stale}><Ionicons name="cloud-offline-outline" size={15} color={colors.warning}/><Text style={styles.staleText}>Refresh failed. Showing the last loaded details.</Text></View> : null}
        <View style={styles.hero}>
          <HazardIcon type={incident.incident_type} size={23}/>
          <View style={styles.heroCopy}><Text style={styles.eyebrow}>Incident #{incident.id}</Text><Text style={styles.title}>{incident.incident_type.replaceAll('_', ' ')}</Text></View>
          <SeverityBadge severity={incident.severity}/>
        </View>
        <View style={styles.statusRow}><View style={[styles.statusDot, { backgroundColor: statusColor }]}/><Text style={[styles.statusText, { color: statusColor }]}>{incident.status}</Text><Text style={styles.detected}>Detected {new Date(incident.detected_at).toLocaleString()}</Text></View>

        <TouchableOpacity style={styles.directionsButton} onPress={async () => { setLinkError(''); try { await openDirections(incident.latitude, incident.longitude); } catch { setLinkError('Could not open a maps app for these coordinates.'); } }} activeOpacity={0.85}>
          <Ionicons name="navigate" size={18} color={colors.white}/><Text style={styles.directionsText}>Get directions</Text><Ionicons name="open-outline" size={16} color={colors.white}/>
        </TouchableOpacity>
        <Text style={styles.directionsHint}>Opens your available maps app with this recorded location.</Text>
        {linkError ? <Text style={styles.linkError}>{linkError}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Incident record</Text>
          <View style={styles.detailsCard}>
            <Detail icon="location-outline" label="Coordinates" value={`${Number(incident.latitude).toFixed(6)}, ${Number(incident.longitude).toFixed(6)}`}/>
            <Detail icon="radio-outline" label="Alert radius" value={`${incident.radius_meters} m`}/>
            <Detail icon="time-outline" label="Detected at" value={new Date(incident.detected_at).toLocaleString()}/>
            {incident.resolved_at ? <Detail icon="checkmark-circle-outline" label="Resolved at" value={new Date(incident.resolved_at).toLocaleString()}/> : null}
            {incident.device_id != null ? <Detail icon="videocam-outline" label="Source device record" value={`Device #${incident.device_id}`}/> : null}
          </View>
        </View>

        <View style={styles.guidanceCard}>
          <View style={styles.guidanceHeader}><View style={styles.guidanceIcon}><Ionicons name="shield-checkmark-outline" size={18} color={colors.primary}/></View><View><Text style={styles.guidanceTitle}>Safety guidance</Text><Text style={styles.guidanceSubtitle}>General precautions for this hazard</Text></View></View>
          <Text style={styles.guidanceText}>{guidance}</Text>
          <Text style={styles.guidanceFootnote}>Follow emergency service instructions and local authority advisories.</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Detail({ icon, label, value }) {
  return <View style={styles.detailRow}><Ionicons name={icon} size={17} color={colors.textMuted}/><View style={styles.detailCopy}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl, maxWidth: 720, width: '100%', alignSelf: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg },
  heroCopy: { flex: 1 }, eyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  title: { ...typography.h2, color: colors.textPrimary, textTransform: 'capitalize', marginTop: 3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.lg },
  statusDot: { width: 7, height: 7, borderRadius: 4 }, statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  detected: { color: colors.textMuted, fontSize: 10, marginLeft: 'auto', textAlign: 'right', flexShrink: 1 },
  directionsButton: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.primaryDark, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  directionsText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  directionsHint: { color: colors.textMuted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: spacing.sm },
  linkError: { color: colors.danger, fontSize: 11, textAlign: 'center', marginTop: spacing.sm },
  section: { marginTop: spacing.xxl }, sectionTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: spacing.md },
  detailsCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailCopy: { flex: 1 }, detailLabel: { color: colors.textMuted, fontSize: 10 }, detailValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', marginTop: 3 },
  guidanceCard: { marginTop: spacing.lg, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: '#21416A', backgroundColor: colors.primarySoft },
  guidanceHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  guidanceIcon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  guidanceTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' }, guidanceSubtitle: { color: colors.textSecondary, fontSize: 10, marginTop: 3 },
  guidanceText: { color: colors.textPrimary, fontSize: 14, lineHeight: 21, marginTop: spacing.lg },
  guidanceFootnote: { color: colors.textSecondary, fontSize: 10, lineHeight: 15, marginTop: spacing.md },
  stale: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.warningSoft, borderColor: '#6A5123', borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }, staleText: { color: colors.textSecondary, flex: 1, fontSize: 11 },
});
