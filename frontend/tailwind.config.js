/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#fff3ee',
          100: '#ffe1d4',
          200: '#ffc3a8',
          300: '#ff9e71',
          400: '#ff7c47',
          500: '#ff5f2d',
          600: '#e84d1e',
          700: '#c43b15',
          800: '#9c2f11',
          900: '#7a260f',
        },
        brand: {
          50: '#fff3ee',
          100: '#ffe1d4',
          200: '#ffc3a8',
          300: '#ff9e71',
          400: '#ff7c47',
          500: '#ff5f2d',
          600: '#e84d1e',
          700: '#c43b15',
          800: '#9c2f11',
          900: '#7a260f',
        },
        accent: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#1e88e5',
          600: '#1565c0',
          700: '#0d47a1',
          800: '#0a3880',
          900: '#072960',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
    },
  },
  plugins: [],
};
