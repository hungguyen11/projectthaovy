/**
 * Khi sàn chặn bot (Shopee trả trang SPA rỗng / API 403), mượn chỉ mục tìm kiếm:
 * tiêu đề + giá của chính sản phẩm nằm trong snippet Bing/DuckDuckGo — số liệu THẬT
 * do sàn tự khai với search engine, không bịa. Timeout ngắn, im lặng thất bại.
 * © _hngnguynn_
 */

export interface SerpHit { title: string; snippet: string; price: number | null; priceLabel: string | null }

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function timedFetch(url: string, ms: number, init?: RequestInit): Promise<string | null> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    const res = await fetch(url, { redirect: "follow", ...init, signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const txt = await res.text();
    return txt.length > 800 ? txt : null;
  } catch {
    return null;
  }
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "129.000₫", "giá chỉ từ 20.000đ", "299,000đ – 499,000đ" → {min,max,label} */
export function extractPrices(text: string): { price: number | null; label: string | null } {
  const re = /(\d{1,3}(?:\.\d{3})+|\d{4,})(?=\s?(?:₫|đ(?![a-z]))|đồng)/gi;
  const vals: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const v = parseInt(m[1].replace(/\./g, ""), 10);
    if (v >= 990 && v <= 90_000_000) vals.push(v);
  }
  if (!vals.length) return { price: null, label: null };
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const raw = text.match(/(\d{1,3}(?:\.\d{3})+|\d{4,})\s?(?:₫|đ)(?:\s*[–—-]\s*\d{1,3}(?:\.\d{3})+)?/i);
  return { price: min, label: raw ? stripTags(raw[0]) : min + "₫" };
}

function cleanTitle(t: string): string {
  return stripTags(t).replace(/\s*[|•–]\s*(shopee|tiktok).*$/i, "").replace(/\s*\|\s*Shopee.*$/i, "").trim();
}

/** Parse kết quả RSS của Bing (đầu ra ít bị chặn bot nhất, cấu trúc sạch). */
export function parseRss(xml: string): SerpHit[] {
  const out: SerpHit[] = [];
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const it of items.slice(0, 8)) {
    const raw = (tag: string) => {
      const m = it.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      if (!m) return "";
      return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
    };
    const title = cleanTitle(raw("title"));
    if (!title || title.length < 6) continue;
    const snippet = stripTags(raw("description") + " " + raw("link"));
    const { price, label } = extractPrices(title + " " + snippet);
    out.push({ title, snippet, price, priceLabel: label });
  }
  return out;
}

async function bingRss(query: string, ms: number): Promise<SerpHit[]> {
  const xml = await timedFetch(
    "https://www.bing.com/search?q=" + encodeURIComponent(query) + "&format=rss&count=10&setlang=vi",
    ms,
    { headers: { "User-Agent": UA, Accept: "application/rss+xml,application/xml,text/xml,*/*", "Accept-Language": "vi,en;q=0.8" } }
  );
  return xml ? parseRss(xml) : [];
}

async function bing(query: string, ms: number): Promise<SerpHit[]> {
  const html = await timedFetch(
    "https://www.bing.com/search?q=" + encodeURIComponent(query) + "&count=10&setlang=vi",
    ms,
    { headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "vi,en;q=0.8" } }
  );
  if (!html) return [];
  const out: SerpHit[] = [];
  const blocks = html.match(/<li class="b_algo[\s\S]*?<\/li>/g) || [];
  for (const b of blocks.slice(0, 6)) {
    const titleM = b.match(/<h2[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/);
    const snM = b.match(/(?:b_lineclamp[^"]*|b_caption[\s\S]{0,120}?<p[^>]*>)\s*>([\s\S]*?)<\/p>/);
    const citeM = b.match(/<cite>([\s\S]*?)<\/cite>/);
    const title = titleM ? cleanTitle(titleM[1]) : "";
    if (!title || title.length < 6) continue;
    const snippet = stripTags((snM?.[1] || "") + " " + (citeM?.[1] || ""));
    const { price, label } = extractPrices(title + " " + snippet);
    out.push({ title, snippet, price, priceLabel: label });
  }
  return out;
}

async function ddg(query: string, ms: number): Promise<SerpHit[]> {
  const html = await timedFetch(
    "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query),
    ms,
    { headers: { "User-Agent": UA, Accept: "text/html", "Content-Type": "application/x-www-form-urlencoded" } }
  );
  if (!html) return [];
  const out: SerpHit[] = [];
  const titles = html.match(/<a[^>]*result__a[^>]*>([\s\S]*?)<\/a>/g) || [];
  const snips = html.match(/<a[^>]*result__snippet[^>]*>([\s\S]*?)<\/a>/g) || [];
  for (let i = 0; i < Math.min(titles.length, 6); i++) {
    const title = cleanTitle(titles[i].replace(/<[^>]+>/g, ""));
    if (!title || title.length < 6) continue;
    const snippet = stripTags(snips[i] || "");
    const { price, label } = extractPrices(title + " " + snippet);
    out.push({ title, snippet, price, priceLabel: label });
  }
  return out;
}

/** Thử lần lượt các engine, trả về danh sách kết quả (có thể rỗng — im lặng). */
export async function serpSearch(query: string, timeoutMs = 8000): Promise<SerpHit[]> {
  for (const fn of [bingRss, bing, ddg]) {
    try {
      const hits = await fn(query, timeoutMs);
      if (hits.length) return hits;
    } catch { /* engine kế */ }
  }
  return [];
}

/** Chọn hit "khớp sản phẩm" nhất — có cổng kiểm tra độ liên quan:
 *  khớp id → khớp ≥50% từ slug → nếu không có key nào thì mới nhận hit có giá.
 *  Không khớp = trả null (thà để user tự nhập còn hơn lưu tên sai). */
export function pickBestHit(
  hits: SerpHit[],
  keys: { ids?: string[]; words?: string[] }
): SerpHit | null {
  if (!hits.length) return null;
  const ids = (keys.ids || []).filter(Boolean);
  const words = (keys.words || []).filter(w => w.length > 3).map(w => w.toLowerCase()).slice(0, 6);
  for (const h of hits) {
    const hay = (h.title + " " + h.snippet).toLowerCase();
    if (ids.length && ids.every(k => hay.includes(k.toLowerCase()))) return h;
  }
  if (words.length) {
    for (const h of hits) {
      const hay = (h.title + " " + h.snippet).toLowerCase();
      const n = words.filter(w => hay.includes(w)).length;
      if (n >= Math.min(2, words.length) || n === words.length) return h;
    }
    return null; // có từ khóa slug mà không hit nào khớp → rác, bỏ
  }
  if (ids.length) return null; // tìm theo id mà không hit nào chứa id → bỏ
  return hits.find(h => h.price != null) || null;
}
