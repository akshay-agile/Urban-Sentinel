import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useNotificationHistory } from './useNotificationHistory';
import { colors, radius, shadow, spacing, typography } from '../theme';

const CHANNEL_LABEL = {
  fcm: 'Push notification',
  local: 'In-app alert',
};

function AlertCard({ notification }) {
  const incident = notification.incident;
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="notifications" size={18} color={colors.primary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.type}>
          {incident ? incident.incident_type.replace('_', ' ') : `Incident #${notification.incident_id}`}
        </Text>
        <Text style={styles.meta}>
          {CHANNEL_LABEL[notification.channel] || notification.channel} · {notification.status}
        </Text>
        <Text style={styles.time}>{new Date(notification.created_at).toLocaleString()}</Text>
      </View>
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

  const recent = items.slice(0, 10);

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Alerts</Text>
        <Text style={styles.subtitle}>
          Push on Android, in-app on iOS — this list shows what's been recorded so far.
        </Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={recent}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <AlertCard notification={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No alerts yet.</Text>
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
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardBody: { flex: 1 },
  type: { ...typography.bodyMedium, color: colors.textPrimary, textTransform: 'capitalize' },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 3, textTransform: 'capitalize' },
  time: { ...typography.small, color: colors.textMuted, marginTop: 3 },
  empty: { alignItems: 'center', marginTop: 60, gap: spacing.md },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
});
