import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0c",
        panel: "#121319",
        edge: "#23242e",
        gold: "#d8b765",
        goldsoft: "#e7d49a",
        muted: "#9a9ba6",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      maxWidth: { content: "1120px" },
    },
  },
  plugins: [],
};
export default config;
