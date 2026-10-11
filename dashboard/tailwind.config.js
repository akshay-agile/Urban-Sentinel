/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2867B2', dark: '#225695', soft: '#E8F1FC' },
        secondary: { DEFAULT: '#29845B', soft: '#E7F5EC' },
        surface: '#F4F7FB',
        card: '#FFFFFF',
        panel: '#F8FAFD',
        ink: { DEFAULT: '#172B45', soft: '#475D75', muted: '#5F7187' },
        line: { DEFAULT: '#DFE7F0', strong: '#C5D2E0' },
        danger: { DEFAULT: '#B8323D', soft: '#FCEBED' },
        warning: { DEFAULT: '#98600F', soft: '#FFF3D9' },
        success: { DEFAULT: '#28794F', soft: '#E7F5EC' },
        info: { DEFAULT: '#2768B2', soft: '#E8F3FC' },
        severity: {
          low: '#28794F',
          medium: '#98600F',
          high: '#B85A1B',
          critical: '#B8323D',
        },
        hazard: {
          fire: '#B33A3E',
          flood: '#2768B2',
          accident: '#985514',
          gas: '#98600F',
          structural: '#6652A3',
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
        card: '0 5px 18px rgb(28 53 82 / 0.06)',
        raised: '0 12px 32px rgb(28 53 82 / 0.10)',
        glow: '0 0 0 3px rgb(52 120 212 / 0.10)',
      },
    },
  },
  plugins: [],
};
