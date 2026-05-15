import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand greens — pulled from screenshot reference
        brand: {
          50: "#EEF7F0",
          100: "#D6ECDB",
          200: "#A9D6B5",
          300: "#74BB86",
          400: "#3F9E5F",
          500: "#1F8047",
          600: "#0E6839",
          700: "#0B5D3B", // primary
          800: "#08482E",
          900: "#063522",
        },
        mint: {
          200: "#B7E4C7",
          300: "#7DCDA0",
          400: "#34D399",
        },
        // Page surface
        canvas: "#F5F7F4",
        // Status / gauge stops
        danger: "#EF4444",
        warn: "#F59E0B",
        ok: "#10B981",
        // Text
        ink: {
          900: "#0F1F17",
          700: "#28342D",
          500: "#5C6A63",
          400: "#7E8B85",
          300: "#A6B0AB",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,31,23,0.04), 0 6px 20px -8px rgba(15,31,23,0.08)",
        pop: "0 10px 30px -10px rgba(11,93,59,0.35)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #0B5D3B 0%, #1F8047 55%, #34D399 120%)",
        "brand-soft":
          "linear-gradient(135deg, #EEF7F0 0%, #D6ECDB 100%)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 220ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
