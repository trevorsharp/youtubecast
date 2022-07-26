/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        youtube: '#FF0000',
      },
      ringWidth: {
        3: '3px',
      },
      screens: {
        normal: '450px',
      },
      fontSize: {
        mobile: '14px',
        normal: '16px',
      },
    },
  },
  plugins: [],
};
