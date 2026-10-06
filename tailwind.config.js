/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./data/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Sora', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      colors: {
        /* ── Lightweight Restrained Color System ── */
        canvas:  '#0B1120',
        surface: '#131B2E',
        card:    '#131B2E',
        elevated:'#1A243B',
        accent: {
          DEFAULT: '#38BDF8',
          hover:   '#0EA5E9',
          soft:    'rgba(56, 189, 248, 0.20)',
        },
        border: {
          DEFAULT: '#1E293B',
          subtle:  'rgba(30, 41, 59, 0.50)',
        },
        /* ── Text Tokens ── */
        slate: {
          950: '#0B1120',
          900: '#131B2E',
          800: '#1E293B',
          700: '#334155',
          600: '#64748B',
          500: '#64748B',
          400: '#94A3B8',
          300: '#CBD5E1',
          200: '#E2E8F0',
          100: '#F1F5F9',
        },
        /* ── Subject accents (flat) ── */
        subject: {
          physics:   '#38BDF8',
          chemistry: '#38BDF8',
          biology:   '#38BDF8',
          math:      '#38BDF8',
          cs:        '#38BDF8',
        }
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
        'gradient-x': 'gradient-x 15s ease infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'gradient-x': {
          '0%, 100%': {
              'background-size': '200% 200%',
              'background-position': 'left center'
          },
          '50%': {
              'background-size': '200% 200%',
              'background-position': 'right center'
          },
        }
      }
    },
  },
  plugins: [],
}
