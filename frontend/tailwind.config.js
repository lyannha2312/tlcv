/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: { 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
        fuchsia: { 50: '#fdf4ff', 100: '#fae8ff', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf' },
        indigo: { 50: '#eef2ff', 100: '#e0e7ff', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' },
        teal: { 50: '#f0fdfa', 100: '#ccfbf1', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e' },
        cyan: { 50: '#ecfeff', 100: '#cffafe', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490' },
        orange: { 50: '#fff7ed', 100: '#ffedd5', 500: '#f97316', 600: '#ea580c', 700: '#c2410c' }
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] }
    },
  },
  plugins: [],
}