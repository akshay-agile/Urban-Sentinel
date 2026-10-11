import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PageHeader, Screen } from '../components/UI';
import { colors, radius, spacing } from '../theme';

const GUIDES = [
  {
    key: 'fire', title: 'Fire or smoke', icon: 'flame-outline', color: '#B33A3E', wash: '#FCEBED', source: 'Delhi Fire Service guidance', url: 'https://dfs.delhi.gov.in/dfs/do-and-do-not',
    steps: ['Raise the alarm and leave by the nearest safe exit.', 'Do not use a lift to escape a fire.', 'Call emergency services from a safe place. Do not take undue risks trying to fight the fire.'],
  },
  {
    key: 'flood', title: 'Flooding', icon: 'water-outline', color: '#2768B2', wash: '#E8F3FC', source: 'Government of India flood guidance', url: 'https://www.dgfscdhg.gov.in/urban-floods',
    steps: ['Follow local authority instructions and move to a safer, higher place when needed.', 'Do not walk or drive through floodwater; stay away from drains and fallen power lines.', 'Avoid floodwater contact because it may be contaminated.'],
  },
  {
    key: 'road', title: 'Road accident', icon: 'car-sport-outline', color: '#985514', wash: '#FFF3D9', source: 'Goa Police accident guidance', url: 'https://citizen.goapolice.gov.in/web/guest/in-case-of-accidents',
    steps: ['Keep yourself out of traffic and approach only if the scene is safe.', 'Call 112 for urgent police, fire, or medical assistance in India.', 'Do not move vehicles unless directed by police, needed to free a trapped person, or necessary to prevent a serious obstruction.'],
  },
];

export default function SafetyGuideScreen() {
  const openEmergency = async () => {
    try { await Linking.openURL('tel:112'); } catch { /* Keep the official number visible in the screen. */ }
  };
  const openSource = async (url) => { try { await Linking.openURL(url); } catch { /* Source name remains visible if no browser is available. */ } };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader eyebrow="Preparedness" title="Safety guide" subtitle="General precautions from government sources. Follow emergency personnel and local authority instructions."/>
        {GUIDES.map((guide) => (
          <View key={guide.key} style={styles.guideCard}>
            <View style={styles.guideHeader}>
              <View style={[styles.guideIcon, { backgroundColor: guide.wash }]}><Ionicons name={guide.icon} size={19} color={guide.color}/></View>
              <Text style={styles.guideTitle}>{guide.title}</Text>
            </View>
            {guide.steps.map((step, index) => (
              <View key={step} style={styles.stepRow}><Text style={[styles.stepNumber, { color: guide.color }]}>{String(index + 1).padStart(2, '0')}</Text><Text style={styles.stepText}>{step}</Text></View>
            ))}
            <TouchableOpacity accessibilityRole="link" onPress={() => openSource(guide.url)} style={styles.sourceLink}>
              <Text style={styles.sourceText}>{guide.source}</Text><Ionicons name="open-outline" size={13} color={colors.primary}/>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.emergencyCard}>
          <View style={styles.emergencyCopy}><Text style={styles.emergencyTitle}>Emergency in India?</Text><Text style={styles.emergencyText}>112 is the Government of India’s pan-India emergency number. The button opens your dialler; this app does not contact the service or share your location.</Text></View>
          <TouchableOpacity accessibilityRole="button" onPress={openEmergency} style={styles.callButton}><Ionicons name="call-outline" size={17} color={colors.white}/><Text style={styles.callText}>Call 112</Text></TouchableOpacity>
        </View>

        <View style={styles.volunteerCard}>
          <Ionicons name="people-outline" size={19} color={colors.textMuted}/>
          <View style={styles.volunteerCopy}><Text style={styles.volunteerTitle}>Volunteer assistance</Text><Text style={styles.volunteerText}>A verified volunteer network and assistance opportunities are not available in this app. Do not enter hazardous areas to help.</Text></View>
        </View>
        <Text style={styles.disclaimer}>This general information is not an evacuation order, emergency dispatch, or substitute for local emergency services.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxxl, maxWidth: 720, width: '100%', alignSelf: 'center' },
  guideCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.card, padding: spacing.lg, marginBottom: spacing.md },
  guideHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  guideIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  guideTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  stepNumber: { fontSize: 10, fontWeight: '800', paddingTop: 2 },
  stepText: { flex: 1, color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  sourceLink: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingTop: spacing.sm },
  sourceText: { color: colors.primary, fontSize: 10, fontWeight: '700' },
  emergencyCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.dangerSoft, borderColor: '#F0C8CC', borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  emergencyCopy: { flex: 1 }, emergencyTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  emergencyText: { color: colors.textSecondary, fontSize: 10, lineHeight: 16, marginTop: 4 },
  callButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.danger, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md },
  callText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  volunteerCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  volunteerCopy: { flex: 1 }, volunteerTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  volunteerText: { color: colors.textMuted, fontSize: 10, lineHeight: 16, marginTop: 4 },
  disclaimer: { color: colors.textMuted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: spacing.lg },
});
