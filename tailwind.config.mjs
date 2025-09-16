/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#A3B18A', // sage green
        cta: '#588157', // moss green
        bg: '#FAFAFA',
        divider: '#DAD7CD',
        accent: '#344E41',
      },
      fontFamily: {
        poppins: ['var(--font-poppins)', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};

export default config;
