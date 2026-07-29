/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        tajawal: ['Tajawal', 'sans-serif'],
        cairo: ['Cairo', 'sans-serif'],
      },
      colors: {
        macro: {
          protein: '#4ade80', // neon green
          carbs: '#fbbf24',   // neon amber/yellow
          fat: '#f97316',     // neon orange
          calories: '#38bdf8' // neon cyan/blue
        }
      }
    },
  },
  plugins: [],
}
