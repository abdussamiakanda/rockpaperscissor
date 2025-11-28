/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ============================================
        // RETRO GAMING COLOR PALETTE
        // ============================================
        brand: {
          primary: '#0A0A0F',    // Deep dark blue/black - Background
          secondary: '#00F5FF',   // Neon cyan - Primary accent
          accent: '#FF00FF',     // Hot pink/magenta - Secondary accent
          danger: '#FFD700',     // Gold/yellow - Highlights
          neon: '#39FF14',       // Electric green - Accents
        },
        // ============================================
        // ROCK PAPER SCISSORS COLORS
        // ============================================
        rock: {
          DEFAULT: '#FFD700',     // Gold - Rock color
        },
        paper: {
          DEFAULT: '#FF00FF',     // Pink/Magenta - Paper color
        },
        scissors: {
          DEFAULT: '#39FF14',    // Neon Green - Scissors color
        },
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
      },
    },
  },
  plugins: [],
}

