import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import * as api from '../api/endpoints';
import { useLiveSocket } from '../api/useLiveSocket';
import { registerForPushNotifications } from '../notifications/registerPushToken';
import { BrandMark, PageHeader, Screen, SeverityBadge } from '../components/UI';
import { colors, radius, shadow, spacing } from '../theme';

const DEFAULT_CENTER = [12.9716, 77.5946];
const SEVERITY_MAP_COLOR = { low: '#36D6A0', medium: '#F2BC5E', high: '#FB923C', critical: '#FF6678' };

const MAP_SHELL_HTML = `
<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{height:100%;margin:0;padding:0;background:#0B1929}.leaflet-container{background:#0B1929}</style></head>
<body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
const map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${DEFAULT_CENTER[0]},${DEFAULT_CENTER[1]}],12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
const layers=L.layerGroup().addTo(map);let userMarker=null;let hasCentered=false;
window.updateData=function(userLocation,incidents){layers.clearLayers();if(userLocation){if(!userMarker){userMarker=L.circleMarker(userLocation,{radius:7,color:'#4D9BFF',fillColor:'#4D9BFF',fillOpacity:1,weight:3}).addTo(map)}else{userMarker.setLatLng(userLocation)}if(!hasCentered){map.setView(userLocation,13);hasCentered=true}}
incidents.forEach(function(i){const point=[i.latitude,i.longitude],color=i.color||'#FF6577';L.circle(point,{radius:i.radius_meters,color:color,fillOpacity:.1,weight:2}).addTo(layers);L.circleMarker(point,{radius:7,color:color,fillColor:color,fillOpacity:.95,weight:2}).addTo(layers).on('click',function(){window.ReactNativeWebView.postMessage(JSON.stringify({incidentId:i.id}))})})};
</script></body></html>`;

