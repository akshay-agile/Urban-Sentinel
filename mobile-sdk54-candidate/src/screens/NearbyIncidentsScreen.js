import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import * as api from '../api/endpoints';
import { useLiveSocket } from '../api/useLiveSocket';
import { IncidentListCard, PageHeader, Screen, StatePanel } from '../components/UI';
import { colors, radius, spacing } from '../theme';

export default function NearbyIncidentsScreen({ navigation }) {
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getActiveIncidents();
      setIncidents(data);
      setError('');
      setLastUpdated(new Date());
    } catch {
      setError("Couldn't load active incidents. Check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useLiveSocket((event) => {
    if (event.type === 'incident_created' || event.type === 'incident_updated') load();
  });
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setIsRefreshing(true); await load(); setIsRefreshing(false); };

  const Header = <View><PageHeader eyebrow="City response feed" title="Active incidents" subtitle="All active incidents returned by the service. The current API does not apply distance-based filtering."/>{lastUpdated ? <Text style={styles.updated}>Updated {lastUpdated.toLocaleTimeString()}</Text> : null}{error && incidents.length > 0 ? <View style={styles.stale}><Ionicons name="cloud-offline-outline" size={15} color={colors.warning}/><Text style={styles.staleText}>Refresh failed. Showing the last successful list.</Text></View> : null}</View>;

  return (
    <Screen>
      <FlatList
        data={incidents}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={Header}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]}/>}
        renderItem={({ item }) => <IncidentListCard incident={item} onPress={() => navigation.navigate('IncidentDetail', { incidentId: item.id })}/>}
        ListEmptyComponent={isLoading ? <StatePanel loading title="Loading active incidents" message="Checking the live incident service."/> : error ? <StatePanel icon="cloud-offline-outline" title="Incident feed unavailable" message={error} actionLabel="Try again" onAction={load} error/> : <StatePanel icon="shield-checkmark-outline" title="No active incidents" message="The API currently returned no active incident records."/>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  updated: { color: colors.textMuted, fontSize: 10, marginTop: -spacing.md, marginBottom: spacing.md },
  stale: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.warningSoft, borderWidth: 1, borderColor: '#6A5123', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  staleText: { color: colors.textSecondary, fontSize: 11, flex: 1 },
});
