import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Liebling", "var(--font-inter)", "sans-serif"],
      },
      colors: {
        background: "#0f1115", // Almost black
        surface: "#233357", // Console dark blue/gray
        primary: "#2F7C46", // Green
        secondary: "#1a1d24", // Darker surface
        text: "#e2e8f0", // Light gray text
        accent: "#38bdf8", // Sky blue for highlights (optional)
        danger: "#ef4444", // Red for errors
        success: "#22c55e", // Green for success
      },
      fontFamily: {
        sans: ["var(--font-liebling)", "sans-serif"],
        mono: ["monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
