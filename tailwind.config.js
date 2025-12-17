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
        // SUNSET CYBERPUNK PALETTE (Color Hunt Inspired)
        // https://colorhunt.co/palette/1a1a2e16213e0f3460e94560
        // ============================================
        brand: {
          primary: '#1A1A2E',    // Deep navy - Background
          secondary: '#E94560',   // Coral red - Primary accent
          accent: '#0F3460',     // Dark blue - Secondary accent
          danger: '#FF6B6B',     // Soft red - Danger/warnings
          neon: '#4ECCA3',       // Mint green - Success/accents
          gold: '#F4D160',       // Warm gold - Highlights
        },
        // ============================================
        // ROCK PAPER SCISSORS COLORS
        // ============================================
        rock: {
          DEFAULT: '#F4D160',     // Warm gold - Rock color
        },
        paper: {
          DEFAULT: '#E94560',     // Coral red - Paper color
        },
        scissors: {
          DEFAULT: '#4ECCA3',    // Mint green - Scissors color
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
