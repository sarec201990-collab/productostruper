/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Flexivor Official Corporate Palette (from chat_system)
        flexivor: {
          primary: '#1456b8',
          primaryHover: '#10428e',
          dark: '#0b2f68',
          soft: '#edf4ff',
          highlight: '#38bdf8',
          canvas: '#f3f6f8',
          surface: '#ffffff',
          surfaceSoft: '#f7fafc',
          ink: '#142230',
          muted: '#5d6c7b',
          line: '#dce4ec'
        },
        // Truper Official Commercial Palette
        truper: {
          orange: '#f07d00',
          orangeDark: '#d96a00',
          orangeLight: '#ff9426',
          black: '#121212',
          grayDark: '#1e1e1e',
          grayLight: '#f5f5f7'
        }
      }
    },
  },
  plugins: [],
}
