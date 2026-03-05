/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        deep: '#060711',
        base: '#0d0e1b',
        surface: '#131425',
        hover: '#1a1c2e',
        border: '#1e2138',
        'border-bright': '#2a2d4a',
        'text-primary': '#dde1f0',
        'text-muted': '#6b7194',
        'text-dim': '#3d4263',
        profit: '#22d984',
        'profit-dim': '#0d4a2a',
        loss: '#f14b4b',
        'loss-dim': '#5a1515',
        accent: '#4a7cf4',
        'accent-dim': '#1e3278',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 24px rgba(0, 0, 0, 0.4)',
        glow: '0 0 20px rgba(74, 124, 244, 0.15)',
        'glow-profit': '0 0 20px rgba(34, 217, 132, 0.15)',
        'glow-loss': '0 0 20px rgba(241, 75, 75, 0.15)',
      },
    },
  },
  plugins: [],
}
