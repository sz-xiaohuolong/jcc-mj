/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Cinzel", "Noto Serif SC", "serif"],
        body: ["Manrope", "Noto Sans SC", "sans-serif"]
      },
      colors: {
        ink: "#090D13",
        jade: "#34D3B5",
        brass: "#D8A64B",
        violet: "#A778FF"
      }
    }
  },
  plugins: []
};
