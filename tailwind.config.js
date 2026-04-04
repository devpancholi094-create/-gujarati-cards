/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        felt: '#1a5c38',
        'felt-dark': '#0f3d26',
        gold: '#d4af37',
        'card-red': '#c0392b',
        'card-black': '#1a1a2e',
      },
      backgroundImage: {
        'felt-pattern': "radial-gradient(ellipse at center, #1e6b40 0%, #0f3d26 100%)",
      }
    },
  },
  plugins: [],
}
