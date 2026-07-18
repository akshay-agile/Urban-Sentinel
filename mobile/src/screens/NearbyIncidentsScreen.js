import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import * as api from '../api/endpoints';

const SEVERITY_COLORS = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#dc2626',
};

function IncidentCard({ incident }) {
  const color = SEVERITY_COLORS[incident.severity] || '#64748b';
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.incidentType}>{incident.incident_type.replace('_', ' ')}</Text>
        <View style={[styles.severityBadge, { backgroundColor: color }]}>
          <Text style={styles.severityText}>{incident.severity}</Text>
        </View>
      </View>
      <Text style={styles.detail}>
        {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)} · {incident.radius_meters}m radius
      </Text>
      <Text style={styles.detail}>Detected {new Date(incident.detected_at).toLocaleString()}</Text>
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
      <Text style={styles.title}>Nearby Incidents</Text>
      <Text style={styles.subtitle}>
        Showing all active incidents citywide — distance-based filtering arrives in Session 9.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={incidents}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <IncidentCard incident={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ListEmptyComponent={<Text style={styles.empty}>No active incidents right now.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingTop: 60, paddingHorizontal: 20 },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#64748b', fontSize: 12, marginTop: 4, marginBottom: 16 },
  error: { color: '#f87171', marginBottom: 12 },
  list: { paddingBottom: 40 },
  card: { backgroundColor: '#1e293b', borderRadius: 10, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  incidentType: { color: '#fff', fontSize: 16, fontWeight: '600', textTransform: 'capitalize' },
  severityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  severityText: { color: '#fff', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  detail: { color: '#94a3b8', fontSize: 13, marginTop: 6 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
});
