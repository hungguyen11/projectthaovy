/** Tiện ích thuần, dùng được ở cả client lẫn server. */

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** 399000 → "399.000đ" */
export function formatVnd(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${Math.round(Number(n)).toLocaleString("vi-VN")}đ`;
}

export function parseVnd(input: string | number): number | null {
  if (typeof input === "number") return Number.isFinite(input) && input >= 0 ? input : null;
  const digits = String(input || "").replace(/[^\d]/g, "");
  if (!digits) return null;
  const v = Number(digits);
  return Number.isFinite(v) && v >= 0 ? v : null;
}

/**
 * Nhập giá kiểu Việt Nam → số VND. Hỗ trợ:
 *  "399000" → 399000 · "399.000" → 399000 · "399k" → 399000
 *  "1.5tr" / "1,5tr" → 1500000 · "499k" → 499000
 */
export function parseVndFlexible(input: string): number | null {
  const s = String(input || "").toLowerCase().replace(/\s+/g, "");
  if (!s) return null;
  const m = s.match(/^(\d+(?:[.,]\d+)?)\s*(k|ky|tr|trieu|trieu)?(d|đ)?$/);
  if (m) {
    const suffix = m[2];
    const base = suffix
      ? Number(m[1].replace(",", "."))
      : Number(m[1].replace(/[.,]/g, "")); // "399.000" = mốc nghìn VN, không phải số thập phân
    if (!Number.isFinite(base) || base < 0) return null;
    if (suffix.startsWith("k")) return Math.round(base * 1_000);
    if (suffix.startsWith("tr")) return Math.round(base * 1_000_000);
    return Math.round(base);
  }
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return null;
  const v = Number(digits);
  return Number.isFinite(v) && v >= 0 ? v : null;
}

export function formatDate(iso: string | number | Date): string {
  try {
    return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "";
  }
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min} phút trước`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ngày trước`;
  return formatDate(iso);
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** Chuẩn hóa URL để so trùng: bỏ protocol/www/斜 slash cuối, lowercase */
export function normalizeUrl(u: string): string {
  return String(u || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}
