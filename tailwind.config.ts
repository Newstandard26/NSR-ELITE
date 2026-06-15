import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nsr: {
          black: "#000000",
          white: "#FFFFFF",
          // Brand color is overridable at runtime via the --nsr-blue CSS var.
          blue: "var(--nsr-blue, #51C5F4)",
        },
      },
      fontFamily: {
        sans: ["var(--font-mulish)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};

export default config;
