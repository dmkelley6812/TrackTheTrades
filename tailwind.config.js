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
      keyframes: {
        'badge-pop': {
          '0%':   { transform: 'scale(0.3) rotate(-15deg)', opacity: '0' },
          '60%':  { transform: 'scale(1.18) rotate(5deg)',  opacity: '1' },
          '80%':  { transform: 'scale(0.94) rotate(-2deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)',     opacity: '1' },
        },
        shimmer: {
          '0%':   { transform: 'translateX(-150%) skewX(-20deg)' },
          '100%': { transform: 'translateX(300%) skewX(-20deg)' },
        },
        'glow-ring': {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%':      { opacity: '1',   transform: 'scale(1.06)' },
        },
        'confetti-fall': {
          '0%':   { transform: 'translateY(-60px) rotate(0deg)',   opacity: '1' },
          '100%': { transform: 'translateY(440px) rotate(720deg)', opacity: '0' },
        },
        'ray-out': {
          '0%':   { transform: 'scaleY(0)', opacity: '1' },
          '100%': { transform: 'scaleY(1)', opacity: '0' },
        },
        'overlay-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'modal-in': {
          '0%':   { transform: 'scale(0.75) translateY(24px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)',        opacity: '1' },
        },
        'card-hover': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-3px)' },
        },
      },
      animation: {
        'badge-pop':    'badge-pop 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        shimmer:        'shimmer 2.8s ease-in-out infinite',
        'glow-ring':    'glow-ring 2s ease-in-out infinite',
        'confetti-fall':'confetti-fall var(--dur, 3s) ease-in var(--delay, 0s) forwards',
        'ray-out':      'ray-out 0.7s ease-out var(--delay, 0s) forwards',
        'overlay-in':   'overlay-in 0.2s ease-out forwards',
        'modal-in':     'modal-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
    },
  },
  plugins: [],
}
