/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2563EB', dark: '#1D4ED8', soft: '#EFF6FF' },
        secondary: { DEFAULT: '#10B981', soft: '#ECFDF5' },
        surface: '#F8FAFC',
        card: '#FFFFFF',
        ink: { DEFAULT: '#1E293B', soft: '#64748B', muted: '#94A3B8' },
        line: { DEFAULT: '#E2E8F0', strong: '#CBD5E1' },
        danger: { DEFAULT: '#EF4444', soft: '#FEF2F2' },
        warning: { DEFAULT: '#F59E0B', soft: '#FFFBEB' },
        success: { DEFAULT: '#10B981', soft: '#ECFDF5' },
        info: { DEFAULT: '#3B82F6', soft: '#EFF6FF' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        raised: '0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.05)',
      },
    },
  },
  plugins: [],
};