export default function HomeScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [locationStatus, setLocationStatus] = useState('unknown');
  const [setupWarning, setSetupWarning] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [error, setError] = useState('');
  const [isMapReady, setIsMapReady] = useState(false);
  const webViewRef = useRef(null);
  const userLocation = useMemo(() => user?.latitude != null && user?.longitude != null ? [user.latitude, user.longitude] : null, [user]);
  const criticalCount = incidents.filter((incident) => ['high', 'critical'].includes(incident.severity)).length;

  const loadIncidents = useCallback(async () => {
    try {
      const data = await api.getActiveIncidents();
      setIncidents(data);
      setError('');
      setHasLoaded(true);
    } catch {
      setError("Couldn't refresh active incidents. Showing the last loaded view.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useLiveSocket((event) => {
    if (event.type === 'incident_created' || event.type === 'incident_updated') loadIncidents();
  });

  useEffect(() => {
    if (!isMapReady) return;
    const payload = incidents.map((incident) => ({ ...incident, color: SEVERITY_MAP_COLOR[incident.severity] || '#FF6577' }));
    webViewRef.current?.injectJavaScript(`window.updateData(${JSON.stringify(userLocation)},${JSON.stringify(payload)});true;`);
  }, [incidents, userLocation, isMapReady]);

  useFocusEffect(useCallback(() => { loadIncidents(); }, [loadIncidents]));

  const enableAlerts = useCallback(async () => {
    setSetupWarning('');
    setIsEnabling(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        return;
      }
      setLocationStatus('granted');
      const position = await Location.getCurrentPositionAsync({});
      await api.updateMe({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      const pushResult = await registerForPushNotifications();
      if (pushResult.error) setSetupWarning(pushResult.error);
      await refreshUser();
    } catch {
      setSetupWarning("Couldn't update your location or alert registration. Check permissions and your connection, then try again.");
    } finally {
      setIsEnabling(false);
    }
  }, [refreshUser]);

  const handleMapMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.incidentId) navigation.navigate('IncidentDetail', { incidentId: data.incidentId });
    } catch { /* Ignore malformed WebView messages. */ }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader eyebrow="Emergency monitoring" title={`Good ${greeting()}, ${user?.full_name?.split(' ')[0] || 'there'}`} subtitle="Your account status and citywide active incident overview." right={<BrandMark size={48}/>}/>

        <View style={styles.summaryRow}>
          <TouchableOpacity style={styles.metricCard} onPress={() => navigation.navigate('NearbyIncidents')} activeOpacity={0.8}>
            <View style={styles.metricHeading}><Ionicons name="radio-outline" size={15} color={colors.primary}/><Text style={styles.metricLabel}>Active reports</Text></View>
            <Text style={styles.metricValue}>{hasLoaded ? incidents.length : '—'}</Text>
            <Text style={styles.metricHint}>All active incidents</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.metricCard} onPress={() => navigation.navigate('NearbyIncidents')} activeOpacity={0.8}>
            <View style={styles.metricHeading}><Ionicons name="warning-outline" size={15} color={criticalCount ? colors.danger : colors.warning}/><Text style={styles.metricLabel}>High priority</Text></View>
            <Text style={[styles.metricValue, criticalCount > 0 && { color: colors.danger }]}>{hasLoaded ? criticalCount : '—'}</Text>
            <Text style={styles.metricHint}>High or critical severity</Text>
          </TouchableOpacity>
        </View>

        {error ? <View style={styles.staleNotice}><Ionicons name="cloud-offline-outline" size={16} color={colors.warning}/><Text style={styles.staleText}>{error}</Text><TouchableOpacity onPress={loadIncidents}><Text style={styles.retry}>Retry</Text></TouchableOpacity></View> : null}

        <View style={styles.mapCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}><View style={styles.liveDot}/><Text style={styles.sectionTitle}>Incident map</Text></View>
            <TouchableOpacity onPress={() => navigation.navigate('NearbyIncidents')} style={styles.linkButton}><Text style={styles.linkText}>View reports</Text><Ionicons name="arrow-forward" size={14} color={colors.primary}/></TouchableOpacity>
          </View>
          <Text style={styles.mapCaption}>Citywide active reports · select a marker for details</Text>
          <View style={styles.mapWrap}>
            <WebView ref={webViewRef} source={{ html: MAP_SHELL_HTML }} style={styles.map} onLoadEnd={() => setIsMapReady(true)} onMessage={handleMapMessage} javaScriptEnabled domStorageEnabled setSupportMultipleWindows={false}/>
            {!isMapReady ? <View style={styles.mapLoading}><ActivityIndicator color={colors.primary}/><Text style={styles.mapLoadingText}>Loading map</Text></View> : null}
          </View>
          {incidents.length > 0 ? <View style={styles.mapFooter}><Text style={styles.mapFooterText}>{incidents.length} active {incidents.length === 1 ? 'report' : 'reports'}</Text>{criticalCount > 0 ? <SeverityBadge severity={incidents.some((i) => i.severity === 'critical') ? 'critical' : 'high'}/> : <Text style={styles.mapFooterSafe}>No high/critical reports</Text>}</View> : !isLoading && !error ? <View style={styles.mapFooter}><Ionicons name="checkmark-circle" size={15} color={colors.secondary}/><Text style={styles.mapFooterSafe}>No active incidents returned</Text></View> : null}
        </View>

        <View style={styles.locationCard}>
          <View style={styles.locationIcon}><Ionicons name="location" size={18} color={userLocation ? colors.primary : colors.textMuted}/></View>
          <View style={styles.locationCopy}><Text style={styles.locationTitle}>{userLocation ? 'Location registered' : 'Set up area alerts'}</Text><Text style={styles.locationSubtitle}>{userLocation ? `${user.latitude.toFixed(4)}, ${user.longitude.toFixed(4)} · Stored on your account` : 'Share your current location and register this device for alerts.'}</Text></View>
          <TouchableOpacity style={styles.setupButton} onPress={enableAlerts} disabled={isEnabling} activeOpacity={0.8}>{isEnabling ? <ActivityIndicator size="small" color={colors.white}/> : <Ionicons name="arrow-forward" size={17} color={colors.white}/>}</TouchableOpacity>
        </View>
        {locationStatus === 'denied' ? <Text style={styles.setupWarning}>Location permission was denied. Enable it in your device settings to register your current location.</Text> : null}
        {setupWarning ? <Text style={styles.setupWarning}>{setupWarning}</Text> : null}
      </ScrollView>
    </Screen>
  );
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl, maxWidth: 760, width: '100%', alignSelf: 'center' },
  summaryRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  metricCard: { flex: 1, minHeight: 120, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
  metricHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metricLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  metricValue: { color: colors.textPrimary, fontSize: 29, fontWeight: '800', marginTop: 9 },
  metricHint: { color: colors.textMuted, fontSize: 10, marginTop: 1 },
  staleNotice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: '#6A5123', backgroundColor: colors.warningSoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  staleText: { color: colors.textSecondary, fontSize: 11, flex: 1, lineHeight: 16 },
  retry: { color: colors.warning, fontSize: 12, fontWeight: '700' },
  mapCard: { overflow: 'hidden', borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: spacing.md, marginBottom: spacing.md, ...shadow.card },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xs },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  sectionTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  linkButton: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: spacing.xs },
  linkText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  mapCaption: { color: colors.textMuted, fontSize: 11, marginTop: 4, marginBottom: spacing.md, paddingHorizontal: spacing.xs },
  mapWrap: { height: 255, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface },
  map: { flex: 1, backgroundColor: colors.surface },
  mapLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surface },
  mapLoadingText: { color: colors.textMuted, fontSize: 11 },
  mapFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md, paddingHorizontal: spacing.xs },
  mapFooterText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', flex: 1 },
  mapFooterSafe: { color: colors.textMuted, fontSize: 11 },
  locationCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md },
  locationIcon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  locationCopy: { flex: 1 },
  locationTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  locationSubtitle: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  setupButton: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  setupWarning: { color: colors.warning, fontSize: 11, lineHeight: 16, marginTop: spacing.sm, paddingHorizontal: spacing.xs },
});
