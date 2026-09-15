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
import { serpSearch, pickBestHit } from "@/lib/metadata/serp";
import type { ExtractedMeta } from "@/types";

const PAGE_TIMEOUT_MS = 9_000;
const SERP_TIMEOUT_MS = 7_000;
const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 4;
const CACHE_TTL_MS = 5 * 60_000;
const CACHE_MAX = 200;

const PAGE_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 ProjectThaoVy/1.0";

/** tiêu đề rác từ trang SPA/SEO của sàn — bỏ qua, đi tìm nguồn khác */
const JUNK_TITLE = /^(shopping cart icon|shopee(\s*việt\s*nam)?|tiktok(\s*shop)?|lazada|tiki|loading|404|error|just a moment|verify (you?|are)|access denied|security check|mkt single page application)\.?$/i;
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
  "Không nhận ra sản phẩm từ link này. Trên app sàn: bấm Chia sẻ → Sao chép liên kết rồi dán lại. Hoặc mở link, tự nhập tên + giá (vẫn lưu đủ, vẫn bấm Mua ngay được).";

async function fetchPage(
  startUrl: URL,
  timeoutMs: number
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
          "User-Agent": PAGE_UA,
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

export async function fetchMetadata(rawUrl: string): Promise<MetadataResult> {
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
  const page = await fetchPage(finalUrl, PAGE_TIMEOUT_MS);
  if (page.err === "SSRF") return fail("SSRF_BLOCKED", "Đường dẫn bị chặn bởi bộ lọc an toàn.");
  if (page.aborted) {
    // trang treo? vẫn còn cửa SERP bên dưới khi nhận diện được sàn
  } else if (page.status === 404) {
    // tiếp tục — có thể SERP/​slug cứu được
  } else if (page.status >= 400 && page.status !== 0) {
    // sàn chặn (403/429…) — không bỏ cuộc, đi SERP
  }

  let parsed: Partial<ParsedMeta> = {};
  if (page.html) {
    try {
      parsed = parseMetadata(page.html, page.visited.toString());
    } catch {
      parsed = {};
    }
  }
  let title = usableTitle(parsed.title);
  let image = parsed.image || null;
  let price = parsed.price ?? null;
  let priceLabel = parsed.price_label || null;

  const visitedStr = page.visited.toString();
  const shopee = marketplace === "SHOPEE" ? parseShopee(page.visited) : null;
  const tiktok = marketplace === "TIKTOK_SHOP" ? parseTikTok(page.visited) : null;

  // Shopee: slug trong URL chính là tên sản phẩm do sàn tự đặt — chuẩn hơn mọi suy đoán.
  const slugTitle = shopee?.slug ? usableTitle(titleFromSlug(shopee.slug)) : null;
  if (shopee?.slug && slugTitle) title = slugTitle;

  const words = slugTitle && shopee?.slug ? slugWords(shopee.slug) : "";
  const needTitle = !title;
  const needPrice = price == null && !priceLabel;
  const wantSerp = (marketplace === "SHOPEE" || marketplace === "TIKTOK_SHOP") && (needTitle || needPrice);

  if (wantSerp) {
    const queries: string[] = [];
    if (shopee?.itemId) queries.push(`shopee "${shopee.itemId}"${shopee.shopId ? ` ${shopee.shopId}` : ""}`);
    if (words) queries.push(`site:shopee.vn "${words.slice(0, 80)}"`);
    if (words && words.length > 12) queries.push(`${words} shopee giá`);
    if (tiktok?.productId) queries.push(`tiktok "product/${tiktok.productId}" giá`);
    for (const q of queries.slice(0, 2)) {
      try {
        const hits = await serpSearch(q, SERP_TIMEOUT_MS);
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
    // link rút gọn chưa kịp mở? hoặc sai link — một lần nữa báo rõ cách xử lý
    if (isShortLink(finalUrl)) return fail("SHORT_UNRESOLVED", "Link rút gọn không mở được tới trang sản phẩm — hãy dùng link đầy đủ trên thanh địa chỉ.");
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
      source_url: visitedStr || key,
    },
  };
  cacheSet(key, value);
  return value;
}

function fail(code: string, message: string): MetadataResult {
  return { ok: false, code, message };
}
