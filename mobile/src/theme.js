/** Urban Sentinel mobile design tokens. */
export const colors = {
  primary: '#4D91FF',
  primaryDark: '#2671E8',
  primarySoft: '#142B49',
  secondary: '#34D399',
  secondarySoft: '#12372F',
  background: '#081321',
  card: '#0E1B2B',
  surface: '#0B1929',
  elevated: '#172A40',
  textPrimary: '#F2F6FC',
  textSecondary: '#A8B7C9',
  textMuted: '#71839A',
  border: '#23374F',
  borderStrong: '#344D69',
  success: '#34D399',
  successSoft: '#12372F',
  warning: '#F5B942',
  warningSoft: '#3A2D16',
  danger: '#FF6678',
  dangerSoft: '#3A202B',
  info: '#4D9BFF',
  infoSoft: '#142E4C',
  hazardFire: '#FF854D',
  hazardFlood: '#55B7F3',
  hazardAccident: '#B69CFF',
  hazardOther: '#F5B942',
  white: '#FFFFFF',
};

export const hazardColors = {
  fire: colors.hazardFire,
  smoke: colors.hazardFire,
  flood: colors.hazardFlood,
  accident: colors.hazardAccident,
};

export const severityColors = {
  low: { fg: '#36D6A0', bg: '#12372F' },
  medium: { fg: '#F2BC5E', bg: '#3A2D16' },
  high: { fg: '#FB923C', bg: '#3A291F' },
  critical: { fg: '#FF6678', bg: '#3A202B' },
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
  card: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.22, shadowRadius: 8, elevation: 3 },
  raised: { shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 6 },
};
