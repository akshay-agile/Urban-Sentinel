import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

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
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>Emergency notifications</Text>
          <Text style={styles.rowHint}>
            Android: background push. iOS: alerts while the app is open (see Home for why).
          </Text>
        </View>
        <Switch value={pushEnabled} onValueChange={setPushEnabled} />
      </View>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>Share my location</Text>
          <Text style={styles.rowHint}>Needed to match you against nearby incidents.</Text>
        </View>
        <Switch value={locationSharing} onValueChange={setLocationSharing} />
      </View>

      <Text style={styles.version}>Urban Sentinel · v0.1.0 (Session 6)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20, paddingTop: 60 },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  rowText: { flex: 1, marginRight: 12 },
  rowLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  rowHint: { color: '#64748b', fontSize: 12, marginTop: 4 },
  version: { color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 32 },
});
