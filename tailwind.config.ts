import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#1e3a8a", // Bleu foncé pour le côté pro
        secondary: "#3b82f6", // Bleu clair pour l'action
        accent: "#f59e0b", // Orange pour les réparations/énergie
      },
    },
  },
  plugins: [],
};
export default config;
