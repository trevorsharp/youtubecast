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
        tiny: '340px',
        mobile: '400px',
        normal: '470px',
      },
      fontSize: {
        base: '10px',
        tiny: '12px',
        mobile: '14px',
        normal: '16px',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
