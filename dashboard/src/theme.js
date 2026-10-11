export const DASHBOARD_COLORS = {
  surface: '#F4F7FB',
  card: '#FFFFFF',
  text: '#172B45',
  textMuted: '#5F7187',
  border: '#DFE7F0',
  primary: '#2867B2',
};

export const SEVERITY_COLORS = {
  low: '#26845A',
  medium: '#A96813',
  high: '#C6531D',
  critical: '#B8323D',
};

export const INCIDENT_TYPE_COLORS = {
  fire: '#D64C4C',
  smoke: '#D64C4C',
  flood: '#3478D4',
  accident: '#B66A1A',
  gas_leak: '#A96813',
  structural_damage: '#6652A3',
  temperature_spike: '#B8323D',
  explosion: '#B8323D',
};

export function getIncidentTypeColor(type) {
  return INCIDENT_TYPE_COLORS[type] || DASHBOARD_COLORS.textMuted;
}
