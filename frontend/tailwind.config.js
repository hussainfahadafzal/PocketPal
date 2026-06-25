/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Base ──────────────────────────────────────────────────────────
        bg:           '#07091A',   // near-black with blue undertone
        surface:      '#0D1225',   // card background
        'surface-2':  '#141C35',   // elevated / input
        'surface-3':  '#1B2544',   // hover states
        border:       '#1E2D4E',   // default borders
        'border-bright': '#2A3D6B', // focus / active borders

        // ── Text ──────────────────────────────────────────────────────────
        text:  '#FFFFFF',
        muted: '#7A8BAD',

        // ── Brand stops (used in gradient utilities) ───────────────────
        primary:  '#3B6CFF',
        purple:   '#8B5CF6',
        pink:     '#EC4899',
        orange:   '#F97316',
        save:     '#10B981',
        teal:     '#06B6D4',

        // ── Semantic ──────────────────────────────────────────────────────
        streak: '#F97316',
        warn:   '#F59E0B',
        danger: '#EF4444',
        score:  '#8B5CF6',
        score:  '#8B5CF6',
      },

      fontFamily: {
        display: ['"Clash Display"', '"Space Grotesk"', 'sans-serif'],
        heading: ['"Space Grotesk"', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
      },

      // Named gradient backgrounds — use as className="bg-grad-primary" etc.
      backgroundImage: {
        'grad-primary':    'linear-gradient(135deg, #3B6CFF 0%, #8B5CF6 100%)',
        'grad-energy':     'linear-gradient(135deg, #EC4899 0%, #F97316 100%)',
        'grad-success':    'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
        'grad-warm':       'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)',
        'grad-danger':     'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
        // Soft glass tints
        'grad-blue-glass': 'linear-gradient(135deg, rgba(59,108,255,0.12) 0%, rgba(139,92,246,0.12) 100%)',
        'grad-green-glass':'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(6,182,212,0.12) 100%)',
        'grad-pink-glass': 'linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(249,115,22,0.12) 100%)',
      },

      // Colored glow drop-shadows for hero cards / buttons
      boxShadow: {
        'glow-blue':
          '0 24px 64px -12px rgba(59,108,255,0.55), 0 8px 32px -8px rgba(109,40,217,0.35)',
        'glow-purple':
          '0 24px 64px -12px rgba(139,92,246,0.50)',
        'glow-green':
          '0 20px 60px -10px rgba(16,185,129,0.45)',
        'glow-pink':
          '0 20px 60px -10px rgba(236,72,153,0.45)',
        'glow-orange':
          '0 20px 60px -10px rgba(249,115,22,0.45)',
        'card':
          '0 4px 32px rgba(0,0,0,0.5)',
      },

      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
};
