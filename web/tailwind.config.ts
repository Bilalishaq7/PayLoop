import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#d9edff",
          200: "#bce0ff",
          300: "#8ecdff",
          400: "#59b0ff",
          500: "#3390fc",
          600: "#1f72f2",
          700: "#185bde",
          800: "#1a4bb4",
          900: "#1b428e",
        },
        ink: {
          900: "#0b1220",
          800: "#131c2e",
          700: "#1e293b",
        },
        // Semantic colours. The values are CSS variables in globals.css that
        // change with the theme, so these classes work in both themes.
        page: "rgb(var(--page) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        fg: {
          DEFAULT: "rgb(var(--fg) / <alpha-value>)",
          muted: "rgb(var(--fg-muted) / <alpha-value>)",
          subtle: "rgb(var(--fg-subtle) / <alpha-value>)",
        },
        line: "rgb(var(--line) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
