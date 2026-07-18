import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import * as api from '../api/endpoints';

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>

      <Text style={styles.label}>Email</Text>
      <Text style={styles.readOnly}>{user?.email}</Text>

      <Text style={styles.label}>Full name</Text>
      <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

      <Text style={styles.label}>Phone number</Text>
      <TextInput
        style={styles.input}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        placeholder="Not set"
        placeholderTextColor="#64748b"
      />

      <Text style={styles.label}>Location on file</Text>
      <Text style={styles.readOnly}>
        {user?.latitude != null ? `${user.latitude.toFixed(4)}, ${user.longitude.toFixed(4)}` : 'Not set — enable on Home'}
      </Text>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
        <Text style={styles.settingsButtonText}>Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 60 },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
  label: { color: '#64748b', fontSize: 12, marginTop: 16, marginBottom: 6, textTransform: 'uppercase' },
  readOnly: { color: '#94a3b8', fontSize: 15 },
  input: { backgroundColor: '#1e293b', color: '#fff', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 },
  message: { color: '#22c55e', marginTop: 16 },
  saveButton: { backgroundColor: '#dc2626', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 28 },
  saveButtonText: { color: '#fff', fontWeight: '600' },
  settingsButton: { backgroundColor: '#1e293b', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#334155' },
  settingsButtonText: { color: '#fff', fontWeight: '600' },
  logoutButton: { padding: 14, alignItems: 'center', marginTop: 12 },
  logoutButtonText: { color: '#f87171', fontWeight: '600' },
});
