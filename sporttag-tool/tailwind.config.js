/ ** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
    theme: {
      extend: {
        keyframes: {
          fadeIn: {
            from: { opacity: 0 },
            to: { opacity: 1 },
          },
          fadeOut: {
            from: { opacity: 1 },
            to: { opacity: 0 },
          },
        },
        animation: {
          "fade-in": "fadeIn 0.5s ease-out forwards",
          "fade-out": "fadeOut 0.5s ease-in forwards",
        },
      },
    },
    plugins: [],
  };