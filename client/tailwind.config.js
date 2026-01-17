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
        // Light Mode Theme
        'light-bg': '#F6F8FA',
        'light-card': '#FFFFFF',
        'light-text': '#24292F',
        'light-text-secondary': '#57606A',
        'light-text-muted': '#6E7781',
        'light-border': '#D0D7DE',
        'light-blue': '#0969DA',
        'light-blue-dark': '#0550AE',
        // Dark Mode Theme (GitHub Dark)
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