/**
 * Dịch vụ lấy metadata sản phẩm — bản "triệt để":
 *   1) Chấp nhận MỌI định dạng link (kể cả link rút gọn s.shopee / vt.tiktok,
 *      text chia sẻ có kèm chữ, slug -i.shop.item, /product/a/b, query params…).
 *   2) Đọc HTML + og tags như cũ.
 *   3) Shopee/TikTok chặn bot? → phân tích slug thành TÊN thật, và mượn
 *      snippet Bing/DuckDuckGo để lấy GIÁ do chính sàn khai (số thật, không bịa).
 *   4) Vẫn không có giá → trả ok với title, price null — UI cho nhập giá tay.
 * Timeout gọn theo tầng, cache 5 phút, chống duplicate, SSRF-guard từng hop.
 * © _hngnguynn_
 */
import { detectMarketplace } from "@/lib/config";
import { parseMetadata, type ParsedMeta } from "@/lib/metadata/parse";
import { assertPublicDns, validateUrl, SsrfError } from "@/lib/metadata/ssrf";
import { extractFirstUrl, isShortLink, parseShopee, parseTikTok, titleFromSlug } from "@/lib/metadata/link";
import { parseShopeeState } from "@/lib/metadata/state";
import { serpSearch, pickBestHit } from "@/lib/metadata/serp";
import type { ExtractedMeta } from "@/types";

const PAGE_TIMEOUT_MS = 9_000;
const SERP_TIMEOUT_MS = 7_000;
const HARD_BUDGET_MS = 24_000; // mọi tầng phải xong trong 24s → luôn trả kết quả trước maxDuration
const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 4;
const CACHE_TTL_MS = 5 * 60_000;
const CACHE_MAX = 200;

const PAGE_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 ProjectThaoVy/1.0";
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

