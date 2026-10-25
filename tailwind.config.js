/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        surface: {
          DEFAULT: '#121215',
          elevated: '#18181b',
          border: '#27272a'
        },
        bifrost: {
          gold: '#eab308',
          amber: '#f59e0b',
          glow: '#d97706',
          indigo: '#6366f1',
          cyan: '#06b6d4'
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ]
      }
    }
  },
  plugins: []
}
