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
        // GitHub Dark Theme
        'github-bg': '#0D1117',
        'github-card': '#161B22',
        'github-text': '#F0F6FC',
        'github-text-secondary': '#8B949E',
        'github-text-muted': '#7D8590',
        'github-text-input': '#C9D1D9',
        'github-placeholder': '#6E7681',
        'github-border': '#30363D',
        'github-blue': '#58A6FF',
        'github-blue-dark': '#1F6FEB',
      },
    },
  },
  plugins: [],
}