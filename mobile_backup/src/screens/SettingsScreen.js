import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadow, spacing, typography } from '../theme';

/**
 * Client-side placeholders for now. The Session 10 notification
 * architecture decision (FCM on Android, foreground-only local on iOS)
 * means the actual toggle-to-behavior wiring happens then — this screen
 * exists so the UI/UX is in place ahead of that.
 */
export default function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name="notifications" size={18} color={colors.primary} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>Emergency notifications</Text>
          <Text style={styles.rowHint}>
            Android: background push. iOS: alerts while the app is open.
          </Text>
        </View>
        <Switch
          value={pushEnabled}
          onValueChange={setPushEnabled}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name="location" size={18} color={colors.primary} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>Share my location</Text>
          <Text style={styles.rowHint}>Needed to match you against nearby incidents.</Text>
        </View>
        <Switch
          value={locationSharing}
          onValueChange={setLocationSharing}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>

      <Text style={styles.version}>Urban Sentinel · v0.1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingTop: 64 },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
  rowText: { flex: 1, marginRight: spacing.md },
  rowLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  rowHint: { ...typography.small, color: colors.textSecondary, marginTop: 3, lineHeight: 16 },
  version: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: spacing.xxl },
});
