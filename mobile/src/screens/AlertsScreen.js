import { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useNotificationHistory } from './useNotificationHistory';
import { HazardIcon, PageHeader, Screen, SeverityBadge, StatePanel } from '../components/UI';
import { colors, radius, spacing } from '../theme';

const CHANNEL_LABEL = { fcm: 'Push notification', local: 'In-app alert' };

export default function AlertsScreen() {
  const navigation = useNavigation();
  const { items, error, isLoading, isStale, lastUpdated, load } = useNotificationHistory();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const ListHeader = (
    <View>
      <PageHeader eyebrow="Your notifications" title="Alerts" subtitle="Recorded deliveries for incidents matched to your account." right={<TouchableOpacity onPress={() => navigation.navigate('History')} style={styles.historyLink}><Text style={styles.historyLinkText}>History</Text></TouchableOpacity>}/>
      {lastUpdated ? <Text style={styles.updated}>Updated {lastUpdated.toLocaleTimeString()}</Text> : null}
      {isStale ? <View style={styles.stale}><Ionicons name="cloud-offline-outline" size={15} color={colors.warning}/><Text style={styles.staleText}>Refresh failed. Showing previously loaded alerts.</Text></View> : null}
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={ListHeader}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]}/>}
        renderItem={({ item }) => {
          const incident = item.incident;
          return (
            <TouchableOpacity style={styles.card} activeOpacity={0.82} onPress={() => navigation.navigate('IncidentDetail', { incidentId: item.incident_id })}>
              <HazardIcon type={incident?.incident_type}/>
              <View style={styles.body}>
                <View style={styles.titleRow}><Text style={styles.type} numberOfLines={1}>{incident ? incident.incident_type.replaceAll('_', ' ') : `Incident #${item.incident_id}`}</Text>{incident?.severity ? <SeverityBadge severity={incident.severity}/> : null}</View>
                <Text style={styles.location}>{incident ? `${Number(incident.latitude).toFixed(4)}, ${Number(incident.longitude).toFixed(4)}` : 'Incident details unavailable'}</Text>
                <View style={styles.metaRow}><Text style={styles.meta}>{CHANNEL_LABEL[item.channel] || item.channel} · {item.status}</Text><Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text></View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted}/>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={isLoading ? <StatePanel loading title="Loading alerts" message="Retrieving your recorded notification history."/> : error ? <StatePanel icon="cloud-offline-outline" title="Alerts unavailable" message={error} actionLabel="Try again" onAction={load} error/> : <StatePanel icon="notifications-off-outline" title="No alerts recorded" message="When an incident notification is created for your account, it will appear here."/>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  updated: { color: colors.textMuted, fontSize: 10, marginTop: -spacing.md, marginBottom: spacing.md },
  historyLink: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  historyLinkText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  stale: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', backgroundColor: colors.warningSoft, borderColor: '#EBD5A7', borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  staleText: { color: colors.textSecondary, fontSize: 11, flex: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  type: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', textTransform: 'capitalize', flex: 1 },
  location: { color: colors.textSecondary, fontSize: 11, marginTop: 5 },
  metaRow: { marginTop: 7, gap: 2 },
  meta: { color: colors.primary, fontSize: 10, fontWeight: '600' },
  time: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
});
