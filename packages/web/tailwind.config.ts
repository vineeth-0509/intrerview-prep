import type { Config } from "tailwindcss";


const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF9F6",
        ink: "#1B1E24",
        slate: "#5B6472",
        teal: {
          DEFAULT: "#1F6F6B",
          dark: "#164F4C",
          light: "#E4F1F0",
        },
        amber: {
          DEFAULT: "#B5792B",
          light: "#F6ECDD",
        },
        line: "#E4E1D8",
      },
      fontFamily: {
        display: ["var(--font-source-serif)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
