/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B1424',
        surface: '#16233D',
        'surface-2': '#1E2F4D',
        border: '#26395C',
        text: '#F8FAFC',
        muted: '#94A3B8',
        primary: '#3B6CFF',
        save: '#10B981',
        streak: '#F97316',
        score: '#8B5CF6',
        warn: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
