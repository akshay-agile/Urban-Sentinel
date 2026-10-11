import { useCallback, useEffect, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import * as api from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { HazardIcon, Screen, SeverityBadge, StatePanel } from '../components/UI';
import { colors, radius, spacing, typography } from '../theme';
import { distanceAndDirection, formatDistance } from '../utils/geo';

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

export default function IncidentDetailScreen({ navigation, route }) {
  const { incidentId } = route.params;
  const { user } = useAuth();
  const [incident, setIncident] = useState(null);
  const [notificationRecord, setNotificationRecord] = useState(null);
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
  useEffect(() => {
    let active = true;
    if (!user?.id) return undefined;
    api.getMyNotifications(user.id).then((items) => {
      const record = items.filter((item) => Number(item.incident_id) === Number(incidentId)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null;
      if (active) setNotificationRecord(record);
    }).catch(() => { if (active) setNotificationRecord(null); });
    return () => { active = false; };
  }, [incidentId, user?.id]);

  if (isLoading && !incident) return <Screen edges={['bottom']}><StatePanel loading title="Loading incident" message="Retrieving the recorded incident details."/></Screen>;
  if (error && !incident) return <Screen edges={['bottom']}><View style={styles.center}><StatePanel icon="cloud-offline-outline" title="Incident unavailable" message={error} actionLabel="Try again" onAction={load} error/></View></Screen>;
  if (!incident) return null;

  const guidance = SAFETY_GUIDANCE[incident.incident_type] || 'Stay alert, keep a safe distance, and follow guidance from local authorities.';
  const statusColor = incident.status === 'resolved' ? colors.success : incident.status === 'active' ? colors.warning : colors.textMuted;
  const userDistance = user?.latitude != null && user?.longitude != null
    ? distanceAndDirection([user.latitude, user.longitude], [incident.latitude, incident.longitude])
    : null;
  const openMap = () => navigation.navigate('Main', { screen: 'Map' });
  const callEmergency = async () => { try { await Linking.openURL('tel:112'); } catch { setLinkError('Could not open the phone dialler. Call your local emergency number directly.'); } };

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} tintColor={colors.primary} colors={[colors.primary]}/> }>
        {error ? <View style={styles.stale}><Ionicons name="cloud-offline-outline" size={15} color={colors.warning}/><Text style={styles.staleText}>Refresh failed. Showing the last loaded details.</Text></View> : null}
        <View style={styles.hero}>
          <HazardIcon type={incident.incident_type} size={23}/>
          <View style={styles.heroCopy}><Text style={styles.eyebrow}>Incident #{incident.id}</Text><Text style={styles.title}>{incident.incident_type.replaceAll('_', ' ')}</Text></View>
          <SeverityBadge severity={incident.severity}/>
        </View>
        <View style={styles.statusRow}><View style={[styles.statusDot, { backgroundColor: statusColor }]}/><Text style={[styles.statusText, { color: statusColor }]}>{incident.status === 'active' ? 'Active incident' : incident.status === 'resolved' ? 'Resolved' : 'Status unavailable'}</Text><Text style={styles.detected}>Detected {new Date(incident.detected_at).toLocaleString()}</Text></View>
        {userDistance ? <Text style={styles.distanceNote}>{formatDistance(userDistance.distanceMeters)} {userDistance.direction} · straight-line from your saved account location. This is not a route.</Text> : null}

        <TouchableOpacity style={styles.directionsButton} onPress={async () => { setLinkError(''); try { await openDirections(incident.latitude, incident.longitude); } catch { setLinkError('Could not open a maps app for these coordinates.'); } }} activeOpacity={0.85}>
          <Ionicons name="navigate" size={18} color={colors.white}/><Text style={styles.directionsText}>Open location in Maps</Text><Ionicons name="open-outline" size={16} color={colors.white}/>
        </TouchableOpacity>
        <Text style={styles.directionsHint}>Opens a third-party maps app at the recorded coordinates. Urban Sentinel cannot verify road conditions or route safety.</Text>
        <TouchableOpacity style={styles.secondaryAction} onPress={openMap}><Ionicons name="map-outline" size={16} color={colors.primary}/><Text style={styles.secondaryActionText}>View incident on city map</Text></TouchableOpacity>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recorded progress</Text>
          <View style={styles.progressCard}>
            <ProgressRow icon="radio-outline" title="Incident record created" detail={new Date(incident.detected_at).toLocaleString()} tone={colors.primary}/>
            {notificationRecord ? <ProgressRow icon={notificationRecord.status === 'sent' || notificationRecord.status === 'read' ? 'notifications-outline' : 'information-circle-outline'} title="Personal alert record" detail={`${notificationRecord.status}${notificationRecord.sent_at ? ` · ${new Date(notificationRecord.sent_at).toLocaleString()}` : ` · recorded ${new Date(notificationRecord.created_at).toLocaleString()}`} · ${notificationRecord.channel}`} tone={notificationRecord.status === 'failed' ? colors.warning : colors.primary}/> : null}
            <ProgressRow icon={incident.status === 'resolved' ? 'checkmark-circle-outline' : 'time-outline'} title={incident.status === 'resolved' ? 'Incident marked resolved' : 'Current status'} detail={incident.status === 'resolved' && incident.resolved_at ? new Date(incident.resolved_at).toLocaleString() : incident.status === 'active' ? 'Active in the latest incident record' : String(incident.status)} tone={statusColor}/>
            <Text style={styles.progressLimit}>The current service does not provide verification, authority acknowledgement, dispatch, response-team or public-update events. No such stages are inferred here.</Text>
          </View>
        </View>

        <View style={styles.guidanceCard}>
          <View style={styles.guidanceHeader}><View style={styles.guidanceIcon}><Ionicons name="shield-checkmark-outline" size={18} color={colors.primary}/></View><View><Text style={styles.guidanceTitle}>Safety guidance</Text><Text style={styles.guidanceSubtitle}>General precautions for this hazard</Text></View></View>
          <Text style={styles.guidanceText}>{guidance}</Text>
          <Text style={styles.guidanceFootnote}>Follow emergency service instructions and local authority advisories.</Text>
          <TouchableOpacity style={styles.emergencyLink} onPress={() => navigation.navigate('Main', { screen: 'Help' })}><Ionicons name="book-outline" size={15} color={colors.primary}/><Text style={styles.guideLinkText}>Open the full safety guide</Text></TouchableOpacity>
          <TouchableOpacity style={styles.emergencyLink} onPress={callEmergency}><Ionicons name="call-outline" size={15} color={colors.danger}/><Text style={styles.emergencyLinkText}>Call 112 in India (opens dialler)</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Detail({ icon, label, value }) {
  return <View style={styles.detailRow}><Ionicons name={icon} size={17} color={colors.textMuted}/><View style={styles.detailCopy}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View></View>;
}

function ProgressRow({ icon, title, detail, tone }) {
  return <View style={styles.progressRow}><View style={[styles.progressIcon, { backgroundColor: `${tone}18` }]}><Ionicons name={icon} size={16} color={tone}/></View><View style={styles.progressCopy}><Text style={styles.progressTitle}>{title}</Text><Text style={styles.progressDetail}>{detail}</Text></View></View>;
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
  distanceNote: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: -spacing.md, marginBottom: spacing.md },
  directionsButton: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.primaryDark, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  directionsText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  directionsHint: { color: colors.textMuted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: spacing.sm },
  secondaryAction: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, minHeight: 44, marginTop: spacing.sm },
  secondaryActionText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  linkError: { color: colors.danger, fontSize: 11, textAlign: 'center', marginTop: spacing.sm },
  section: { marginTop: spacing.xxl }, sectionTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: spacing.md },
  detailsCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailCopy: { flex: 1 }, detailLabel: { color: colors.textMuted, fontSize: 10 }, detailValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', marginTop: 3 },
  progressCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  progressRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  progressIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  progressCopy: { flex: 1 }, progressTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: '700' }, progressDetail: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  progressLimit: { color: colors.textMuted, fontSize: 10, lineHeight: 15, paddingVertical: spacing.md },
  guidanceCard: { marginTop: spacing.lg, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: '#D4E4F5', backgroundColor: colors.primarySoft },
  guidanceHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  guidanceIcon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  guidanceTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' }, guidanceSubtitle: { color: colors.textSecondary, fontSize: 10, marginTop: 3 },
  guidanceText: { color: colors.textPrimary, fontSize: 14, lineHeight: 21, marginTop: spacing.lg },
  guidanceFootnote: { color: colors.textSecondary, fontSize: 10, lineHeight: 15, marginTop: spacing.md },
  emergencyLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, marginTop: spacing.sm },
  emergencyLinkText: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  guideLinkText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  stale: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.warningSoft, borderColor: '#EBD5A7', borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }, staleText: { color: colors.textSecondary, flex: 1, fontSize: 11 },
});
