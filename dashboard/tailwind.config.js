/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#4D91FF', dark: '#2671E8', soft: '#142B49' },
        secondary: { DEFAULT: '#36D6A0', soft: '#12372F' },
        surface: '#081321',
        card: '#0E1B2B',
        panel: '#122238',
        ink: { DEFAULT: '#EAF1FB', soft: '#A7B7CC', muted: '#73869F' },
        line: { DEFAULT: '#1D3047', strong: '#2B4563' },
        danger: { DEFAULT: '#FF6678', soft: '#3B1D2A' },
        warning: { DEFAULT: '#F2BC5E', soft: '#352B1B' },
        success: { DEFAULT: '#36D6A0', soft: '#12372F' },
        info: { DEFAULT: '#55B7F3', soft: '#122F43' },
        severity: {
          low: '#36D6A0',
          medium: '#F2BC5E',
          high: '#FB923C',
          critical: '#FF6678',
        },
        hazard: {
          fire: '#FF854D',
          flood: '#55B7F3',
          accident: '#B69CFF',
          gas: '#F2BC5E',
          structural: '#A7B7CC',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
      },
      boxShadow: {
        card: '0 8px 24px rgb(0 0 0 / 0.16)',
        raised: '0 16px 40px rgb(0 0 0 / 0.24)',
        glow: '0 0 24px rgb(77 145 255 / 0.12)',
      },
    },
  },
  plugins: [],
};
