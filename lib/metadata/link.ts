/**
 * Nhận diện MỌI định dạng link sàn → tách shopId/itemId/productId + slug + canonical.
 * Hỗ trợ: Shopee (product/-i.a.b/query-params/shortlink), TikTok Shop (view/product,
 * @shop/product, object_id, shortlink), Lazada (-i<s>-<s>.html), Tiki (-p<id>.html).
 * © _hngnguynn_
 */

export interface ShopeeLink { shopId: string; itemId: string; slug: string | null; host: string }
export interface TikTokLink { productId: string }

/** Bọc trong text chia sẻ ("Tải app Shopee... https://shopee.vn/...") → lấy URL đầu tiên. */
export function extractFirstUrl(text: string): string | null {
  const m = String(text || "").match(/https?:\/\/\S+/i);
  return m ? m[0].replace(/[),.'"\]]+$/, "") : null;
}

const SHOPEE_HOST_RE = /(^|\.)shopee\./i;

export function isShopeeHost(h: string) { return SHOPEE_HOST_RE.test(h.toLowerCase()); }
export function isTiktokHost(h: string) { return h.toLowerCase().includes("tiktok"); }

/** s.shopee.xx / shp.ee / vt.tiktok.com / s.tiktok.com — link rút gọn, cần đi theo redirect. */
export function isShortLink(u: URL): boolean {
  const h = u.hostname.toLowerCase();
  return h === "shp.ee" || h.startsWith("s.shopee.") || h === "vt.tiktok.com" || h === "s.tiktok.com";
}

export function parseShopee(u: URL): ShopeeLink | null {
  if (!isShopeeHost(u.hostname)) return null;
  let path = u.pathname;
  try { path = decodeURIComponent(path); } catch { /* giữ nguyên */ }
  const q = u.searchParams;
  const get = (...names: string[]) => {
    for (const n of names) { const v = q.get(n); if (v) return v; }
    const lower = new Map<string, string>();
    q.forEach((v, k) => lower.set(k.toLowerCase(), v));
    for (const n of names) { const v = lower.get(n.toLowerCase()); if (v) return v; }
    return null;
  };
  let shopId = "";
  let itemId = "";
  const m1 = path.match(/\/product\/(\d{2,})\/(\d{2,})/i);              // /product/123/456
  const m2 = path.match(/-i\.?(\d{2,})\.?(\d{4,})(?:\?.*)?$/i);         // -i.123.456 cuối slug
  const m3 = path.match(/\/i[./]?(\d{2,})[./](\d{4,})(?:\/|$)/i);      // /i.123.456 hoặc /i/123/456
  const m4 = path.match(/-(\d{4,})\.(\d{4,})\/?$/);                    // dạng -123.456
  for (const m of [m1, m2, m3, m4]) if (m) { shopId = m[1]; itemId = m[2]; break; }
  shopId = shopId || get("shopId", "shop_id", "shopid") || "";
  itemId = itemId || get("itemId", "item_id", "itemid") || "";
  let slug: string | null = null;
  const seg = path.split("/").filter(Boolean).pop();
  if (seg) {
    const cleaned = seg
      .replace(/-?i\.?\d{2,}\.?\d{4,}$/, "")
      .replace(/-\d{4,}\.\d{4,}$/, "")
      .replace(/\.html?$/i, "");
    if (cleaned && cleaned.length > 2 && !/^\d+$/.test(cleaned) && !/^(product|item|goods|shop|p|share|cart)$/i.test(cleaned)) slug = cleaned;
  }
  return { shopId, itemId, slug, host: u.hostname };
}

export function canonicalShopee(l: ShopeeLink): string | null {
  if (!l.shopId || !l.itemId) return null;
  return `https://${l.host}/product/${l.shopId}/${l.itemId}`;
}

/** "mŨ-LƯỠI-TRAI-TIM-i.123.456" → "MŨ LƯỠI TRAI TIM" hay ho hơn "Shopping Cart Icon". */
export function titleFromSlug(slug: string): string | null {
  if (!slug) return null;
  let s = slug
    .replace(/-?i\.?\d{2,}\.?\d{4,}$/, "")
    .replace(/-\d{4,}\.\d{4,}$/, "")
    .replace(/\.(html?|amp)$/i, "")
    .replace(/[-_+]+/g, " ")
    .replace(/%[0-9a-f]{2}/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  // chuẩn hóa viết hoa tử tế: "mũ lưỡi trai nam" → "Mũ Lưỡi Trai Nam"
  s = s.replace(/(^|\s)(\p{L})/gu, (_m, sp, ch) => sp + ch.toUpperCase());
  return s.length >= 4 && s.length <= 160 ? s : null;
}

export function parseTikTok(u: URL): TikTokLink | null {
  if (!isTiktokHost(u.hostname)) return null;
  let path = u.pathname;
  try { path = decodeURIComponent(path); } catch { /* ok */ }
  const m =
    path.match(/\/view\/product\/(\d{6,})/i) ||
    path.match(/\/shop\/product\/(\d{6,})/i) ||
    path.match(/\/shop\/p\/(\d{6,})/i) ||
    path.match(/\/p\/(\d{6,})/i) ||
    path.match(/\/product\/(\d{6,})/i);
  let id = m?.[1] || "";
  if (!id) {
    const q = u.searchParams;
    id = q.get("object_id") || q.get("product_id") || q.get("id") || "";
  }
  return /^\d{6,}$/.test(id) ? { productId: id } : null;
}

export function canonicalTikTok(l: TikTokLink): string {
  return `https://www.tiktok.com/view/product/${l.productId}`;
}

export function parseLazada(u: URL): { itemId: string } | null {
  if (!u.hostname.toLowerCase().includes("lazada")) return null;
  const m = u.pathname.match(/-i(\d{6,})(?:-s\d+)?\.html/i) || u.pathname.match(/products\/[^\s]*?-i(\d{6,})/i);
  return m ? { itemId: m[1] } : null;
}

export function parseTiki(u: URL): { itemId: string } | null {
  if (!u.hostname.toLowerCase().includes("tiki")) return null;
  const m = u.pathname.match(/-p(\d{5,})\.html/i);
  const sku = m?.[1] || u.searchParams.get("sku") || "";
  return sku ? { itemId: sku } : null;
}
