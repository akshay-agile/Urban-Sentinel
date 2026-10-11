import { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useNotificationHistory } from './useNotificationHistory';
import { HazardIcon, PageHeader, Screen, SeverityBadge, StatePanel } from '../components/UI';
import { colors, radius, spacing } from '../theme';

export default function HistoryScreen() {
  const navigation = useNavigation();
  const { items, error, isLoading, isStale, lastUpdated, load } = useNotificationHistory();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setIsRefreshing(true); await load(); setIsRefreshing(false); };

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]}/>}
        ListHeaderComponent={<View><PageHeader eyebrow="Delivery record" title="History" subtitle="Notification records returned by your account history."/>{lastUpdated ? <Text style={styles.updated}>Updated {lastUpdated.toLocaleTimeString()}</Text> : null}{isStale ? <View style={styles.stale}><Ionicons name="cloud-offline-outline" size={15} color={colors.warning}/><Text style={styles.staleText}>Refresh failed. Showing previously loaded history.</Text></View> : null}</View>}
        renderItem={({ item }) => {
          const incident = item.incident;
          return (
            <TouchableOpacity style={styles.row} activeOpacity={0.82} onPress={() => navigation.navigate('IncidentDetail', { incidentId: item.incident_id })}>
              <View style={styles.timeline}><View style={[styles.dot, { backgroundColor: incident?.severity === 'critical' ? colors.danger : colors.primary }]}/><View style={styles.line}/></View>
              <View style={styles.record}>
                <View style={styles.recordTop}><HazardIcon type={incident?.incident_type} size={16}/><Text style={styles.type} numberOfLines={1}>{incident ? incident.incident_type.replaceAll('_', ' ') : `Incident #${item.incident_id}`}</Text>{incident?.severity ? <SeverityBadge severity={incident.severity}/> : null}</View>
                <Text style={styles.location}>{incident ? `${Number(incident.latitude).toFixed(4)}, ${Number(incident.longitude).toFixed(4)}` : 'Incident details unavailable'}</Text>
                <Text style={styles.time}>{new Date(item.created_at).toLocaleString()} · {item.channel} · {item.status}</Text>
                {incident?.status ? <View style={[styles.statusPill, incident.status === 'resolved' ? styles.resolved : styles.active]}><Ionicons name={incident.status === 'resolved' ? 'checkmark-circle' : 'radio'} size={12} color={incident.status === 'resolved' ? colors.success : colors.warning}/><Text style={[styles.statusText, { color: incident.status === 'resolved' ? colors.success : colors.warning }]}>{incident.status === 'resolved' ? 'Resolved' : 'Active incident'}</Text></View> : null}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={isLoading ? <StatePanel loading title="Loading history" message="Retrieving your notification records."/> : error ? <StatePanel icon="cloud-offline-outline" title="History unavailable" message={error} actionLabel="Try again" onAction={load} error/> : <StatePanel icon="time-outline" title="No history yet" message="Your recorded alert deliveries will appear here."/>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  updated: { color: colors.textMuted, fontSize: 10, marginTop: -spacing.md, marginBottom: spacing.md },
  stale: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.warningSoft, borderWidth: 1, borderColor: '#6A5123', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  staleText: { color: colors.textSecondary, fontSize: 11, flex: 1 },
  row: { flexDirection: 'row', gap: spacing.md },
  timeline: { alignItems: 'center', width: 14 },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 8 },
  line: { flex: 1, width: 1, backgroundColor: colors.border, marginTop: 6 },
  record: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  recordTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  type: { color: colors.textPrimary, flex: 1, fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  location: { color: colors.textSecondary, fontSize: 11, marginTop: spacing.sm },
  time: { color: colors.textMuted, fontSize: 10, marginTop: 5 },
  statusPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 4, marginTop: spacing.sm },
  resolved: { backgroundColor: colors.successSoft }, active: { backgroundColor: colors.warningSoft },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
});