/** tiêu đề rác từ trang SPA/SEO của sàn — bỏ qua, đi tìm nguồn khác */
const JUNK_TITLE = /^(shopping cart icon|shopee(\s*việt\s*nam)?|tiktok(\s*shop)?|tiktok\s*[-–—]\s*make your day|lazada|tiki|loading|404|error|just a moment|verify (you?|are)|access denied|security check|mkt single page application)\.?$/i;
const JUNK_INFIX = /(mua và bán trên ứng dụng|single page application|miễn phí vận chuyển|đủ loại|khuyến mãi lớn|flash sale|đang tải|access denied|just a moment)/i;

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&(nbsp|amp|quot|#39|apos|ndash|mdash|hellip|rsquo|lsquo);/gi, (_m, e) =>
      ({ nbsp: " ", amp: "&", quot: '"', "#39": "'", apos: "'", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘" } as Record<string, string>)[e.toLowerCase()] ?? " "
    )
    .replace(/\s+/g, " ")
    .trim();
}
function usableTitle(t: string | null | undefined): string | null {
  if (!t) return null;
  const s = decodeEntities(t);
  if (s.length < 5 || JUNK_TITLE.test(s) || JUNK_INFIX.test(s)) return null;
  return s.slice(0, 180);
}

/** ảnh rác (favicon/icon thương hiệu) — không phải ảnh sản phẩm → bỏ, đi tìm nguồn khác */
function usableImage(u: string | null): string | null {
  if (!u || !/^https?:/i.test(u)) return null;
  if (/favicon|\.ico($|\?)|logo[-_.]|\bicon\b|shopee-mobile|deo\.shopeemobile/i.test(u)) return null;
  return u;
}

/** Trang trung gian của link rút gọn Shopee thường CHỨA SẴN link thật (dạng mã hóa
 *  %3A%2F%2F) trong body — đào ra để đi tiếp, kể cả khi sàn không chịu redirect. */
function extractProductTarget(html: string): URL | null {
  if (!html) return null;
  for (const m of html.matchAll(/https(?:%3A(?:%2F%2F){1,2}|:\/\/)[^"'\\\s<>)]+/gi)) {
    let cand = m[0];
    try {
      cand = decodeURIComponent(cand);
    } catch {
      /* giữ nguyên */
    }
    if (!/^https?:\/\/([^/]*\.)?shopee\.[a-z.]{2,6}\//i.test(cand)) continue;
    let u: URL;
    try {
      u = new URL(cand);
    } catch {
      continue;
    }
    if (isShortLink(u)) continue;
    if (parseShopee(u)) return u;
  }
  return null;
}

/** Quét ID ảnh susercontent trong MỌI ngóc ngách HTML (kể cả JSON escape \u002f, \/) */
function harvestShopeeImage(html: string): string | null {
  const m = html.match(/(?:https?:\\?\/\\?\/)?(?:down-vn|down-sv|image-sg|[a-z]{2}-\d{6,}-.)?[^"\\]*?((?:vn|sg|th|my|ph|id|tw)-\d{6,}[-_]\w{4,}[-_][a-zA-Z0-9]{20,}[a-zA-Z0-9])/);
  if (m) {
    const id = m[1].replace(/\\/g, "");
    if (/^(vn|sg|th|my|ph|id|tw)-\d{6,}/.test(id)) return `https://down-vn.img.susercontent.com/file/${id}`;
  }
  return null;
}

export type MetadataResult =
  | { ok: true; data: ExtractedMeta; source: "cache" | "network" }
  | { ok: false; code: string; message: string };

interface CacheRow {
  t: number;
  value: MetadataResult;
}
const cache = new Map<string, CacheRow>();

function cacheGet(url: string): MetadataResult | null {
  const hit = cache.get(url);
  if (!hit) return null;
  if (Date.now() - hit.t > CACHE_TTL_MS) {
    cache.delete(url);
    return null;
  }
  return hit.value;
}
function cacheSet(url: string, value: MetadataResult) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest != null) cache.delete(oldest);
  }
  if (value.ok) cache.set(url, { t: Date.now(), value });
}

async function readBodyLimited(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder("utf-8");
  let size = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      break;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

const FALLBACK_ERROR =
  "Sàn đang chặn truy cập tự động với trang này (web đã tự thử lại 2 lượt). Vẫn lưu bình thường: bấm “Lưu sản phẩm”, tên/ảnh có thể điền tay; hoặc mở app Shopee/TikTok → Chia sẻ → Sao chép liên kết → dán lại để Lấy thông tin lần nữa.";

async function fetchPage(
  startUrl: URL,
  timeoutMs: number,
  ua: string = PAGE_UA
): Promise<{ visited: URL; html: string | null; status: number; aborted?: boolean; err?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await assertPublicDns(startUrl.hostname);
    let visited = startUrl;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(visited.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": ua,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "vi,en;q=0.8",
          Referer: visited.origin + "/",
        },
      });
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) {
        let next: URL;
        try {
          next = new URL(loc, visited);
        } catch {
          return { visited, html: null, status: res.status, err: "REDIRECT" };
        }
        try {
          visited = validateUrl(next.toString()).url;
        } catch (e) {
          return { visited, html: null, status: res.status, err: e instanceof SsrfError ? "SSRF" : "REDIRECT_BLOCKED" };
        }
        await assertPublicDns(visited.hostname);
        continue;
      }
      if (res.status >= 400) return { visited, html: null, status: res.status };
      const ctype = res.headers.get("content-type") || "";
      if (!ctype.includes("html") && !ctype.includes("text")) return { visited, html: null, status: res.status };
      const html = await readBodyLimited(res);
      return { visited, html, status: res.status };
    }
    return { visited, html: null, status: 310, err: "TOO_MANY_REDIRECTS" };
  } catch (e) {
    const err = e as Error & { name?: string };
    if (err.name === "AbortError") return { visited: startUrl, html: null, status: 0, aborted: true };
    return { visited: startUrl, html: null, status: 0, err: "NETWORK" };
  } finally {
    clearTimeout(timer);
  }
}

