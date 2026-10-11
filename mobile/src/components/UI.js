import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, hazardColors, radius, severityColors, spacing, typography } from '../theme';
import { distanceAndDirection, formatDistance } from '../utils/geo';

export function Screen({ children, style, edges = ['top'] }) {
  return <SafeAreaView edges={edges} style={[styles.screen, style]}>{children}</SafeAreaView>;
}

export function PageHeader({ eyebrow, title, subtitle, right }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function BrandMark({ size = 42 }) {
  return <Image source={require('../../assets/urban-sentinel-icon.png')} style={{ width: size, height: size, borderRadius: size * 0.23 }} resizeMode="contain" accessibilityLabel="Urban Sentinel shield"/>;
}

export function SeverityBadge({ severity = 'medium' }) {
  const tone = severityColors[String(severity).toLowerCase()] || severityColors.medium;
  return <View style={[styles.badge, { backgroundColor: tone.bg }]}><Text style={[styles.badgeText, { color: tone.fg }]}>{severity}</Text></View>;
}

export function HazardIcon({ type, size = 19 }) {
  const key = String(type || '').toLowerCase();
  const icon = key.includes('fire') || key.includes('smoke') ? 'flame'
    : key.includes('flood') || key.includes('water') ? 'water'
      : key.includes('accident') || key.includes('road') ? 'car-sport'
        : key.includes('gas') ? 'warning' : 'alert-circle';
  const color = hazardColors[key] || colors.hazardOther;
  return <View style={[styles.hazardIcon, { backgroundColor: `${color}20` }]}><Ionicons name={icon} size={size} color={color}/></View>;
}

export function StatePanel({ icon = 'shield-checkmark-outline', title, message, actionLabel, onAction, loading = false, error = false, compact = false }) {
  return (
    <View style={[styles.statePanel, compact && styles.statePanelCompact]}>
      {loading ? <ActivityIndicator size="small" color={colors.primary}/> : <Ionicons name={icon} size={compact ? 25 : 31} color={error ? colors.danger : colors.textMuted}/>}
      <Text style={styles.stateTitle}>{title}</Text>
      {message ? <Text style={styles.stateMessage}>{message}</Text> : null}
      {actionLabel && onAction ? <TouchableOpacity onPress={onAction} style={styles.stateAction} activeOpacity={0.8}><Text style={styles.stateActionText}>{actionLabel}</Text></TouchableOpacity> : null}
    </View>
  );
}

export function Surface({ children, style }) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

export function IncidentListCard({ incident, onPress, userLocation }) {
  const distance = distanceAndDirection(userLocation, [incident.latitude, incident.longitude]);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={styles.incidentCard}>
      <HazardIcon type={incident.incident_type}/>
      <View style={styles.incidentCopy}>
        <View style={styles.incidentTitleRow}><Text style={styles.incidentTitle} numberOfLines={1}>{String(incident.incident_type || 'Incident').replaceAll('_', ' ')}</Text><SeverityBadge severity={incident.severity}/></View>
        <Text style={styles.incidentLocation}>{distance ? `${formatDistance(distance.distanceMeters)} ${distance.direction} · straight-line` : `${Number(incident.latitude).toFixed(4)}, ${Number(incident.longitude).toFixed(4)}`}</Text>
        <Text style={styles.incidentTime}>Active · Detected {new Date(incident.detected_at).toLocaleString()}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted}/>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.xl, paddingTop: spacing.sm },
  headerCopy: { flex: 1, minWidth: 0, paddingTop: 2 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.8, marginBottom: 7 },
  headerTitle: { fontSize: 25, lineHeight: 31, fontWeight: '800', letterSpacing: -0.55, color: colors.textPrimary, flexShrink: 1 },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 7, lineHeight: 18, maxWidth: 310 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  hazardIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  statePanel: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, minHeight: 190, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  statePanelCompact: { minHeight: 130, padding: spacing.lg },
  stateTitle: { ...typography.bodyMedium, color: colors.textPrimary, textAlign: 'center', marginTop: spacing.md },
  stateMessage: { ...typography.caption, color: colors.textSecondary, lineHeight: 19, textAlign: 'center', marginTop: spacing.xs, maxWidth: 300 },
  stateAction: { borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.elevated, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md, marginTop: spacing.md },
  stateActionText: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  surface: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  incidentCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  incidentCopy: { flex: 1, minWidth: 0 },
  incidentTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  incidentTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', textTransform: 'capitalize', flex: 1 },
  incidentLocation: { color: colors.textSecondary, fontSize: 11, marginTop: 5 },
  incidentTime: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
});
