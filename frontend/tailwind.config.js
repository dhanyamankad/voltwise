/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: '#0D1117',
        'ink-light': '#161B22',
        'ink-card': '#1C2128',
        'ink-border': '#30363D',
        solar: '#F59E0B',
        wind: '#06B6D4',
        'grid-neutral': '#64748B',
        'alert-priority': '#E85D4C',
        paper: '#EDEFF2',
        'paper-muted': '#919EAB'
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif']
      }
    }
  },
  plugins: []
};
