/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#111111",
          primary: "#111111",
          secondary: "#5A5852",
          faint: "#8E8A82",
          border: "#E4E2DA",
          darkborder: "#2D2D2A",
        },
        paper: {
          DEFAULT: "#F6F5F0",
          grid: "#E4E2DA",
          card: "#FFFFFF",
          stone: "#ECEAE2",
        },
        terracotta: {
          DEFAULT: "#B84A27",
          hover: "#A03E1E",
          subtle: "rgba(184, 74, 39, 0.08)",
        },
        forest: {
          DEFAULT: "#1B4332",
          hover: "#143326",
          subtle: "rgba(27, 67, 50, 0.08)",
        },
        stock: {
          ok: "#1B4332",
          low: "#B84A27",
          out: "#8E8A82",
        },
      },
      fontFamily: {
        sans: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Menlo", "Consolas", "monospace"],
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "2px",
        md: "2px",
        lg: "2px",
        xl: "2px",
      },
      boxShadow: {
        architectural: "0 1px 2px rgba(17, 17, 17, 0.04), 0 4px 16px rgba(17, 17, 17, 0.06)",
        hover3d: "0 16px 32px -8px rgba(17, 17, 17, 0.12), 0 4px 8px rgba(17, 17, 17, 0.04)",
      },
    },
  },
  plugins: [],
};
