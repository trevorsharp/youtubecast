/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        youtube: '#ED0000',
      },
      ringWidth: {
        3: '3px',
      },
      screens: {
        mobile: '340px',
        normal: '470px',
      },
      fontSize: {
        tiny: '8px',
        mobile: '12px',
        normal: '16px',
      },
    },
  },
  plugins: [],
};
