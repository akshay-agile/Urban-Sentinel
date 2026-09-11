import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import * as api from '../api/endpoints';
import { colors, radius, shadow, spacing, typography } from '../theme';

export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      await api.updateMe({ full_name: fullName, phone_number: phoneNumber || null });
      await refreshUser();
      setMessage('Saved.');
    } catch {
      setMessage("Couldn't save changes. Check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  const initials = (user?.full_name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarBlock}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Full name</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

        <Text style={styles.label}>Phone number</Text>
        <TextInput
          style={styles.input}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          placeholder="Not set"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Location on file</Text>
        <View style={styles.readOnlyRow}>
          <Ionicons name="location" size={16} color={colors.textSecondary} />
          <Text style={styles.readOnly}>
            {user?.latitude != null ? `${user.latitude.toFixed(4)}, ${user.longitude.toFixed(4)}` : 'Not set — enable on Home'}
          </Text>
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving} activeOpacity={0.85}>
          {isSaving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')} activeOpacity={0.7}>
        <Ionicons name="settings-outline" size={18} color={colors.textPrimary} />
        <Text style={styles.settingsButtonText}>Settings</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingTop: 64, paddingBottom: spacing.xxxl },
  avatarBlock: { alignItems: 'center', marginBottom: spacing.xxl },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadow.raised,
  },
  avatarText: { color: colors.white, fontSize: 26, fontWeight: '700' },
  name: { ...typography.h2, color: colors.textPrimary },
  email: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  label: { ...typography.small, color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.background,
    color: colors.textPrimary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    fontSize: 15,
  },
  readOnlyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  readOnly: { color: colors.textSecondary, fontSize: 14 },
  message: { color: colors.secondary, marginTop: spacing.lg, fontSize: 13 },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveButtonText: { color: colors.white, fontWeight: '600' },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  settingsButtonText: { flex: 1, color: colors.textPrimary, fontWeight: '600' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  logoutButtonText: { color: colors.danger, fontWeight: '600' },
});
