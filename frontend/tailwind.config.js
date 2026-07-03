/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#d94f39',
          dark: '#d85039',
          soft: '#fef8bc',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'Tahoma', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
