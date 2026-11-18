/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        truper: {
          orange: '#f07d00',
          orangeDark: '#d96a00',
          black: '#121212',
          grayDark: '#1e1e1e',
          grayLight: '#f5f5f7'
        }
      }
    },
  },
  plugins: [],
}
