/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'vgd-bg': '#0F172A',
        'vgd-card': '#162038',
        'vgd-orange': '#FF8200',
        'vgd-red': '#D11919',
        'vgd-muted': '#58595B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
