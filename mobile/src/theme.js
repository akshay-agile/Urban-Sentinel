/** Shared light Urban Sentinel palette for citizen and responder screens. */
export const colors = {
  primary: '#2867B2',
  primaryDark: '#225695',
  primarySoft: '#E8F1FC',
  secondary: '#28794F',
  secondarySoft: '#E7F5EC',
  background: '#F4F7FB',
  card: '#FFFFFF',
  surface: '#F8FAFD',
  elevated: '#EEF4FA',
  textPrimary: '#172B45',
  textSecondary: '#475D75',
  textMuted: '#5F7187',
  border: '#DFE7F0',
  borderStrong: '#C5D2E0',
  success: '#28794F',
  successSoft: '#E7F5EC',
  warning: '#98600F',
  warningSoft: '#FFF3D9',
  danger: '#B8323D',
  dangerSoft: '#FCEBED',
  info: '#2768B2',
  infoSoft: '#E8F3FC',
  hazardFire: '#B33A3E',
  hazardFlood: '#2768B2',
  hazardAccident: '#985514',
  hazardOther: '#6652A3',
  white: '#FFFFFF',
};

export const hazardColors = {
  fire: colors.hazardFire,
  smoke: colors.hazardFire,
  flood: colors.hazardFlood,
  accident: colors.hazardAccident,
};

export const severityColors = {
  low: { fg: '#28794F', bg: '#E7F5EC' },
  medium: { fg: '#85550D', bg: '#FFF3D9' },
  high: { fg: '#A84F16', bg: '#FCECDD' },
  critical: { fg: '#A52833', bg: '#FCEBED' },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 };
export const typography = {
  h1: { fontSize: 29, fontWeight: '700', letterSpacing: -0.6 },
  h2: { fontSize: 23, fontWeight: '700', letterSpacing: -0.35 },
  h3: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  bodyMedium: { fontSize: 15, fontWeight: '500' },
  caption: { fontSize: 13, fontWeight: '400' },
  small: { fontSize: 12, fontWeight: '500' },
};
export const shadow = {
  card: { shadowColor: '#193654', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  raised: { shadowColor: '#193654', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 4 },
};
