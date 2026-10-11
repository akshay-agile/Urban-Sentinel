import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PageHeader, Screen } from '../components/UI';
import { colors, radius, spacing } from '../theme';

export default function ReportScreen() {
  const callEmergency = async () => {
    try { await Linking.openURL('tel:112'); } catch { /* The emergency number is also shown below if dialling is unavailable. */ }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader eyebrow="Citizen reporting" title="Report a hazard" subtitle="Report submission is not available in this app yet."/>
        <View style={styles.notice}>
          <View style={styles.noticeIcon}><Ionicons name="information-circle-outline" size={22} color={colors.warning}/></View>
          <Text style={styles.noticeTitle}>A review workflow is required</Text>
          <Text style={styles.noticeText}>The current incident API creates an active authority incident and may send alerts to nearby users immediately. It does not create a pending citizen report or record that a report is unverified, so this screen does not submit to that endpoint.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>If someone needs urgent help</Text>
          <Text style={styles.cardText}>In India, call 112. This button opens your phone dialler; it does not send a request or location through Urban Sentinel.</Text>
          <TouchableOpacity accessibilityRole="button" onPress={callEmergency} style={styles.callButton}>
            <Ionicons name="call-outline" size={17} color={colors.white}/><Text style={styles.callText}>Open dialler for 112</Text>
          </TouchableOpacity>
          <Text style={styles.number}>Emergency number: 112</Text>
        </View>
        <Text style={styles.footer}>A citizen submission form will be enabled when the service can store reports as pending verification and keep them separate from confirmed incidents.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxxl, maxWidth: 720, width: '100%', alignSelf: 'center' },
  notice: { alignItems: 'flex-start', backgroundColor: colors.warningSoft, borderWidth: 1, borderColor: '#EBD5A7', borderRadius: radius.xl, padding: spacing.lg },
  noticeIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  noticeTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  noticeText: { color: colors.textSecondary, fontSize: 12, lineHeight: 19, marginTop: spacing.sm },
  card: { marginTop: spacing.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  cardTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  cardText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
  callButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.danger, borderRadius: radius.md, paddingVertical: 13, marginTop: spacing.lg },
  callText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  number: { color: colors.textMuted, textAlign: 'center', fontSize: 11, marginTop: spacing.sm },
  footer: { color: colors.textMuted, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: spacing.lg },
});
