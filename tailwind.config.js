/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
        xl: '3rem',
      },
    },
    extend: {
      colors: {
        maroon: {
          50: '#FDF2F4',
          100: '#FBE4E8',
          200: '#F7CCD3',
          300: '#EEA2AF',
          400: '#D9536F',
          500: '#B82344',
          600: '#9E1B38',
          700: '#7A1428',
          800: '#6B1223',
          900: '#5A0F1E',
          950: '#3B0712',
        },
        gold: {
          50: '#FDFBF5',
          100: '#FBF5E5',
          200: '#F5E6BD',
          300: '#ECD28C',
          400: '#DFB854',
          500: '#B8893A',
          600: '#9E722C',
          700: '#7E5821',
          800: '#63441B',
          900: '#4D3416',
        },
        cream: {
          50: '#FBF5EE',
          100: '#F6ECE0',
          200: '#EFE0CD',
          300: '#E5CFB5',
          400: '#D4B896',
          500: '#C19E75',
          600: '#A48259',
          700: '#785E3F',
          800: '#53402A',
          900: '#2A1A1D',
          950: '#1C1113',
        },
        peach: {
          100: '#F6E4D6',
        },
        blush: {
          200: '#F3D3D3',
        },
        ink: {
          900: '#2A1A1D',
          500: '#6E5A5D',
        },
        line: '#EADBD0',
        white: '#FFFFFF',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 24px rgba(90, 15, 30, 0.08)',
      },
      spacing: {
        '18': '4.5rem',
      },
      maxWidth: {
        '1440': '1440px',
      }
    },
  },
  plugins: [],
}
