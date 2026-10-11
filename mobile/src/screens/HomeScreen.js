import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import * as api from '../api/endpoints';
import { useLiveSocket } from '../api/useLiveSocket';
import IncidentMapView from '../components/IncidentMapView';
import { BrandMark, HazardIcon, IncidentListCard, Screen, SeverityBadge } from '../components/UI';
import { distanceAndDirection, formatDistance } from '../utils/geo';
import { colors, radius, shadow, spacing } from '../theme';

export default function HomeScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [locationStatus, setLocationStatus] = useState('unknown');
  const [setupWarning, setSetupWarning] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isEnabling, setIsEnabling] = useState(false);
  const [error, setError] = useState('');
  const userLocation = useMemo(() => user?.latitude != null && user?.longitude != null ? [user.latitude, user.longitude] : null, [user]);
  const criticalCount = incidents.filter((incident) => ['high', 'critical'].includes(incident.severity)).length;
  const hazardCounts = useMemo(() => ({
    fire: incidents.filter((incident) => ['fire', 'smoke'].includes(incident.incident_type)).length,
    flood: incidents.filter((incident) => incident.incident_type === 'flood').length,
    accident: incidents.filter((incident) => incident.incident_type === 'accident').length,
  }), [incidents]);
  const nearbyIncidents = useMemo(() => {
    if (!userLocation) return [];
    return incidents.filter((incident) => {
      const distance = distanceAndDirection(userLocation, [incident.latitude, incident.longitude]);
      const alertRadius = Number(incident.radius_meters);
      return distance && Number.isFinite(alertRadius) && alertRadius >= 0 && distance.distanceMeters <= alertRadius;
    });
  }, [incidents, userLocation]);
  const priorityIncident = useMemo(() => [...nearbyIncidents].sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.severity] ?? 4) - ({ critical: 0, high: 1, medium: 2, low: 3 }[b.severity] ?? 4))[0], [nearbyIncidents]);
  const priorityDistance = priorityIncident ? distanceAndDirection(userLocation, [priorityIncident.latitude, priorityIncident.longitude]) : null;

  const loadIncidents = useCallback(async () => {
    try {
      const data = await api.getActiveIncidents();
      setIncidents(data);
      setError('');
      setHasLoaded(true);
      setLastUpdated(new Date());
    } catch {
      setError("Couldn't refresh active incidents. Showing the last loaded view.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useLiveSocket((event) => {
    if (event.type === 'incident_created' || event.type === 'incident_updated') loadIncidents();
  });

  useFocusEffect(useCallback(() => {
    let isCurrent = true;
    loadIncidents();
    Location.getForegroundPermissionsAsync().then((permission) => {
      if (isCurrent) setLocationStatus(permission.granted ? 'granted' : permission.status === 'denied' && permission.canAskAgain === false ? 'blocked' : permission.status === 'denied' ? 'denied' : 'unknown');
    }).catch(() => {});
    return () => { isCurrent = false; };
  }, [loadIncidents]));

  const enableAlerts = useCallback(async () => {
    setSetupWarning('');
    setIsEnabling(true);
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted && permission.status === 'denied' && permission.canAskAgain === false) {
        setLocationStatus('blocked');
        setSetupWarning('Location access is blocked. Enable it in device settings, then try again.');
        await Linking.openSettings();
        return;
      }

      if (!permission.granted) permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted && permission.status !== 'granted') {
        setLocationStatus('denied');
        setSetupWarning('Location access is needed to save your area for nearby alerts. You can enable it later in device settings.');
        return;
      }

      setLocationStatus('granted');
      const position = await Location.getCurrentPositionAsync({});
      await api.updateMe({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      await refreshUser();
    } catch {
      setSetupWarning("Couldn't update your location or alert registration. Check permissions and your connection, then try again.");
    } finally {
      setIsEnabling(false);
    }
  }, [refreshUser]);

  const openMap = () => navigation.getParent()?.navigate('Map');
  const openEmergencyCall = async () => {
    try { await Linking.openURL('tel:112'); } catch { setSetupWarning('Could not open the phone dialler. Call your local emergency number directly.'); }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <View style={styles.brandIdentity}><BrandMark size={42}/><View><Text style={styles.brandName}>URBAN SENTINEL</Text><Text style={styles.brandTagline}>DETECT. ALERT. PROTECT.</Text></View></View>
          <View style={styles.headerActions}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open notifications" style={styles.notificationButton} onPress={() => navigation.navigate('Alerts')}>
              <Ionicons name="notifications-outline" size={20} color={colors.textSecondary}/>
            </TouchableOpacity>
            <View style={styles.accountPill}><Ionicons name="person-circle-outline" size={15} color={colors.textSecondary}/><Text style={styles.accountName} numberOfLines={1}>{user?.full_name?.split(' ')[0] || 'Resident'}</Text></View>
          </View>
        </View>

        <View style={[styles.safetyHero, criticalCount > 0 && styles.safetyHeroAlert]}>
          <View style={styles.safetyHeroTop}><View style={[styles.safetyIcon, criticalCount > 0 && styles.safetyIconAlert]}><Ionicons name={criticalCount > 0 ? 'warning' : error && !hasLoaded ? 'cloud-offline-outline' : 'information-circle-outline'} size={21} color={criticalCount > 0 ? colors.danger : error && !hasLoaded ? colors.warning : colors.primary}/></View><Text style={styles.safetyEyebrow}>{error && !hasLoaded ? 'INCIDENT FEED UNAVAILABLE' : hasLoaded ? 'CURRENT INCIDENT FEED' : 'CONNECTING TO INCIDENT SERVICE'}</Text></View>
          <Text style={styles.safetyTitle}>{!hasLoaded ? error ? 'Could not check current alerts' : 'Checking incident reports' : criticalCount > 0 ? 'High-priority reports active' : incidents.length > 0 ? 'Active incident reports' : 'No active reports returned'}</Text>
          <Text style={styles.safetyCopy}>{!hasLoaded ? error ? 'The latest incident data could not be retrieved. No safety status can be confirmed.' : 'Incident information will appear here when available.' : criticalCount > 0 ? `${criticalCount} high or critical ${criticalCount === 1 ? 'report needs' : 'reports need'} attention in the current citywide feed. Review the latest details below.` : incidents.length > 0 ? `${incidents.length} active ${incidents.length === 1 ? 'incident is' : 'incidents are'} in the current citywide feed. This is not a distance-filtered nearby list.` : 'The latest API response contains no active incident records. This does not confirm that every area is safe.'}</Text>
          <View style={styles.heroMeta}><View style={[styles.statusDot, (criticalCount > 0 || (error && !hasLoaded)) && { backgroundColor: criticalCount > 0 ? colors.danger : colors.warning }]}/><Text style={styles.heroMetaText}>{error ? 'Refresh unavailable' : hasLoaded ? `Feed checked${lastUpdated ? ` ${lastUpdated.toLocaleTimeString()}` : ''}` : 'Waiting for service'}</Text><Text style={styles.heroMetaText}>{hasLoaded ? `${incidents.length} active` : 'Unknown'}</Text></View>
        </View>

        {priorityIncident ? <TouchableOpacity style={styles.priorityCard} onPress={() => navigation.navigate('IncidentDetail', { incidentId: priorityIncident.id })} activeOpacity={0.82}>
          <View style={styles.priorityHeading}><Ionicons name="alert-circle" size={16} color={colors.warning}/><Text style={styles.priorityLabel}>WITHIN YOUR SAVED ALERT RADIUS</Text><HazardIcon type={priorityIncident.incident_type} size={14}/><SeverityBadge severity={priorityIncident.severity}/></View>
          <Text style={styles.priorityTitle}>{String(priorityIncident.incident_type || 'Incident').replaceAll('_', ' ')}</Text>
          <Text style={styles.priorityDetail}>{priorityIncident.incident_type.replaceAll('_', ' ')} · {priorityIncident.severity} · {priorityDistance ? `${formatDistance(priorityDistance.distanceMeters)} ${priorityDistance.direction} straight-line · ` : ''}{new Date(priorityIncident.detected_at).toLocaleString()}</Text>
          <View style={styles.priorityAction}><Text style={styles.priorityActionText}>View incident details</Text><Ionicons name="arrow-forward" size={15} color={colors.primary}/></View>
        </TouchableOpacity> : null}
        {hasLoaded && userLocation && nearbyIncidents.length === 0 ? <View style={styles.nearbyNotice}><Ionicons name="location-outline" size={17} color={colors.primary}/><Text style={styles.nearbyNoticeText}>No active incident record fell within your saved alert radius in the latest feed. This does not confirm that the area is safe.</Text></View> : null}
        {hasLoaded && !userLocation ? <View style={styles.nearbyNotice}><Ionicons name="location-outline" size={17} color={colors.primary}/><Text style={styles.nearbyNoticeText}>Share a location if you want to compare active reports with your saved alert radius. The incident feed below is citywide.</Text></View> : null}

        <View style={styles.summaryRow}>
          <TouchableOpacity style={[styles.metricCard, styles.fireMetric]} onPress={openMap} activeOpacity={0.8}>
            <View style={styles.metricHeading}><Ionicons name="flame-outline" size={15} color="#B33A3E"/><Text style={styles.metricLabel}>Fire</Text></View>
            <Text style={styles.metricValue}>{hasLoaded ? hazardCounts.fire : '—'}</Text><Text style={styles.metricHint}>Active reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.metricCard, styles.floodMetric]} onPress={openMap} activeOpacity={0.8}>
            <View style={styles.metricHeading}><Ionicons name="water-outline" size={15} color="#2768B2"/><Text style={styles.metricLabel}>Flood</Text></View>
            <Text style={styles.metricValue}>{hasLoaded ? hazardCounts.flood : '—'}</Text><Text style={styles.metricHint}>Active reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.metricCard, styles.roadMetric]} onPress={openMap} activeOpacity={0.8}>
            <View style={styles.metricHeading}><Ionicons name="car-sport-outline" size={15} color="#985514"/><Text style={styles.metricLabel}>Road</Text></View>
            <Text style={styles.metricValue}>{hasLoaded ? hazardCounts.accident : '—'}</Text><Text style={styles.metricHint}>Accidents</Text>
          </TouchableOpacity>
        </View>

        {error ? <View style={styles.staleNotice}><Ionicons name="cloud-offline-outline" size={16} color={colors.warning}/><Text style={styles.staleText}>{error}</Text><TouchableOpacity onPress={loadIncidents}><Text style={styles.retry}>Retry</Text></TouchableOpacity></View> : null}

        <View style={styles.mapCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}><View style={styles.liveDot}/><Text style={styles.sectionTitle}>City incident map</Text></View>
            <TouchableOpacity onPress={openMap} style={styles.linkButton}><Text style={styles.linkText}>Open map</Text><Ionicons name="arrow-forward" size={14} color={colors.primary}/></TouchableOpacity>
          </View>
          <Text style={styles.mapCaption}>Citywide active reports · select a marker for details</Text>
          <IncidentMapView incidents={incidents} userLocation={userLocation} onSelectIncident={(incidentId) => navigation.navigate('IncidentDetail', { incidentId })} compact style={styles.mapWrap}/>
          {incidents.length > 0 ? <View style={styles.mapFooter}><Text style={styles.mapFooterText}>{incidents.length} active {incidents.length === 1 ? 'report' : 'reports'}</Text><Text style={styles.mapFooterSafe}>Markers use hazard type colours</Text></View> : !isLoading && !error ? <View style={styles.mapFooter}><Ionicons name="information-circle-outline" size={15} color={colors.primary}/><Text style={styles.mapFooterSafe}>No active incident coordinates returned</Text></View> : null}
        </View>

        <View style={styles.nearbySection}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Active incidents</Text><TouchableOpacity onPress={openMap} style={styles.linkButton}><Text style={styles.linkText}>View all</Text><Ionicons name="arrow-forward" size={14} color={colors.primary}/></TouchableOpacity></View>
          <Text style={styles.mapCaption}>Citywide feed · distances are straight-line estimates from your saved location.</Text>
          {incidents.slice(0, 3).map((incident) => <IncidentListCard key={incident.id} incident={incident} userLocation={userLocation} onPress={() => navigation.navigate('IncidentDetail', { incidentId: incident.id })}/>)}
          {hasLoaded && incidents.length === 0 && !error ? <Text style={styles.emptyNearby}>No active incident records were returned. The feed does not prove that an area is safe.</Text> : null}
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity onPress={() => navigation.navigate('Help')} style={styles.actionCard}><Ionicons name="shield-checkmark-outline" size={18} color={colors.primary}/><Text style={styles.actionTitle}>Safety guide</Text><Text style={styles.actionHint}>Practical hazard guidance</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Report')} style={styles.actionCard}><Ionicons name="megaphone-outline" size={18} color={colors.warning}/><Text style={styles.actionTitle}>Report a hazard</Text><Text style={styles.actionHint}>Current submission is unavailable</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Help')} style={styles.actionCard}><Ionicons name="people-outline" size={18} color={colors.secondary}/><Text style={styles.actionTitle}>Volunteer assistance</Text><Text style={styles.actionHint}>Network not yet available</Text></TouchableOpacity>
        </View>

        <View style={styles.locationCard}>
          <View style={styles.locationIcon}><Ionicons name="location" size={18} color={userLocation ? colors.primary : colors.textMuted}/></View>
        <View style={styles.locationCopy}><Text style={styles.locationTitle}>{userLocation && !['denied', 'blocked'].includes(locationStatus) ? 'Alert location on account' : ['denied', 'blocked'].includes(locationStatus) ? 'Location access denied' : 'Set up area alerts'}</Text><Text style={styles.locationSubtitle}>{userLocation && ['denied', 'blocked'].includes(locationStatus) ? `Saved location ${user.latitude.toFixed(4)}, ${user.longitude.toFixed(4)} remains on your account; new area matching may use this older point until you update it.` : userLocation ? `${user.latitude.toFixed(4)}, ${user.longitude.toFixed(4)} · Saved to your account` : locationStatus === 'granted' ? 'Permission allowed; share a current location to enable area matching.' : ['denied', 'blocked'].includes(locationStatus) ? 'Enable location in device settings, then return here to update your saved area.' : 'Location is optional. Share it to register this device for area-matched alerts.'}</Text></View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={['denied', 'blocked'].includes(locationStatus) ? 'Open location settings' : userLocation ? 'Refresh alert location' : 'Set up area alerts'} style={styles.setupButton} onPress={['denied', 'blocked'].includes(locationStatus) ? () => Linking.openSettings() : enableAlerts} disabled={isEnabling} activeOpacity={0.8}>{isEnabling ? <ActivityIndicator size="small" color={colors.white}/> : <Ionicons name={['denied', 'blocked'].includes(locationStatus) ? 'settings-outline' : 'arrow-forward'} size={17} color={colors.white}/>}</TouchableOpacity>
        </View>
        {setupWarning ? <Text style={styles.setupWarning}>{setupWarning}</Text> : null}

        <View style={styles.guidanceCard}>
          <View style={styles.guidanceHeading}><Ionicons name="information-circle-outline" size={18} color={colors.primary}/><Text style={styles.guidanceTitle}>Need immediate help?</Text></View>
          <Text style={styles.guidanceText}>In India, call 112 for emergency assistance. This opens your phone dialler; Urban Sentinel does not place the call or send your location.</Text>
          <View style={styles.emergencyActions}><TouchableOpacity style={styles.emergencyButton} onPress={openEmergencyCall}><Ionicons name="call-outline" size={16} color={colors.white}/><Text style={styles.emergencyButtonText}>Call 112</Text></TouchableOpacity><TouchableOpacity onPress={() => navigation.navigate('Help')} style={styles.linkButton}><Text style={styles.linkText}>Open safety guide</Text><Ionicons name="arrow-forward" size={14} color={colors.primary}/></TouchableOpacity></View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 36, maxWidth: 760, width: '100%', alignSelf: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl, paddingTop: spacing.xs },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  notificationButton: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  brandIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandName: { color: colors.textPrimary, fontSize: 12, fontWeight: '900', letterSpacing: 1.1 },
  brandTagline: { color: colors.textMuted, fontSize: 8, fontWeight: '800', letterSpacing: 1.35, marginTop: 4 },
  accountPill: { maxWidth: 110, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 9, paddingVertical: 7, borderRadius: radius.full },
  accountName: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  safetyHero: { borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: '#D4E4F5', backgroundColor: '#EFF6FD', ...shadow.card },
  safetyHeroAlert: { borderColor: '#F0C8CC', backgroundColor: '#FCEBED' },
  safetyHeroTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  safetyIcon: { height: 34, width: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D8EEDF' },
  safetyIconAlert: { backgroundColor: '#F7D9DC' },
  safetyEyebrow: { color: colors.textSecondary, fontSize: 9, fontWeight: '800', letterSpacing: 1.35 },
  safetyTitle: { color: colors.textPrimary, fontSize: 21, lineHeight: 27, fontWeight: '800', letterSpacing: -0.4, marginTop: spacing.md },
  safetyCopy: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 5 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, borderTopWidth: 1, borderTopColor: '#CFE1D4', paddingTop: spacing.md, marginTop: spacing.md },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.secondary },
  heroMetaText: { color: colors.textMuted, fontSize: 10, flex: 1 },
  priorityCard: { borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg, backgroundColor: '#FFF8E9', borderWidth: 1, borderColor: '#F0D9AA' },
  nearbyNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, backgroundColor: colors.infoSoft, borderWidth: 1, borderColor: '#D4E4F5' },
  nearbyNoticeText: { flex: 1, color: colors.textSecondary, fontSize: 11, lineHeight: 16 },
  priorityHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  priorityLabel: { color: colors.warning, fontSize: 9, fontWeight: '800', letterSpacing: 1, flex: 1 },
  priorityTitle: { textTransform: 'capitalize', color: colors.textPrimary, fontSize: 18, fontWeight: '800', marginTop: spacing.md },
  priorityDetail: { color: colors.textMuted, fontSize: 10, lineHeight: 16, marginTop: 5 },
  priorityAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.md },
  priorityActionText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  metricCard: { flex: 1, minHeight: 108, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md },
  fireMetric: { backgroundColor: '#FFF5F3', borderColor: '#F3D7D3' },
  floodMetric: { backgroundColor: '#F0F7FD', borderColor: '#D5E6F5' },
  roadMetric: { backgroundColor: '#FFF8EC', borderColor: '#F0E0C5' },
  metricHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metricLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  metricValue: { color: colors.textPrimary, fontSize: 29, fontWeight: '800', marginTop: 9 },
  metricHint: { color: colors.textMuted, fontSize: 10, marginTop: 1 },
  staleNotice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: '#EBD5A7', backgroundColor: colors.warningSoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  staleText: { color: colors.textSecondary, fontSize: 11, flex: 1, lineHeight: 16 },
  retry: { color: colors.warning, fontSize: 12, fontWeight: '700' },
  mapCard: { overflow: 'hidden', borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: spacing.md, marginBottom: spacing.lg, ...shadow.card },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xs },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  sectionTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  linkButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.xs },
  linkText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  mapCaption: { color: colors.textMuted, fontSize: 11, marginTop: 4, marginBottom: spacing.md, paddingHorizontal: spacing.xs },
  mapWrap: { height: 278, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  map: { flex: 1, backgroundColor: colors.surface },
  mapLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surface },
  mapLoadingText: { color: colors.textMuted, fontSize: 11 },
  mapFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md, paddingHorizontal: spacing.xs },
  mapFooterText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', flex: 1 },
  mapFooterSafe: { color: colors.textMuted, fontSize: 11 },
  nearbySection: { marginBottom: spacing.lg },
  emptyNearby: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: spacing.lg, borderRadius: radius.lg, color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  actionGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  actionCard: { flex: 1, minHeight: 112, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.card },
  actionTitle: { color: colors.textPrimary, fontSize: 11, fontWeight: '700', marginTop: spacing.sm },
  actionHint: { color: colors.textMuted, fontSize: 9, lineHeight: 13, marginTop: 4 },
  locationCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: '#D4E4F5', backgroundColor: '#EFF6FD', borderRadius: radius.xl, padding: spacing.md },
  locationIcon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  locationCopy: { flex: 1 },
  locationTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  locationSubtitle: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  setupButton: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  setupWarning: { color: colors.warning, fontSize: 11, lineHeight: 16, marginTop: spacing.sm, paddingHorizontal: spacing.xs },
  guidanceCard: { marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  guidanceHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  guidanceTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  guidanceItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  guidanceNumber: { color: colors.primary, fontSize: 10, fontWeight: '800', paddingTop: 2 },
  guidanceText: { color: colors.textSecondary, fontSize: 11, lineHeight: 17, flex: 1 },
  emergencyActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  emergencyButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.danger, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md },
  emergencyButtonText: { color: colors.white, fontSize: 12, fontWeight: '700' },
});
