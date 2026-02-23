import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7ff",
          100: "#dcebff",
          200: "#bfdcff",
          300: "#91c4ff",
          400: "#5ca3ff",
          500: "#337fff",
          600: "#1b62f5",
          700: "#164cd1",
          800: "#1942a9",
          900: "#1b3b85"
        }
      }
    }
  },
  plugins: []
};

export default config;
