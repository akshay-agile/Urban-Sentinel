import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useNotificationHistory } from './useNotificationHistory';

function HistoryRow({ notification }) {
  const incident = notification.incident;
  return (
    <View style={styles.row}>
      <View style={styles.dot} />
      <View style={styles.rowContent}>
        <Text style={styles.type}>
          {incident ? incident.incident_type.replace('_', ' ') : `Incident #${notification.incident_id}`}
          {incident ? ` · ${incident.severity}` : ''}
        </Text>
        <Text style={styles.time}>{new Date(notification.created_at).toLocaleString()}</Text>
        {incident?.status === 'resolved' && <Text style={styles.resolved}>Resolved</Text>}
      </View>
    </View>
  );
}

export default function HistoryScreen() {
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Incident History</Text>
      <Text style={styles.subtitle}>Every alert you've ever received, most recent first.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <HistoryRow notification={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ListEmptyComponent={<Text style={styles.empty}>No history yet.</Text>}
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
  row: { flexDirection: 'row', marginBottom: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#dc2626', marginTop: 6, marginRight: 12 },
  rowContent: { flex: 1 },
  type: { color: '#fff', fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
  time: { color: '#64748b', fontSize: 12, marginTop: 2 },
  resolved: { color: '#22c55e', fontSize: 12, marginTop: 2 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
});
