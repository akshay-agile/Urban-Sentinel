import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useNotificationHistory } from './useNotificationHistory';
import { colors, radius, spacing, typography } from '../theme';

function HistoryRow({ notification, isLast }) {
  const incident = notification.incident;
  return (
    <View style={styles.row}>
      <View style={styles.timelineCol}>
        <View style={styles.dot} />
        {!isLast && <View style={styles.line} />}
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.type}>
          {incident ? incident.incident_type.replace('_', ' ') : `Incident #${notification.incident_id}`}
          {incident ? ` · ${incident.severity}` : ''}
        </Text>
        <Text style={styles.time}>{new Date(notification.created_at).toLocaleString()}</Text>
        {incident?.status === 'resolved' && (
          <View style={styles.resolvedPill}>
            <Ionicons name="checkmark-circle" size={12} color={colors.secondary} />
            <Text style={styles.resolvedText}>Resolved</Text>
          </View>
        )}
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
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Incident History</Text>
        <Text style={styles.subtitle}>Every alert you've ever received, most recent first.</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => <HistoryRow notification={item} isLast={index === items.length - 1} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No history yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 60, paddingHorizontal: spacing.xl },
  headerBlock: { marginBottom: spacing.lg },
  title: { ...typography.h2, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  error: { color: colors.danger, marginBottom: spacing.md },
  list: { paddingBottom: 40 },
  row: { flexDirection: 'row' },
  timelineCol: { alignItems: 'center', width: 20 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 4 },
  line: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4 },
  rowContent: { flex: 1, paddingBottom: spacing.xl, paddingLeft: spacing.md },
  type: { ...typography.bodyMedium, color: colors.textPrimary, textTransform: 'capitalize' },
  time: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  resolvedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.secondarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  resolvedText: { color: colors.secondary, fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60, gap: spacing.md },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
});
