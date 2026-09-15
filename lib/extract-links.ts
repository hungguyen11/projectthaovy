/**
 * Trích mọi link sản phẩm từ nội dung file/clipboard (Excel→text, CSV, TXT, dán trực tiếp).
 * Giữ link NGUYÊN VĂN như người dùng nhập (chỉ cắt khoảng trắng & ký tự dính cuối).
 * Trả về danh sách đã khử trùng theo URL chuẩn hoá.   © _hngnguynn_
 */
const URL_RE = /https?:\/\/[^\s"'<>(),;\[\]\u0000-\u001f]+/gi;
const TRAILING = /[.,;:!?'"")\]]+$/;
export const MAX_LINKS = 300;

function normalizeForDedupe(u: string): string {
  try {
    const x = new URL(u);
    return (
      x.host.toLowerCase().replace(/^www\./, "") +
      x.pathname.replace(/\/+$/, "") +
      x.search
    );
  } catch {
    return u;
  }
}

export function extractLinks(text: string, limit = MAX_LINKS): { links: string[]; skipped: number } {
  const out: string[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const m of text.matchAll(URL_RE)) {
    const url = m[0].replace(TRAILING, "").trim();
    if (!/^https?:\/\//i.test(url)) continue;
    let valid = true;
    try {
      const u = new URL(url);
      valid = u.protocol === "http:" || u.protocol === "https:";
    } catch {
      valid = false;
    }
    if (!valid) { skipped++; continue; }
    const key = normalizeForDedupe(url);
    if (seen.has(key)) { skipped++; continue; }
    if (out.length >= limit) { skipped++; continue; }
    seen.add(key);
    out.push(url);
  }
  return { links: out, skipped };
}
