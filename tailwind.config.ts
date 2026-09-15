import colors from "tailwindcss/colors";
import type { Config } from "tailwindcss";

/**
 * ProjectThaoVy — Design System "Cyan Minimal" (v5)
 * Nền trắng/xám rất nhạt · chữ slate đậm · accent CYAN chỉ cho điểm nhấn
 * (nút chính, active, icon, highlight) · dark navy/charcoal độ tương phản cao.
 * Card bo 18px, border mảnh, shadow rất nhẹ, typography Inter.
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
        cta: "rgb(var(--accent-ink) / <alpha-value>)",
        /* token "teal" = accent của app — đổi theo CHỦ ĐỀ màu (CSS vars trong globals.css) */
        teal: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          deep: "rgb(var(--accent-deep) / <alpha-value>)",
          soft: "rgb(var(--accent-soft) / <alpha-value>)",
          ink: "rgb(var(--accent-ink) / <alpha-value>)",
          200: "rgb(var(--accent-200) / <alpha-value>)",
          300: "rgb(var(--accent-300) / <alpha-value>)",
          950: "rgb(var(--accent-950) / <alpha-value>)",
        },
        aqua: {
          DEFAULT: "rgb(var(--accent-bright) / <alpha-value>)",
          mist: "rgb(var(--accent-mist) / <alpha-value>)",
          soft: "rgb(var(--accent-softer) / <alpha-value>)",
        },
        pinky: { DEFAULT: "#EC4899", soft: "#FDEFF7" },
        lilac: { DEFAULT: "#8B5CF6", soft: "#F1EDFE" },
        baby: { DEFAULT: "#38BDF8", soft: "#EAF6FE" },
        mint: { DEFAULT: "#10B981", soft: "#E6F7F0" },
        honey: { DEFAULT: "#F59E0B", soft: "#FEF4E3" },
        rose: { ...colors.rose, DEFAULT: "#E11D48", soft: "#FEE9ED" },
      },
      fontFamily: {
        sans: [
          "Inter",
          '"Be Vietnam Pro"',
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
        card: "0 1px 2px rgba(15,23,42,.05), 0 1px 3px rgba(15,23,42,.04)",
        lift: "0 12px 28px -14px rgba(8,145,178,.28), 0 2px 8px rgba(15,23,42,.05)",
        pop: "0 24px 64px -18px rgba(8,42,74,.22), 0 6px 18px rgba(15,23,42,.07)",
        cta: "0 8px 20px -8px rgba(8,145,178,.40)",
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
