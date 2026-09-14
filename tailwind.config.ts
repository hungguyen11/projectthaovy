import colors from "tailwindcss/colors";
import type { Config } from "tailwindcss";

/**
 * ProjectThaoVy — Design System "Aqua Pastel" (v4 — theo mock của chủ nhân 🫧)
 * Nền mist xanh mint siêu nhạt · card trắng bo mềm · giá màu san hô ·
 * hồng candy cho yêu thích/ưu tiên · button teal pastel (gradient nhẹ).
 * © _hngnguynn_
 */
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        cta: "#0B7C76",
        /* token "teal" = họ nút/chip chính — giờ là mint-teal pastel */
        teal: {
          DEFAULT: "#0FB5AD",
          deep: "#0E9A93",
          soft: "#E3F7F4",
          ink: "#0B7C76",
          200: "#99F6E4",
          300: "#5EEAD4",
          950: "#0E3A3D",
        },
        aqua: { DEFAULT: "#7DEAE0", mist: "#EAF9F7", soft: "#F4FBFA" },
        pinky: { DEFAULT: "#FB72A8", soft: "#FFE4F0" },
        coral: { DEFAULT: "#F4522E", soft: "#FFEBE5" },
        lilac: { DEFAULT: "#8B5CF6", soft: "#EFE9FE" },
        baby: { DEFAULT: "#38BDF8", soft: "#E0F2FE" },
        mint: { DEFAULT: "#10B981", soft: "#DFF7EC" },
        honey: { DEFAULT: "#F59E0B", soft: "#FFF3DE" },
        rose: { ...colors.rose, DEFAULT: "#EF4444", soft: "#FFE9E9" },
      },
      fontFamily: {
        sans: [
          '"Be Vietnam Pro"',
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "18px",
        field: "12px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(24,64,68,.05), 0 2px 8px rgba(24,64,68,.05)",
        lift: "0 12px 28px -14px rgba(15,181,173,.35), 0 2px 8px rgba(24,64,68,.06)",
        pop: "0 24px 60px -16px rgba(14,120,116,.28), 0 6px 18px rgba(24,64,68,.08)",
        cta: "0 8px 20px -8px rgba(15,181,173,.45)",
      },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "none" } },
        pop: { from: { opacity: "0", transform: "translateY(-6px) scale(.98)" }, to: { opacity: "1" } },
      },
      animation: {
        rise: "rise .25s cubic-bezier(.2,.8,.2,1) both",
        pop: "pop .18s ease both",
      },
    },
  },
  plugins: [],
};

export default config;
