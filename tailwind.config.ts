import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        surface: {
          DEFAULT: '#111111',
          secondary: '#181818',
          elevated: '#1C1C1E',
        },
        primary: '#F5F5F5',
        secondary: '#A1A1AA',
        border: '#27272A',
        accent: {
          DEFAULT: '#F59E0B',
          muted: '#D97706',
          blue: '#60A5FA',
          red: '#F87171',
          gold: '#F59E0B',
          'gold-light': '#FBBF24',
        },
      },
      fontFamily: {
        sans: [
          'Galano Grotesque',
          'var(--font-galano-fallback)',
          'Plus Jakarta Sans',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      transitionTimingFunction: {
        'expo-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
