import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// react-leaflet's default marker icon path breaks under Vite's bundling —
// this is the standard fix, pointing Leaflet at the bundled asset URLs.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const incidentIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'incident-marker',
});

const SEVERITY_RADIUS_COLOR = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#dc2626',
};

const DEFAULT_CENTER = [12.9716, 77.5946]; // Bengaluru — matches the default simulator/docs coordinates

export default function IncidentMap({ devices = [], incidents = [], height = '400px' }) {
  const points = [
    ...devices.map((d) => [d.latitude, d.longitude]),
    ...incidents.map((i) => [i.latitude, i.longitude]),
  ];
  const center = points.length > 0 ? points[0] : DEFAULT_CENTER;

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border border-slate-800">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
                color: SEVERITY_RADIUS_COLOR[incident.severity] || '#dc2626',
                fillOpacity: 0.15,
              }}
            />
            <Marker position={[incident.latitude, incident.longitude]} icon={incidentIcon}>
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
    </div>
  );
}
