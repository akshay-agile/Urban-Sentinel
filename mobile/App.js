/**
 * Urban Sentinel — Mobile App Entrypoint
 *
 * Session 1: skeleton only. Navigation, auth screens, and all feature
 * screens (Home, Alerts, Nearby Incidents, History, Profile, Settings)
 * are built in Session 6.
 */
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Urban Sentinel</Text>
      <Text style={styles.subtitle}>Mobile app skeleton — Session 1</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 8,
  },
});
