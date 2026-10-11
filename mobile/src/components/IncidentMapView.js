import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors, spacing } from '../theme';

const DEFAULT_CENTER = [12.9716, 77.5946];

export function getHazardMapColor(type) {
  const value = String(type || '').toLowerCase();
  if (value.includes('fire') || value.includes('smoke') || value.includes('explosion')) return '#D65E5A';
  if (value.includes('flood') || value.includes('water')) return '#3988C8';
  if (value.includes('accident') || value.includes('road')) return '#C58A32';
  return '#7869A8';
}

const MAP_HTML = `
<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{height:100%;margin:0;padding:0;background:#EEF3F7}.leaflet-container{background:#EEF3F7;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}</style></head>
<body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
const map=L.map('map',{zoomControl:true,attributionControl:true}).setView([${DEFAULT_CENTER[0]},${DEFAULT_CENTER[1]}],12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map);
const layers=L.layerGroup().addTo(map);let userMarker=null;let hasCentered=false;
window.updateData=function(userLocation,incidents){layers.clearLayers();if(userLocation){if(!userMarker){userMarker=L.circleMarker(userLocation,{radius:7,color:'#3478D4',fillColor:'#3478D4',fillOpacity:1,weight:3}).addTo(map)}else{userMarker.setLatLng(userLocation)}if(!hasCentered){map.setView(userLocation,13);hasCentered=true}}else if(userMarker){map.removeLayer(userMarker);userMarker=null}
incidents.forEach(function(i){if(!Number.isFinite(Number(i.latitude))||!Number.isFinite(Number(i.longitude)))return;const point=[Number(i.latitude),Number(i.longitude)],color=i.mapColor||'#7869A8';L.circle(point,{radius:Number(i.radius_meters)||100,color:color,fillOpacity:.1,weight:2}).addTo(layers);L.circleMarker(point,{radius:7,color:color,fillColor:color,fillOpacity:.95,weight:2}).addTo(layers).on('click',function(){window.ReactNativeWebView.postMessage(JSON.stringify({incidentId:i.id}))})})};
</script></body></html>`;

export default function IncidentMapView({ incidents = [], userLocation = null, onSelectIncident, style, compact = false }) {
  const webViewRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    const payload = incidents.map((incident) => ({ ...incident, mapColor: getHazardMapColor(incident.incident_type) }));
    webViewRef.current?.injectJavaScript(`window.updateData(${JSON.stringify(userLocation)},${JSON.stringify(payload)});true;`);
  }, [incidents, userLocation, isReady]);

  const handleMessage = (event) => {
    try {
      const { incidentId } = JSON.parse(event.nativeEvent.data);
      if (incidentId != null) onSelectIncident?.(incidentId);
    } catch { /* Ignore malformed map messages. */ }
  };

  return (
    <View style={[styles.mapWrap, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: MAP_HTML }}
        style={styles.map}
        onLoadEnd={() => setIsReady(true)}
        onError={() => setMapError(true)}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        accessibilityLabel="Map showing recorded active incident coordinates"
      />
      {!isReady && !mapError ? <View style={styles.overlay}><ActivityIndicator color={colors.primary}/><Text style={styles.overlayText}>Loading map</Text></View> : null}
      {mapError ? <View style={styles.overlay}><Text style={styles.overlayTitle}>Map unavailable</Text><Text style={styles.overlayText}>Check your connection. Active incident records remain available in the list.</Text></View> : null}
      {!compact ? <View pointerEvents="none" style={styles.disclaimer}><Text style={styles.disclaimerText}>Recorded coordinates · Map tiles require internet access</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: { overflow: 'hidden', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, minHeight: 180 },
  map: { flex: 1, backgroundColor: colors.surface },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl, backgroundColor: colors.surface },
  overlayTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  overlayText: { color: colors.textMuted, fontSize: 11, textAlign: 'center' },
  disclaimer: { position: 'absolute', right: 8, bottom: 8, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, backgroundColor: '#FFFFFFE8' },
  disclaimerText: { color: colors.textMuted, fontSize: 8 },
});
