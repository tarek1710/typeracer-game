/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ink: { 950: '#05070f', 900: '#0a0e1a', 800: '#101626', 700: '#18203a' } },
      fontFamily: {
        display: ['"Orbitron"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', '"Noto Sans Bengali"', '"Nirmala UI"', 'monospace'],
      },
    },
  },
  plugins: [],
};
