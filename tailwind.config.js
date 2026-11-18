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
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        kannada: ['"Noto Sans Kannada"', 'sans-serif'],
        devanagari: ['"Noto Sans Devanagari"', 'sans-serif'],
      },
      colors: {
        ink: {
          DEFAULT: '#070B14',
          2: '#0E1626',
        },
        paper: {
          DEFAULT: '#F0F6FC',
          2: '#162035',
        },
        chalk: '#94A3B8',
        verdigris: {
          DEFAULT: '#87CEEB',
          deep: '#5DADE2',
        },
        'verdigris-deep': '#5DADE2',
        sky: {
          DEFAULT: '#87CEEB',
          deep: '#5DADE2',
        },
        brass: '#87CEEB',
        rule: {
          dark: 'rgba(135, 206, 235, 0.16)',
          light: 'rgba(93, 173, 226, 0.20)',
        },
        /* Fallbacks & contextual tokens */
        canvas: '#070B14',
        surface: '#0E1626',
        card: '#0E1626',
        elevated: '#162035',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      }
    },
  },
  plugins: [],
}
