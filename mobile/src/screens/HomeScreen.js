import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import * as api from '../api/endpoints';
import { useLiveSocket } from '../api/useLiveSocket';
import { registerForPushNotifications } from '../notifications/registerPushToken';
import { colors, radius, shadow, spacing, typography } from '../theme';

const SEVERITY_MAP_COLOR = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
};

const DEFAULT_CENTER = [12.9716, 77.5946]; // fallback before location is known

// Static shell HTML — loaded ONCE. All incident/location updates after
// that go through window.updateData() via injectJavaScript, not a fresh
// page load. Reloading the whole WebView on every update (the previous
// approach) is unreliable — react-native-webview doesn't consistently
// re-render when only the `source.html` prop changes on an already
// mounted instance, which is why incidents weren't visibly updating.
const MAP_SHELL_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html, body, #map { height: 100%; margin: 0; padding: 0; }</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false, attributionControl: false })
      .setView([${DEFAULT_CENTER[0]}, ${DEFAULT_CENTER[1]}], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    let userMarker = null;
    let hasCentered = false;

    window.updateData = function(userLocation, incidents) {
      markersLayer.clearLayers();

      if (userLocation) {
        if (!userMarker) {
          userMarker = L.circleMarker(userLocation, {
            radius: 8, color: '#2563EB', fillColor: '#2563EB', fillOpacity: 1, weight: 3,
          }).addTo(map);
        } else {
          userMarker.setLatLng(userLocation);
        }
        if (!hasCentered) {
          map.setView(userLocation, 14);
          hasCentered = true;
        }
      }

      incidents.forEach(function(incident) {
        const color = incident.color || '#EF4444';
        const center = [incident.latitude, incident.longitude];

        // Real, meters-based alert radius — scales correctly with actual
        // ground distance as you zoom, matching the dashboard's map.
        L.circle(center, {
          radius: incident.radius_meters,
          color: color,
          fillOpacity: 0.12,
          weight: 2,
        }).addTo(markersLayer);

        // Small fixed-size center marker — reliable tap target
        // regardless of zoom level, separate from the radius circle.
        L.circleMarker(center, {
          radius: 8, color: color, fillColor: color, fillOpacity: 0.95, weight: 2,
        }).addTo(markersLayer).on('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ incidentId: incident.id }));
        });
      });
    };
  </script>
