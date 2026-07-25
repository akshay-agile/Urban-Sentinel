/**
 * Urban Sentinel — Mobile Design System
 *
 * Light theme only, per the redesign spec. Deep Blue primary, Emerald
 * secondary, calm neutral surfaces. Every screen imports from here
 * instead of hardcoding colors, so the whole app stays visually
 * consistent and easy to retheme later if needed.
 *
 * Font note: using system fonts (San Francisco on iOS, Roboto on
 * Android) rather than bundling Inter/Poppins via expo-font — visually
 * close to the spec's suggestions and avoids an extra native asset
 * dependency. Swapping in @expo-google-fonts/inter later is a drop-in
 * change if ever wanted, isolated to this one file.
 */

export const colors = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primarySoft: '#EFF6FF',

  secondary: '#10B981',
  secondarySoft: '#ECFDF5',

  background: '#F8FAFC',
  card: '#FFFFFF',

  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',

  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  success: '#10B981',
  successSoft: '#ECFDF5',
  warning: '#F59E0B',
  warningSoft: '#FFFBEB',
  danger: '#EF4444',
  dangerSoft: '#FEF2F2',
  info: '#3B82F6',
  infoSoft: '#EFF6FF',

  white: '#FFFFFF',
};

export const severityColors = {
  low: { fg: '#15803D', bg: '#DCFCE7' },
  medium: { fg: '#B45309', bg: '#FEF3C7' },
  high: { fg: '#C2410C', bg: '#FFEDD5' },
  critical: { fg: '#B91C1C', bg: '#FEE2E2' },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  h3: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  bodyMedium: { fontSize: 15, fontWeight: '500' },
  caption: { fontSize: 13, fontWeight: '400' },
  small: { fontSize: 12, fontWeight: '500' },
};

export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  raised: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
};
