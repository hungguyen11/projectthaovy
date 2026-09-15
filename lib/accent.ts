/**
 * Bộ chủ đề màu nhấn (accent) — lưu trong localStorage, áp bằng data-accent
 * trên <html>; mọi token teal/aqua/cta reading from CSS vars (globals.css).
 * © _hngnguynn_
 */
export type AccentId = "cyan" | "iris" | "rose" | "emerald" | "amber";

export interface AccentDef {
  id: AccentId;
  label: string;
  /** hai màu cho ô xem trước — gradient nhẹ */
  swatch: [string, string];
}

export const ACCENTS: AccentDef[] = [
  { id: "cyan", label: "Cyan", swatch: ["#22D3EE", "#0E7490"] },
  { id: "iris", label: "Tím Iris", swatch: ["#A78BFA", "#6D28D9"] },
  { id: "rose", label: "Hồng Đào", swatch: ["#FB7185", "#BE123C"] },
  { id: "emerald", label: "Xanh Ngọc", swatch: ["#34D399", "#047857"] },
  { id: "amber", label: "Hổ Phách", swatch: ["#FBBF24", "#B45309"] },
];

const KEY = "tv-accent";

export function getAccent(): AccentId {
  if (typeof window === "undefined") return "cyan";
  try {
    const v = window.localStorage.getItem(KEY);
    if (v && ACCENTS.some((a) => a.id === v)) return v as AccentId;
  } catch { /* private mode */ }
  return "cyan";
}

export function applyAccent(a: AccentId) {
  const el = document.documentElement;
  if (a === "cyan") el.removeAttribute("data-accent");
  else el.setAttribute("data-accent", a);
}

export function setAccent(a: AccentId) {
  try {
    window.localStorage.setItem(KEY, a);
  } catch { /* bỏ qua */ }
  applyAccent(a);
}
