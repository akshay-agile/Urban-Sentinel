import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import * as api from '../api/endpoints';
import { BrandMark, PageHeader, Screen } from '../components/UI';
import { colors, radius, spacing, typography } from '../theme';

export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => { setFullName(user?.full_name || ''); setPhoneNumber(user?.phone_number || ''); }, [user?.full_name, user?.phone_number]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await api.updateMe({ full_name: fullName, phone_number: phoneNumber || null });
      await refreshUser();
      setMessage({ success: true, text: 'Profile saved.' });
    } catch {
      setMessage({ success: false, text: "Couldn't save changes. Check your connection and try again." });
    } finally { setIsSaving(false); }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <PageHeader eyebrow="Account" title="Profile" subtitle="Manage your contact details and alert settings." right={<BrandMark size={46}/>}/>
        <View style={styles.identity}><View style={styles.avatar}><Text style={styles.avatarText}>{initials(user?.full_name)}</Text></View><View style={styles.identityCopy}><Text style={styles.name}>{user?.full_name || 'Urban Sentinel user'}</Text><Text style={styles.email}>{user?.email}</Text><Text style={styles.accountId}>Account #{user?.id}</Text></View></View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Contact information</Text>
          <Text style={styles.label}>Full name</Text><TextInput accessibilityLabel="Full name" style={styles.input} value={fullName} onChangeText={setFullName} placeholderTextColor={colors.textMuted} autoCapitalize="words"/>
          <Text style={styles.label}>Phone number</Text><TextInput accessibilityLabel="Phone number" style={styles.input} value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" placeholder="Not set" placeholderTextColor={colors.textMuted}/>
          <Text style={styles.label}>Location on account</Text>
          <View style={styles.location}><Ionicons name="location-outline" size={17} color={colors.primary}/><Text style={styles.locationText}>{user?.latitude != null && user?.longitude != null ? `${Number(user.latitude).toFixed(5)}, ${Number(user.longitude).toFixed(5)}` : 'Not set · use Home to register your current location'}</Text></View>
          {message ? <Text accessibilityRole="alert" style={[styles.message, { color: message.success ? colors.success : colors.danger }]}>{message.text}</Text> : null}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving} activeOpacity={0.84}>{isSaving ? <ActivityIndicator color={colors.white}/> : <><Ionicons name="checkmark" size={17} color={colors.white}/><Text style={styles.saveText}>Save profile</Text></>}</TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate('Settings')} activeOpacity={0.8}><View style={styles.navIcon}><Ionicons name="options-outline" size={18} color={colors.primary}/></View><View style={styles.navCopy}><Text style={styles.navTitle}>Settings & permissions</Text><Text style={styles.navSubtitle}>Review device notification and location access</Text></View><Ionicons name="chevron-forward" size={17} color={colors.textMuted}/></TouchableOpacity>
        <TouchableOpacity style={styles.logout} onPress={logout} activeOpacity={0.8}><Ionicons name="log-out-outline" size={18} color={colors.danger}/><Text style={styles.logoutText}>Log out</Text></TouchableOpacity>
        <Text style={styles.version}>URBAN SENTINEL · v0.1.0</Text>
      </ScrollView>
    </Screen>
  );
}

function initials(name) { return (name || '?').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase(); }

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl, maxWidth: 720, width: '100%', alignSelf: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  avatar: { width: 54, height: 54, borderRadius: radius.lg, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: '#28517C', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontSize: 18, fontWeight: '800' }, identityCopy: { flex: 1 }, name: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' }, email: { color: colors.textSecondary, fontSize: 12, marginTop: 3 }, accountId: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
  formCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border }, sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm },
  label: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', marginTop: spacing.md, marginBottom: spacing.xs },
  input: { backgroundColor: colors.surface, color: colors.textPrimary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 14 },
  location: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 }, locationText: { flex: 1, color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  message: { fontSize: 12, marginTop: spacing.md }, saveButton: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.primaryDark, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg }, saveText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: spacing.md },
  navIcon: { width: 38, height: 38, backgroundColor: colors.primarySoft, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }, navCopy: { flex: 1 }, navTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' }, navSubtitle: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg, marginTop: spacing.md, borderWidth: 1, borderColor: '#57303A', backgroundColor: colors.dangerSoft, borderRadius: radius.md }, logoutText: { color: colors.danger, fontSize: 13, fontWeight: '700' },
  version: { color: colors.textMuted, fontSize: 9, textAlign: 'center', marginTop: spacing.lg, letterSpacing: 1.2 },
});