function slugWords(slug: string): string {
  return slug.replace(/[-_+.]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Cửa dữ liệu tốt nhất cho link /product/<shop>/<item> KHÔNG có slug (dạng chị hay dán
 * từ thanh địa chỉ): chính API nội bộ PDP mà trang sản phẩm Shopee dùng — get_pc không
 * cần session. Lấy được TÊN + ẢNH + GIÁ (giá ~×100.000; khoảng → lấy CAO NHẤT, spec).
 * Fail im lặng (403/timeout) → pipeline còn SERP + manual, không sập.
 */
interface PdpApi {
  title: string | null;
  image: string | null;
  price: number | null;
  priceLabel: string | null;
}
async function tryShopeePdpApi(host: string, shopId: string, itemId: string, timeoutMs: number): Promise<PdpApi | null> {
  if (!/^\d+$/.test(shopId) || !/^\d+$/.test(itemId)) return null;
  const url = `https://${host}/api/v4/pdp/get_pc?item_id=${itemId}&shop_id=${shopId}&detail_level=0`;
  let safe: URL;
  try {
    safe = validateUrl(url).url;
    await assertPublicDns(safe.hostname);
  } catch {
    return null;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Math.max(800, timeoutMs));
  try {
    const res = await fetch(safe.toString(), {
      signal: ctrl.signal,
      headers: {
        "User-Agent": PAGE_UA,
        Accept: "application/json",
        "Accept-Language": "vi,en;q=0.8",
        Referer: `https://${host}/product/${shopId}/${itemId}`,
      },
    });
    if (!res.ok) return null;
    const text = (await res.text()).slice(0, 400_000);
    if (!text.trimStart().startsWith("{")) return null;
    const j = JSON.parse(text) as Record<string, unknown>;
    const d = (j.data ?? j) as Record<string, unknown>;
    let item: Record<string, unknown> | null = null;
    const di = d.item as Record<string, unknown> | undefined;
    if (di && (di.title || di.name)) item = di;
    if (!item && Array.isArray(d.components)) {
      for (const c of d.components as Array<Record<string, unknown>>) {
        const md = (c.mod_data ?? c.modData) as Record<string, unknown> | undefined;
        const prod = md?.item as Record<string, unknown> | undefined;
        if (prod && (prod.title || prod.name)) {
          item = prod;
          break;
        }
      }
    }
    if (!item) return null;
    const rawTitle = typeof item.title === "string" ? item.title : typeof item.name === "string" ? item.name : "";
    const title = usableTitle(rawTitle);
    let image: string | null = null;
    const rawImg = (typeof item.image_normal === "string" && item.image_normal) || (typeof item.image === "string" && item.image) || null;
    const pickImg = (v: string) =>
      usableImage(/^https?:/i.test(v) ? v : `https://down-vn.img.susercontent.com/file/${v.replace(/\\/g, "")}`);
    if (rawImg) image = pickImg(rawImg as string);
    if (!image && Array.isArray(item.images) && item.images.length) {
      const first = item.images[0];
      if (typeof first === "string" && first) image = pickImg(first);
    }
    let price: number | null = null;
    let priceLabel: string | null = null;
    const p = item.price as Record<string, unknown> | undefined;
    const hi = Number(p?.max ?? p?.min ?? item.price_max ?? item.price_min ?? 0);
    if (Number.isFinite(hi) && hi > 100_000) {
      price = Math.round(hi / 100_000); // sàn trả giá ×100.000; range → CAO NHẤT (đúng spec giá)
      priceLabel = `${price.toLocaleString("vi-VN")}đ`;
    }
    return title || image || price != null ? { title, image, price, priceLabel } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchMetadata(rawUrl: string): Promise<MetadataResult> {
  const t0 = Date.now();
  const remain = () => HARD_BUDGET_MS - (Date.now() - t0); // ngân sách cứng — luôn trả kết quả TRƯỚC khi serverless bị chém
  const candidate = extractFirstUrl(rawUrl) || String(rawUrl || "").trim();
  let finalUrl: URL;
  try {
    finalUrl = validateUrl(candidate).url;
  } catch (e) {
    return { ok: false, code: "INVALID_URL", message: e instanceof Error ? e.message : "Đường dẫn không hợp lệ." };
  }

  const key = finalUrl.toString();
  const cached = cacheGet(key);
  if (cached) return { ...cached, source: "cache" } as MetadataResult;

  const marketplace = detectMarketplace(finalUrl.toString());
  const page = await fetchPage(finalUrl, Math.min(PAGE_TIMEOUT_MS, Math.max(2_500, remain())));
  if (page.err === "SSRF") return fail("SSRF_BLOCKED", "Đường dẫn bị chặn bởi bộ lọc an toàn.");
  // link dẫn tới trang "sản phẩm không tồn tại" của sàn → báo ĐÚNG bệnh, đừng chung chung
  const landed = page.visited.href || "";
  const dead =
    page.status === 404 || page.status === 410 || /error_page|item[_-]?not[_-]?found|product[_-]?not[_-]?exist/i.test(landed);

  let parsed: Partial<ParsedMeta> = {};
  if (page.html) {
    try {
      parsed = parseMetadata(page.html, page.visited.toString());
    } catch {
      parsed = {};
    }
  }
  let title = usableTitle(parsed.title);
  let image = usableImage(parsed.image || null);
  let price = parsed.price ?? null;
  let priceLabel = parsed.price_label || null;

  let shopee = marketplace === "SHOPEE" ? parseShopee(page.visited) : null;
  const tiktok = marketplace === "TIKTOK_SHOP" ? parseTikTok(page.visited) : null;

  // Shopee: slug trong URL chính là tên sản phẩm do sàn tự đặt — chuẩn hơn mọi suy đoán.
  const slugTitle = shopee?.slug ? usableTitle(titleFromSlug(shopee.slug)) : null;
  if (shopee?.slug && slugTitle) title = slugTitle;

  // Shopee nhúng PDP_BFF_DATA thẳng vào HTML sản phẩm → TÊN THẬT + ẢNH THẬT,
  // đọc được từ mọi server (không qua API, không qua SERP).
  if (shopee?.shopId && shopee?.itemId && (!title || !image)) {
    let stateHtml: string | null = page.html && page.html.includes("PDP_BFF_DATA") ? page.html : null;
    if (!stateHtml && remain() > 3_500) {
      const host = /^(\d+\.)?(s|mall)\./.test(page.visited.hostname) || page.visited.hostname === "shopee.vn" ? "shopee.vn" : page.visited.hostname;
      const canonUrl = new URL(`https://${host}/product/${shopee.shopId}/${shopee.itemId}`);
      let canon = await fetchPage(canonUrl, Math.min(PAGE_TIMEOUT_MS, remain() - 1_200));
      if (!canon.html && remain() > 2_800) canon = await fetchPage(canonUrl, Math.min(6_000, remain() - 1_200), MOBILE_UA);
      if (canon.html) stateHtml = canon.html;
    }
    if (stateHtml) {
      const st = parseShopeeState(stateHtml, shopee.shopId, shopee.itemId);
      if (st) {
        const stTitle = usableTitle(st.title);
        if (stTitle && (!title || title === slugTitle)) title = stTitle;
        if (!image && st.image) image = st.image;
        if (!priceLabel && st.itemStatus && st.itemStatus !== "normal" && st.itemStatus !== "active") priceLabel = null; // sản phẩm tạm khoá — vẫn lưu được
      }
    }
  }

  const words = slugTitle && shopee?.slug ? slugWords(shopee.slug) : "";

  // ═══ TỰ THỬ LẦN 2 bằng trình duyệt điện thoại — nhiều pha 429/chợp chờ đều qua ở lần 2,
  //     và nhiều ca "thiếu ảnh" là do lượt 1 rơi vào trang chặn không có og:image. ═══
  let htmlExtra: string | null = null;
  if ((marketplace === "SHOPEE" || marketplace === "TIKTOK_SHOP") && (!title || !image || (price == null && !priceLabel)) && remain() > 3_500) {
    const page2 = await fetchPage(finalUrl, Math.min(11_000, remain() - 1_500), MOBILE_UA);
    // shortlink bị chặn ở lượt 1 nhưng lượt 2 mở ra trang thật → lấy shop/item ID từ đó mà đi tiếp
    if (!shopee && marketplace === "SHOPEE" && page2.visited.hostname !== finalUrl.hostname) {
      shopee = parseShopee(page2.visited);
      if (!title && shopee?.slug) {
        const st = usableTitle(titleFromSlug(shopee.slug));
        if (st) title = st;
      }
    }
    if (page2.html) {
      htmlExtra = page2.html;
      try {
        const p2 = parseMetadata(page2.html, page2.visited.toString());
        if (!title) title = usableTitle(p2.title);
        if (!image) image = usableImage(p2.image || null);
        if (price == null && p2.price != null) price = p2.price;
        if (!priceLabel && p2.price_label) priceLabel = p2.price_label;
      } catch { /* lượt 2 lỗi parse — bỏ, vẫn còn dữ liệu lượt 1 */ }
      if (shopee?.shopId && shopee?.itemId && (!title || !image)) {
        const st2 = parseShopeeState(page2.html, shopee.shopId, shopee.itemId);
        if (st2) {
          if (!title) title = usableTitle(st2.title);
          if (!image && st2.image) image = st2.image;
        }
      }
    }
  }
  // ═══ Shortlink kẹt ở trang chặn (sàn không redirect) → đào link thật khỏi body trang đó ═══
  if (marketplace === "SHOPEE" && !shopee && isShortLink(finalUrl) && remain() > 4_000) {
    const tgt = extractProductTarget(page.html || "") || extractProductTarget(htmlExtra || "");
    if (tgt) {
      try {
        shopee = parseShopee(tgt);
        const stT = shopee?.slug ? usableTitle(titleFromSlug(shopee.slug)) : null;
        if (stT) title = title || stT;
        if (shopee?.shopId && shopee?.itemId && remain() > 2_500) {
          const deep = await fetchPage(new URL(`https://${shopee.host || "shopee.vn"}/product/${shopee.shopId}/${shopee.itemId}`), Math.min(9_000, remain() - 1_500));
          const deepHtml = deep.html || htmlExtra;
          if (deep.html) htmlExtra = deep.html;
          if (deepHtml) {
            try {
              const p3 = parseMetadata(deepHtml, deep.visited.toString());
              if (!title) title = usableTitle(p3.title);
              if (!image) image = usableImage(p3.image || null);
              if (price == null && p3.price != null) price = p3.price;
              if (!priceLabel && p3.price_label) priceLabel = p3.price_label;
            } catch { /* bỏ, còn các tầng sau */ }
            if ((!title || !image) && shopee.shopId && shopee.itemId) {
              const st3 = parseShopeeState(deepHtml, shopee.shopId, shopee.itemId);
              if (st3) {
                if (!title) title = usableTitle(st3.title);
                if (!image && st3.image) image = st3.image;
              }
            }
          }
        }
      } catch { /* trang chặn dị dạng — để SERP & lối nhập tay lo tiếp */ }
    }
  }

  // Ảnh phương án chót: quét ID file susercontent rơi vãi trong HTML (link ảnh dựng lại hợp lệ 100%)
  if (!image && marketplace === "SHOPEE") {
    const anyHtml = [page.html, htmlExtra].find((h): h is string => !!h && h.length > 5000);
    if (anyHtml) image = harvestShopeeImage(anyHtml);
  }

  // ═══ API nội bộ PDP của Shopee (get_pc) — cửa mạnh nhất cho link /product/shop/item ═══
  if (shopee?.shopId && shopee?.itemId && remain() > 3_000 && (!title || !image || (price == null && !priceLabel))) {
    const api = await tryShopeePdpApi(shopee.host || "shopee.vn", shopee.shopId, shopee.itemId, Math.min(3_000, remain() - 1_200));
    if (api) {
      if (!title && api.title) title = api.title;
      if (!image && api.image) image = api.image;
      if (price == null && !priceLabel && api.price != null) {
        price = api.price;
        priceLabel = api.priceLabel;
      }
    }
  }

  const needTitle = !title;
  const needPrice = price == null && !priceLabel;
  const wantSerp = (marketplace === "SHOPEE" || marketplace === "TIKTOK_SHOP") && (needTitle || needPrice);

  if (wantSerp) {
    const deadline = Date.now() + Math.max(0, Math.min(9_000, remain() - 1_200)); // ngân sách SERP = phần còn lại của ví cứng
    const queries: string[] = [];
    if (shopee?.itemId) queries.push(`shopee "${shopee.itemId}"${shopee.shopId ? ` ${shopee.shopId}` : ""}`);
    if (words) queries.push(`site:shopee.vn "${words.slice(0, 80)}"`);
    if (words && words.length > 12) queries.push(`${words} shopee giá`);
    if (tiktok?.productId) queries.push(`tiktok "product/${tiktok.productId}" giá`);
    for (const q of queries.slice(0, 2)) {
      const remain = deadline - Date.now();
      if (remain < 1_200) break;
      try {
        const hits = await serpSearch(q, Math.min(SERP_TIMEOUT_MS, remain));
        const hit = pickBestHit(hits, {
          ids: [shopee?.itemId, shopee?.shopId, tiktok?.productId].filter(Boolean) as string[],
          words: words ? words.split(" ").filter(w => w.length > 3).slice(0, 5) : [],
        });
        // an toàn tuyệt đối: chỉ nhận kết quả mà chính snippet nhắc tới domain của sàn
        const hostOk = hit
          ? (hit.snippet + " " + hit.title).toLowerCase().includes(marketplace === "SHOPEE" ? "shopee" : "tiktok")
          : false;
        if (hit && hostOk) {
          if (needTitle) {
            const t = usableTitle(hit.title.replace(/\s*[|•–—-]\s*(shopee|tiktok).*$/i, ""));
            if (t) title = t;
          }
          if (needPrice && hit.price != null) {
            price = hit.price;
            priceLabel = hit.priceLabel || null;
          }
          if (title && (price != null || priceLabel)) break;
        }
      } catch { /* engine fail — đi tiếp */ }
    }
  }

  const hasSomething = !!(title || image || price != null || priceLabel);

  if (!hasSomething) {
    // ĐÚNG bệnh: shortlink CHƯA mở được (vẫn đứng ở trang chặn) khác với đã vào tới trang
    // sản phẩm mà sàn không chịu nhả dữ liệu (BLOCKED — 6 cửa đều đã thử).
    if (isShortLink(finalUrl) && page.visited.hostname === finalUrl.hostname && !shopee)
      return fail(
        "SHORT_UNRESOLVED",
        "Link rút gọn không mở được tới trang sản phẩm (đã thử 2 lượt). Mở link trên điện thoại → bấm Chia sẻ → Sao chép liên kết → dán link ĐẦY ĐỦ (bắt đầu bằng https://shopee.vn/... hoặc /product/...) rồi thử lại. Hoặc cứ bấm “Lưu sản phẩm” — link vẫn lưu và bấm Mua ngay được."
      );
    if (dead) return fail("DEAD_LINK", "Sàn trả về trang “sản phẩm không tồn tại” — món này có thể đã bị gỡ. Mở link trên điện thoại kiểm tra lại, hoặc lấy link mới rồi dán lại nhé.");
    if (page.aborted) return fail("TIMEOUT", "Trang sàn phản hồi chậm (đã tự thử lại 2 lượt). Bấm “Lấy lại thông tin” lần nữa, hoặc cứ Lưu tay tên + giá — link vẫn dùng mua bình thường.");
    return fail(marketplace === "OTHER" ? "NO_DATA" : "BLOCKED", FALLBACK_ERROR);
  }

  const value: MetadataResult = {
    ok: true,
    source: "network",
    data: {
      image,
      title: title || `Sản phẩm ${marketplace === "SHOPEE" ? "Shopee" : marketplace === "TIKTOK_SHOP" ? "TikTok Shop" : ""}`.trim(),
      price,
      price_label: priceLabel,
      marketplace,
      source_url: key, // LUÔN trả đúng link user nhập (giữ nguyên shortlink affiliate để tính click)
    },
  };
  cacheSet(key, value);
  return value;
}

function fail(code: string, message: string): MetadataResult {
  return { ok: false, code, message };
}