</body>
</html>`;

export default function HomeScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [locationStatus, setLocationStatus] = useState('unknown'); // unknown | granted | denied
  const [setupWarning, setSetupWarning] = useState('');
  const [isMapReady, setIsMapReady] = useState(false);

  const webViewRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const userLocation = useMemo(
    () => (user?.latitude != null && user?.longitude != null ? [user.latitude, user.longitude] : null),
    [user]
  );

  const loadIncidents = useCallback(async () => {
    try {
      const data = await api.getActiveIncidents();
      setIncidents(data);
    } catch {
      setIncidents([]);
    }
  }, []);

  useLiveSocket((event) => {
    if (event.type === 'incident_created' || event.type === 'incident_updated') {
      loadIncidents();
    }
  });

  // Push fresh data into the already-loaded map whenever incidents or
  // location changes — no WebView reload, so it's instant and doesn't
  // flash/re-tile.
  useEffect(() => {
    if (!isMapReady) return;
    const payload = incidents.map((i) => ({ ...i, color: SEVERITY_MAP_COLOR[i.severity] || '#EF4444' }));
    webViewRef.current?.injectJavaScript(
      `window.updateData(${JSON.stringify(userLocation)}, ${JSON.stringify(payload)}); true;`
    );
  }, [incidents, userLocation, isMapReady]);

  // Subtle pulse on the alert banner while an incident is active — draws
  // the eye without being obnoxious.
  useEffect(() => {
    if (incidents.length === 0) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [incidents.length, pulseAnim]);

  const enableAlerts = useCallback(async () => {
    setSetupWarning('');

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
    });

    const pushResult = await registerForPushNotifications();
    if (pushResult.error) {
      setSetupWarning(pushResult.error);
    }

    await refreshUser();
  }, [refreshUser]);

  useFocusEffect(
    useCallback(() => {
      loadIncidents();
    }, [loadIncidents])
  );

  const handleMapMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.incidentId) {
        navigation.navigate('IncidentDetail', { incidentId: data.incidentId });
      }
    } catch {
      // ignore malformed messages from the map
    }
  };

  const hasLocation = userLocation !== null;
  const hasIncidents = incidents.length > 0;

  const bannerText =
    incidents.length === 1
      ? `${incidents[0].incident_type.replace('_', ' ')} — active incident nearby`
      : `${incidents.length} active incidents nearby`;
  const bannerColor = incidents.some((i) => i.severity === 'critical') ? colors.danger : colors.warning;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: MAP_SHELL_HTML }}
        style={styles.map}
        onLoadEnd={() => setIsMapReady(true)}
        onMessage={handleMapMessage}
      />

      {/* Floating top pill */}
      <View style={styles.topPill}>
        <View>
          <Text style={styles.greetingLabel}>Welcome back</Text>
          <Text style={styles.greeting}>{user?.full_name?.split(' ')[0] || 'there'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.countBadge, hasIncidents ? styles.countBadgeAlert : styles.countBadgeSafe]}
          onPress={() => navigation.navigate('NearbyIncidents')}
          activeOpacity={0.8}
        >
          <Text style={[styles.countValue, { color: hasIncidents ? colors.danger : colors.secondary }]}>
            {incidents.length}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Prominent alert banner — only shown when something is actually
          active, distinct from the small count badge above */}
      {hasIncidents && (
        <TouchableOpacity onPress={() => navigation.navigate('NearbyIncidents')} activeOpacity={0.85}>
          <Animated.View style={[styles.alertBanner, { backgroundColor: bannerColor, opacity: pulseAnim }]}>
            <Ionicons name="warning" size={16} color={colors.white} />
            <Text style={styles.alertBannerText}>{bannerText}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.white} />
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* Floating bottom card — just the primary action now. Alerts,
          History, and Profile already have dedicated tabs right below
          this; duplicating them here was redundant clutter. */}
      <View style={styles.bottomCard}>
        {locationStatus === 'denied' && (
          <View style={styles.warningRow}>
            <Ionicons name="alert-circle" size={14} color={colors.warning} />
            <Text style={styles.warningText}>Location denied — enable it in Settings for area alerts.</Text>
          </View>
        )}
        {setupWarning ? (
          <View style={styles.warningRow}>
            <Ionicons name="alert-circle" size={14} color={colors.warning} />
            <Text style={styles.warningText}>{setupWarning}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.primaryButton} onPress={enableAlerts} activeOpacity={0.85}>
          <Ionicons name="notifications" size={17} color={colors.white} />
          <Text style={styles.primaryButtonText}>
            {hasLocation ? 'Update location & notifications' : 'Enable alerts for your area'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  map: { flex: 1 },

  topPill: {
    position: 'absolute',
    top: 56,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadow.raised,
  },
  greetingLabel: { ...typography.small, color: colors.textMuted },
  greeting: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginTop: 1 },
  countBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeSafe: { backgroundColor: colors.secondarySoft },
  countBadgeAlert: { backgroundColor: colors.dangerSoft },
  countValue: { fontSize: 16, fontWeight: '700' },

  alertBanner: {
    position: 'absolute',
    top: 122,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadow.card,
  },
  alertBannerText: { flex: 1, color: colors.white, fontWeight: '700', fontSize: 13, textTransform: 'capitalize' },

  bottomCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.raised,
  },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  warningText: { color: '#92400E', fontSize: 12, flex: 1, lineHeight: 16 },

  primaryButton: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: colors.white, fontWeight: '600', fontSize: 14 },
});
