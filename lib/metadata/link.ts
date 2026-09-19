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
  const m0 = path.match(/\/[a-z][a-z0-9_-]{1,12}\/(\d{4,})\/(\d{6,})(?:\/|$)/i); // /opaanlp/357915542/9024478325 — link affiliate
  const m2 = path.match(/-i\.?(\d{2,})\.?(\d{4,})(?:\?.*)?$/i);         // -i.123.456 cuối slug
  const m3 = path.match(/\/i[./]?(\d{2,})[./](\d{4,})(?:\/|$)/i);        // /i.123.456 hoặc /i/123/456
  const m4 = path.match(/-(\d{4,})\.(\d{4,})\/?$/);                      // dạng -123.456
  for (const m of [m1, m0, m2, m3, m4]) if (m) { shopId = m[1]; itemId = m[2]; break; }
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

/* ══════════ ĐỘN GỪNG KHI SÀN BẮT ĐĂNG NHẬP (chặn mọi server trên đời) ══════════
 * Admin MỞ trang sản phẩm bằng trình duyệt của mình (đã đăng nhập) → Ctrl+A → Ctrl+C
 * → dán vào web. Web chỉ CHỮA LIỆU ĐỌC từ chính nội dung sàn — không bịa gì. */
export interface ClipboardProduct {
  title: string | null;
  price: number | null;
  priceLabel: string | null;
  image: string | null;
}

const CLIP_JUNK =
  /^(https?:\/\/|\/|m\.shopee|tải app|đăng nhập|đăng ký|quét mã|trở thành|danh mục|tìm kiếm|chat với shop|theo dõi|bản quyền|©|điều khoản|trợ giúp|giỏ hàng|flash sale|săn deal|shopee vip|voucher|freeship|sản phẩm tương tự|có thể bạn thích|đánh giá|thông tin shop|đơn hàng|bán chạy nhất|danh hiệu)/i;
const PRICE_RE = /(\d{1,3}(?:\.\d{3})+)\s*[đ₫]/g;

export function parseClipboardProduct(text: string): ClipboardProduct {
  const raw = String(text || "").replace(/\r/g, "");
  const out: ClipboardProduct = { title: null, price: null, priceLabel: null, image: null };
  const trimmed = raw.trim();

  // dạng JSON từ DevTools copy() — {title, image, price|price:{min,max}} (đơn vị đ hoặc ×100.000)
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const j = JSON.parse(trimmed) as Record<string, unknown>;
      if (typeof j.title === "string" && j.title.trim()) out.title = j.title.replace(/\s+/g, " ").trim().slice(0, 500);
      if (typeof j.image === "string" && /^https?:/i.test(j.image)) out.image = j.image;
      let p: number | null = null;
      if (typeof j.price === "number" && Number.isFinite(j.price)) p = j.price;
      else if (j.price && typeof j.price === "object") {
        const pr = j.price as Record<string, unknown>;
        const hi = Number(pr.max ?? pr.min ?? 0);
        if (Number.isFinite(hi) && hi > 0) p = hi;
      }
      if (p != null) {
        if (p > 100_000_000) p = Math.round(p / 100_000); // dạng nội bộ ×100.000 của sàn (mọi món thật đều >1e8 theo đơn vị này)
        out.price = p;
        out.priceLabel = `${p.toLocaleString("vi-VN")}đ`;
      }
      return out;
    } catch {
      /* không phải JSON — đọc như text thường */
    }
  }

  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);

  // TÊN: dòng chữ "ra chữ" đầu tiên, đủ dài, không phải menu/rác của sàn
  for (const l of lines.slice(0, 90)) {
    if (l.length < 12 || l.length > 320) continue;
    if (CLIP_JUNK.test(l)) continue;
    const letters = (l.match(/[A-Za-zÀ-ỹ]/g) || []).length;
    if (letters < 8 || letters < l.length * 0.35) continue;
    const cleaned = l.replace(/^["'"“”]+\s*/, "").replace(/\s*["'"“”]+$/, "").trim();
    if (cleaned.length >= 12) {
      out.title = cleaned.slice(0, 500);
      break;
    }
  }

  // GIÁ: dòng "Ađ - Bđ" (khoảng giá variant) → lấy CAO NHẤT; không có range → giá bán đầu tiên
  const head = lines.slice(0, 60).join("\n");
  const rangeM = head.match(/(\d{1,3}(?:\.\d{3})+)\s*[đ₫]\s*[-–]\s*(\d{1,3}(?:\.\d{3})+)\s*[đ₫]/);
  if (rangeM) {
    const lo = Number(rangeM[1].replace(/\./g, ""));
    const hi = Number(rangeM[2].replace(/\./g, ""));
    out.price = Math.max(lo, hi);
    out.priceLabel = `${lo.toLocaleString("vi-VN")}đ - ${hi.toLocaleString("vi-VN")}đ`;
  } else {
    PRICE_RE.lastIndex = 0;
    const m = head.match(/(?:^|\s|[^\d.,])(\d{1,3}(?:\.\d{3})+)\s*[đ₫](?!\d)/); // giá bán hiển thị đầu tiên
    if (m) {
      const v = Number(m[1].replace(/\./g, ""));
      if (Number.isFinite(v) && v > 0) {
        out.price = v;
        out.priceLabel = `${v.toLocaleString("vi-VN")}đ`;
      }
    }
  }

  // ảnh (nếu trong trang có URL ảnh hiện sẵn khi copy)
  const im = trimmed.match(/https?:\/\/[^\s"'\\]+susercontent[^\s"'\\]*/i) || trimmed.match(/https?:\/\/[^\s"'\\]+\.(?:jpg|jpeg|png|webp)[^\s"'\\]*/i);
  if (im) out.image = im[0];
  return out;
}
