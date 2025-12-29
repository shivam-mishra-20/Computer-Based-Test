/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Abhigyan Gurukul Primary Colors
        primary: {
          DEFAULT: '#5ab348',
          light: '#6BC74C',
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#5ab348',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Teal CTA colors
        teal: {
          DEFAULT: '#0B7077',
          hover: '#314f51',
          light: '#0d9488',
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#14b8a6',
          600: '#0B7077',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        // Warm accent colors
        amber: {
          DEFAULT: '#f59e0b',
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
        },
        // Status colors
        success: '#22c55e',
        danger: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
        // Legacy support
        cta: '#588157',
        bg: '#FAFAFA',
        divider: '#DAD7CD',
        accent: '#344E41',
      },
      fontFamily: {
        poppins: ['var(--font-poppins)', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  // Force RGB color space to avoid lab() parsing errors in html2canvas
  future: {
    hoverOnlyWhenSupported: true,
  },
  corePlugins: {
    // Ensure compatibility with html2canvas
  },
  plugins: [],
};

export default config;
