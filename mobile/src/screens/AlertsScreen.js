import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useNotificationHistory } from './useNotificationHistory';

const CHANNEL_LABEL = {
  fcm: 'Push notification',
  local: 'In-app alert',
};

function AlertCard({ notification }) {
  const incident = notification.incident;
  return (
    <View style={styles.card}>
      <Text style={styles.type}>
        {incident ? incident.incident_type.replace('_', ' ') : `Incident #${notification.incident_id}`}
      </Text>
      <Text style={styles.meta}>
        {CHANNEL_LABEL[notification.channel] || notification.channel} · {notification.status}
      </Text>
      <Text style={styles.time}>{new Date(notification.created_at).toLocaleString()}</Text>
    </View>
  );
}

export default function AlertsScreen() {
  const { items, error, load } = useNotificationHistory();
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Most recent alerts only — the full record lives in History.
  const recent = items.slice(0, 10);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alerts</Text>
      <Text style={styles.subtitle}>
        Real-time delivery (push on Android, in-app on iOS) is wired up in Session 10 — this list shows
        what's been recorded so far.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={recent}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <AlertCard notification={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ListEmptyComponent={<Text style={styles.empty}>No alerts yet.</Text>}
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
  type: { color: '#fff', fontSize: 16, fontWeight: '600', textTransform: 'capitalize' },
  meta: { color: '#94a3b8', fontSize: 13, marginTop: 4, textTransform: 'capitalize' },
  time: { color: '#64748b', fontSize: 12, marginTop: 4 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
});
