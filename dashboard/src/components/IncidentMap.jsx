import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { INCIDENT_TYPE_COLORS, SEVERITY_COLORS } from '../theme';

// react-leaflet's default marker icon path breaks under Vite's bundling —
// this is the standard fix, pointing Leaflet at the bundled asset URLs.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function incidentIcon(incident, selected) {
  const color = INCIDENT_TYPE_COLORS[incident.incident_type] || '#5F7187';
  return new L.DivIcon({
    html: `<span class="ops-map-marker${selected ? ' ops-map-marker--selected' : ''}" style="--marker-color:${color}"><span class="ops-map-marker-dot"></span></span>`,
    className: 'ops-map-marker-shell',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

const DEFAULT_CENTER = [12.9716, 77.5946]; // Existing Bengaluru fallback used by the dashboard and simulator.

function MapViewport({ center, selectedIncident }) {
  const map = useMap();

  useEffect(() => {
    if (selectedIncident) {
      map.flyTo(
        [selectedIncident.latitude, selectedIncident.longitude],
        Math.max(15, map.getZoom()),
        { duration: 0.35 }
      );
      return;
    }
    map.setView(center, map.getZoom(), { animate: false });
  }, [center[0], center[1], map, selectedIncident?.id, selectedIncident?.latitude, selectedIncident?.longitude]);

  return null;
}

export default function IncidentMap({
  devices = [],
  incidents = [],
  height = '400px',
  selectedIncidentId = null,
  onIncidentSelect,
}) {
  const [tileStatus, setTileStatus] = useState('loading');
  const points = [
    ...devices.map((d) => [d.latitude, d.longitude]),
    ...incidents.map((i) => [i.latitude, i.longitude]),
  ];
  const center = points.length > 0 ? points[0] : DEFAULT_CENTER;
  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId) || null;

  return (
    <div style={{ height }} className="relative overflow-hidden rounded-xl border border-line bg-[#EAF3F1]">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <MapViewport center={center} selectedIncident={selectedIncident} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            tileload: () => setTileStatus('loaded'),
            tileerror: () => setTileStatus((current) => current === 'loaded' ? current : 'error'),
          }}
        />

        {devices.map((device) => (
          <Marker key={`device-${device.id}`} position={[device.latitude, device.longitude]}>
            <Popup>
              <strong>{device.label || device.device_id}</strong>
              <br />
              {device.device_id}
              <br />
              {device.is_active ? 'Active' : 'Inactive'}
            </Popup>
          </Marker>
        ))}

        {incidents.map((incident) => (
          <div key={`incident-${incident.id}`}>
            <Circle
              center={[incident.latitude, incident.longitude]}
              radius={incident.radius_meters}
              pathOptions={{
                color: SEVERITY_COLORS[incident.severity] || SEVERITY_COLORS.critical,
                fillOpacity: incident.id === selectedIncidentId ? 0.18 : 0.1,
                weight: incident.id === selectedIncidentId ? 4 : 2,
              }}
            />
            <Marker
              position={[incident.latitude, incident.longitude]}
              icon={incidentIcon(incident, incident.id === selectedIncidentId)}
              eventHandlers={{ click: () => onIncidentSelect?.(incident.id) }}
            >
              <Popup>
                <strong className="capitalize">{incident.incident_type.replace('_', ' ')}</strong>
                <br />
                Severity: {incident.severity}
                <br />
                Radius: {incident.radius_meters}m
              </Popup>
            </Marker>
          </div>
        ))}
      </MapContainer>
      {tileStatus !== 'loaded' ? (
        <div className="pointer-events-none absolute right-3 top-3 z-[500] max-w-[min(360px,calc(100%-24px))] rounded-lg border border-white/80 bg-white/95 px-3 py-2 text-[10px] leading-4 text-ink-soft shadow-card" role="status">
          {tileStatus === 'error'
            ? 'Map tiles could not be loaded. Check network access to OpenStreetMap.'
            : 'Loading map tiles…'}
        </div>
      ) : null}
    </div>
  );
}
