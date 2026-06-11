import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        negro: '#0A0A0A',
        carbon: '#1E1E1E',
        oro: '#C9A84C',
        rojo: '#D62828',
        acero: '#1A3A5C',
        estadio: '#2D6A4F',
        suave: '#6B7280',
      },
      fontFamily: {
        rajdhani: ['var(--font-rajdhani)', 'sans-serif'],
        noto: ['var(--font-noto)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
