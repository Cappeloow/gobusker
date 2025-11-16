/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#182632',
        secondary: '#20170f',
        accent: '#c18654',
      },
    },
  },
  plugins: [],
}