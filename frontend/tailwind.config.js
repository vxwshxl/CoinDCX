/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        border: "hsl(0 0% 22%)",
        input: "hsl(0 0% 22%)",
        ring: "hsl(84 81% 55%)",
        background: "hsl(0 0% 4%)",
        foreground: "hsl(0 0% 98%)",
        primary: {
          DEFAULT: "hsl(84 81% 55%)",
          foreground: "hsl(0 0% 6%)",
        },
        secondary: {
          DEFAULT: "hsl(0 0% 11%)",
          foreground: "hsl(0 0% 98%)",
        },
        muted: {
          DEFAULT: "hsl(0 0% 10%)",
          foreground: "hsl(0 0% 66%)",
        },
        accent: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(0 0% 6%)",
        },
        destructive: {
          DEFAULT: "hsl(0 72% 51%)",
          foreground: "hsl(0 0% 98%)",
        },
        card: {
          DEFAULT: "hsl(0 0% 7% / 0.88)",
          foreground: "hsl(0 0% 98%)",
        },
      },
      backgroundImage: {
        grid:
          "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        glow: "0 30px 120px rgba(0, 0, 0, 0.62)",
        panel: "0 20px 60px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
