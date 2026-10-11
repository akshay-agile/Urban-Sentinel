export const DASHBOARD_COLORS = {
  surface: '#081321',
  card: '#0E1B2B',
  text: '#EAF1FB',
  textMuted: '#A7B7CC',
  border: '#1D3047',
  primary: '#4D91FF',
};

export const SEVERITY_COLORS = {
  low: '#36D6A0',
  medium: '#F2BC5E',
  high: '#FB923C',
  critical: '#FF6678',
};

export const INCIDENT_TYPE_COLORS = {
  fire: '#FF854D',
  smoke: '#FF854D',
  flood: '#55B7F3',
  accident: '#B69CFF',
  gas_leak: '#F2BC5E',
  structural_damage: '#A7B7CC',
  temperature_spike: '#FF6678',
  explosion: '#FF6678',
};

export function getIncidentTypeColor(type) {
  return INCIDENT_TYPE_COLORS[type] || DASHBOARD_COLORS.textMuted;
}
