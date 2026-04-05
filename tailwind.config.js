/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#0a0e17",
          card: "#111827",
          border: "#1e293b",
          accent: "#e2e8f0",
        },
      },
    },
  },
  plugins: [],
};
