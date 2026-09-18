/**
 * Metadata parser thuần (không phụ thuộc network) — dễ unit test.
 * Chiến lược (theo spec §19):
 *   1. Open Graph  →  2. Twitter Card  →  3. JSON-LD  →  4. Schema.org / itemprop
 * Chỉ lấy: IMAGE, TITLE, PRICE. Không bịa giá.
 */

export interface ParsedMeta {
  title: string | null;
  image: string | null;
  /** giá nhỏ nhất tìm được (dùng để tính ngân sách) */
  price: number | null;
  /** chuỗi hiển thị gốc, ví dụ "299.000đ – 499.000đ" */
  price_label: string | null;
}

/* ── helpers ── */

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function attr(html: string, pattern: RegExp): string | null {
  const m = html.match(pattern);
  if (!m) return null;
  const raw = m[1] || m[2] || "";
  const v = decodeEntities(raw);
  return v ? v : null;
}

/** meta tag: property hoặc name, content nằm trước hoặc sau đều được */
function metaContent(html: string, keys: string[]): string | null {
  for (const k of keys) {
    const esc = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pats = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${esc}["'][^>]*\\bcontent=["']([^"']*)["']`, "i"),
      new RegExp(`<meta[^>]+\\bcontent=["']([^"']*)["'][^>]*(?:property|name)=["']${esc}["']`, "i"),
    ];
    for (const p of pats) {
      const v = attr(html, p);
      if (v) return v;
    }
  }
  return null;
}

function absUrl(u: string, base: string): string | null {
  try {
    return new URL(decodeEntities(u), base).toString();
  } catch {
    return null;
  }
}

/** "299.000" | "1,299,000" | "VND 1.299.000" | "129000" → number */
export function parsePriceString(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  const s = String(raw);
  // Lấy số đầu tiên trong chuỗi, hỗ trợ dấu phân cách nghìn . hoặc ,
  const m = s.match(/(\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,](\d{1,2}))?\s*(?:₫|đ|vnd|dong)?/i);
  if (!m) return null;
  const intPart = m[1].replace(/[.,]/g, "");
  const v = Number(intPart);
  return Number.isFinite(v) && v >= 0 ? v : null;
}

/* ── JSON-LD ── */

type LdNode = Record<string, unknown> | LdNode[] | null;

function walkLd(node: LdNode, visit: (obj: Record<string, unknown>) => void): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => walkLd(n as LdNode, visit));
    return;
  }
  const obj = node as Record<string, unknown>;
  if (obj["@graph"]) walkLd(obj["@graph"] as LdNode, visit);
  visit(obj);
}

function isProductNode(o: Record<string, unknown>): boolean {
  const t = o["@type"];
  if (typeof t === "string") return t.toLowerCase() === "product";
  if (Array.isArray(t)) return t.some((x) => String(x).toLowerCase() === "product");
  return false;
}

export function extractJsonLdBlocks(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const body = m[1].trim();
    if (!body || body.includes("<!--")) continue;
    try {
      const parsed = JSON.parse(decodeEntities(body));
      if (parsed && typeof parsed === "object") out.push(parsed);
    } catch {
      /* JSON-LD hỏng → bỏ qua, thử cách khác */
    }
  }
  return out;
}

function ldString(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (Array.isArray(v) && v.length) {
    const first = v[0];
    if (typeof first === "string") return first.trim() || null;
    if (first && typeof first === "object" && "url" in (first as object)) {
      return ldString((first as Record<string, unknown>).url);
    }
  }
  if (v && typeof v === "object" && "url" in (v as object)) {
    return ldString((v as Record<string, unknown>).url);
  }
  return null;
}

/* ── main ── */

