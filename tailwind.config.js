/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        gothic: ['IM Fell English', 'Cinzel', 'serif'],
        cinzel: ['Cinzel', 'serif'],
        fell: ['IM Fell English', 'serif'],
      },
      colors: {
        blood: {
          dark: '#1a0000',
          mid: '#4a0000',
          bright: '#8b0000',
          drip: '#cc0000',
        },
        wood: {
          dark: '#0d0805',
          mid: '#1a1008',
          light: '#2d1f0d',
        },
        card: {
          bg: '#f5e6c8',
          aged: '#e8d5a3',
          border: '#2d1f0d',
        },
      },
      boxShadow: {
        'blood': '0 0 20px rgba(139, 0, 0, 0.6)',
        'card': '0 4px 20px rgba(0,0,0,0.8)',
        'trump': '0 0 15px rgba(220, 20, 60, 0.8)',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.8 },
          '75%': { opacity: 0.9 },
        },
        bloodDrip: {
          '0%': { height: '0px', opacity: 0 },
          '100%': { height: '60px', opacity: 1 },
        },
        pulseRed: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(139,0,0,0.4)' },
          '50%': { boxShadow: '0 0 30px rgba(220,0,0,0.9)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
      },
      animation: {
        'flicker': 'flicker 3s ease-in-out infinite',
        'blood-drip': 'bloodDrip 0.8s ease-out forwards',
        'pulse-red': 'pulseRed 2s ease-in-out infinite',
        'shake': 'shake 0.3s ease-in-out',
      },
    },
  },
  plugins: [],
}
