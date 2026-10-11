import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import * as api from '../api/endpoints';
import IncidentMapView from '../components/IncidentMapView';
import { IncidentListCard, PageHeader, Screen, StatePanel } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { useLiveSocket } from '../api/useLiveSocket';
import { colors, spacing } from '../theme';

export default function MapScreen({ navigation }) {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const userLocation = user?.latitude != null && user?.longitude != null ? [user.latitude, user.longitude] : null;

  const load = useCallback(async () => {
    try {
      const result = await api.getActiveIncidents();
      setIncidents(result);
      setError('');
    } catch {
      setError("Couldn't load the active incident feed. The map may show the last loaded records.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useLiveSocket((event) => {
    if (event.type === 'incident_created' || event.type === 'incident_updated') load();
  });
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refresh = () => { setIsRefreshing(true); load(); };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]}/>}
      >
        <PageHeader eyebrow="Recorded locations" title="City map" subtitle="Active incidents returned by the service. This map does not show live camera feeds or responder positions."/>
        {!userLocation ? <View style={styles.locationNote}><Ionicons name="information-circle-outline" size={16} color={colors.primary}/><Text style={styles.noteText}>No personal location is saved. The map uses its default Bengaluru view; incident locations come from backend records.</Text></View> : null}
        {error ? <View style={styles.errorNote}><Ionicons name="cloud-offline-outline" size={16} color={colors.warning}/><Text style={styles.noteText}>{error}</Text></View> : null}
        <IncidentMapView
          incidents={incidents}
          userLocation={userLocation}
          onSelectIncident={(incidentId) => navigation.navigate('IncidentDetail', { incidentId })}
          style={styles.map}
        />
        <Text style={styles.mapDisclaimer}>Markers show recorded incident coordinates. A straight-line estimate is not a safe route.</Text>
        <View style={styles.listHeading}><Text style={styles.listTitle}>Active incidents</Text><Text style={styles.listCount}>{incidents.length}</Text></View>
        {isLoading && incidents.length === 0 ? <StatePanel loading title="Loading map records" message="Checking the active incident service." compact/> : null}
        {!isLoading && error && incidents.length === 0 ? <StatePanel icon="cloud-offline-outline" title="Incident map unavailable" message="The active incident service could not be reached." actionLabel="Try again" onAction={load} error compact/> : null}
        {!isLoading && !error && incidents.length === 0 ? <StatePanel icon="location-outline" title="No active incident records" message="No active incident coordinates were returned. This does not establish that an area is safe." compact/> : null}
        {incidents.map((incident) => <IncidentListCard key={incident.id} incident={incident} userLocation={userLocation} onPress={() => navigation.navigate('IncidentDetail', { incidentId: incident.id })}/>)}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxxl, maxWidth: 760, width: '100%', alignSelf: 'center' },
  map: { height: 360 },
  mapDisclaimer: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: spacing.sm },
  locationNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.infoSoft, borderColor: '#D4E4F5', borderWidth: 1, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
  errorNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.warningSoft, borderColor: '#EBD5A7', borderWidth: 1, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
  noteText: { color: colors.textSecondary, fontSize: 11, lineHeight: 16, flex: 1 },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md },
  listTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  listCount: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
});
