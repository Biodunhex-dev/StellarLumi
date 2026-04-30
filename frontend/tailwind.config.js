/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#7C3AED', light: '#A78BFA' },
      },
    },
  },
  plugins: [],
};