export function parseMetadata(html: string, baseUrl: string): ParsedMeta {
  const blocks = extractJsonLdBlocks(html);

  let product: Record<string, unknown> | null = null;
  let offer: Record<string, unknown> | null = null;
  for (const root of blocks) {
    walkLd(root as LdNode, (o) => {
      if (!product && isProductNode(o)) product = o;
      const t = (o as Record<string, unknown>)["@type"];
      const isOffer = typeof t === "string" && t.toLowerCase() === "aggregateoffer" || (Array.isArray(t) && t.some((x) => String(x).toLowerCase() === "aggregateoffer"));
      if (!offer && isOffer) offer = o;
      if (o["offers"] && typeof o["offers"] === "object" && !Array.isArray(o["offers"])) {
        const of = o["offers"] as Record<string, unknown>;
        if (!offer || of === product) offer = of;
        if (!offer) offer = of;
      }
    });
  }

  /* ── TITLE ── */
  let title =
    metaContent(html, ["og:title", "og:title:content", "twitter:title", "twitter:title:content"]);
  if (!title && product) title = ldString((product as Record<string, unknown>).name);
  if (!title) {
    const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (t) title = decodeEntities(t[1]).replace(/\s+/g, " ");
  }
  // dọn hậu tố sàn: "- Shopee Việt Nam", "| TikTok Shop"…
  if (title) {
    title = title
      .replace(/\s*[|–—-]\s*(shopee|tiktok shop|tiktok|lazada|tiki).*$/i, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 240);
    if (!title) title = null;
  }

  /* ── IMAGE ── */
  let image: string | null =
    metaContent(html, ["og:image:url", "og:image", "twitter:image", "twitter:image:src"]);
  if (!image && product) image = ldString((product as Record<string, unknown>).image);
  if (image) image = absUrl(image, baseUrl);
  // Shopee/thường dùng ảnh https — bỏ qua http bị mixed-content? vẫn trả về, browser lo.
  if (image && !/^https?:/i.test(image)) image = null;

  /* ── PRICE ── */
  let price: number | null = null;
  let label: string | null = null;

  const offers = (offer || (product ? (product as Record<string, unknown>).offers : null)) as
    | Record<string, unknown>
    | Record<string, unknown>[]
    | null;

  const low = offers && !Array.isArray(offers) ? ldString(offers.lowPrice) ?? ldString(offers.minPrice) : null;
  const high = offers && !Array.isArray(offers) ? ldString(offers.highPrice) ?? ldString(offers.maxPrice) : null;
  const single =
    offers && !Array.isArray(offers)
      ? ldString(offers.price)
      : Array.isArray(offers) && offers.length
        ? ldString((offers[0] as Record<string, unknown>).price)
        : null;

  const pLow = parsePriceString(low);
  const pHigh = parsePriceString(high);
  const pSingle = parsePriceString(single);

  if (pLow != null && pHigh != null && pLow !== pHigh && low && high) {
    // quy tắc spec 2026-09: giá khoảng (vd 200k–280k) → lấy số CAO NHẤT để tính,
    // price_label vẫn giữ nguyên khoảng gốc để hiển thị thật
    const lo = Math.min(pLow, pHigh);
    const hi = Math.max(pLow, pHigh);
    price = hi;
    label = `${lo.toLocaleString("vi-VN")}đ – ${hi.toLocaleString("vi-VN")}đ`;
  } else if (pSingle != null) {
    price = pSingle;
    label = single && String(single).includes("-") ? String(single) : null;
  }

  if (price == null) {
    // itemprop (Schema.org dạng microdata)
    const item = attr(
      html,
      /<(?:meta|span)[^>]+itemprop=["']price["'][^>]*(?:content=["']([^"']*)["'])?(?:[^>]*>([\s\S]{0,24})<\/span>)?/i
    );
    const p = parsePriceString(item);
    if (p != null) {
      price = p;
    } else {
      // bước cuối: dò text giá VND quanh từ khóa giá
      const m = html.match(
        /(?:đóng giá|giá bán|sale-price|product-price|price)[^₫đ\n]{0,80}?([\d][\d.,]{2,14})\s*(?:₫|đ\b|VND)/i
      );
      const p = parsePriceString(m?.[1]);
      if (p != null && p >= 1000) price = p; // ≥ 1.000đ — tránh bắt nhầm số lẻ
    }
  }

  if (price != null && !label) {
    label = `${price.toLocaleString("vi-VN")}đ`;
  }

  return { title, image, price, price_label: label ? String(label).replace(/\s+/g, " ").trim().slice(0, 80) : null };
}
