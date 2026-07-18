import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import * as api from '../api/endpoints';

export default function HomeScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [incidentCount, setIncidentCount] = useState(null);
  const [locationStatus, setLocationStatus] = useState('unknown'); // unknown | granted | denied
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadIncidents = useCallback(async () => {
    try {
      const incidents = await api.getActiveIncidents();
      setIncidentCount(incidents.length);
    } catch {
      setIncidentCount(null);
    }
  }, []);

  const requestLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationStatus('denied');
      return;
    }
    setLocationStatus('granted');
    const position = await Location.getCurrentPositionAsync({});
    await api.updateMe({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
    await refreshUser();
  }, [refreshUser]);

  useFocusEffect(
    useCallback(() => {
      loadIncidents();
    }, [loadIncidents])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadIncidents();
    setIsRefreshing(false);
  };

  const hasLocation = user?.latitude != null && user?.longitude != null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#fff" />}
    >
      <Text style={styles.greeting}>Hi, {user?.full_name?.split(' ')[0] || 'there'}</Text>
      <Text style={styles.subtitle}>Urban Sentinel is watching your area</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Active incidents citywide</Text>
        <Text style={styles.cardValue}>{incidentCount === null ? '—' : incidentCount}</Text>
        <Text style={styles.cardHint}>
          Nearby-only filtering by distance arrives once the Radius Engine is built (Session 9) — this
          currently shows every active incident.
        </Text>
      </View>

      {!hasLocation && locationStatus !== 'denied' && (
        <TouchableOpacity style={styles.locationButton} onPress={requestLocation}>
          <Text style={styles.locationButtonText}>Enable location to get alerts for your area</Text>
        </TouchableOpacity>
      )}

      {locationStatus === 'denied' && (
        <Text style={styles.warning}>
          Location permission denied — you won't receive area-specific alerts until this is enabled in
          your phone's Settings.
        </Text>
      )}

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('NearbyIncidents')}>
        <Text style={styles.secondaryButtonText}>View Nearby Incidents</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingTop: 60 },
  greeting: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#94a3b8', fontSize: 14, marginTop: 4, marginBottom: 24 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16 },
  cardLabel: { color: '#94a3b8', fontSize: 13 },
  cardValue: { color: '#fff', fontSize: 40, fontWeight: 'bold', marginTop: 4 },
  cardHint: { color: '#64748b', fontSize: 12, marginTop: 8 },
  locationButton: { backgroundColor: '#dc2626', borderRadius: 8, padding: 16, marginBottom: 16 },
  locationButtonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  warning: { color: '#fbbf24', fontSize: 13, marginBottom: 16 },
  secondaryButton: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryButtonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
});
