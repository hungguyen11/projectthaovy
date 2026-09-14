/**
 * Dịch vụ lấy metadata sản phẩm: fetch an toàn (SSRF-guarded) + parse.
 * - Timeout 12s (spec §21), theo redirect thủ tối đa 3 hop (mỗi hop kiểm SSRF).
 * - Cache in-memory 5 phút, chống duplicate request (spec §57).
 * - Không bao giờ "loading vô hạn": mọi nhánh đều trả về ok:false kèm thông điệp.
 */
import { detectMarketplace } from "@/lib/config";
import { parseMetadata, type ParsedMeta } from "@/lib/metadata/parse";
import { assertPublicDns, validateUrl, SsrfError } from "@/lib/metadata/ssrf";
import type { ExtractedMeta } from "@/types";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 1_500_000; // 1.5MB HTML là đủ
const MAX_REDIRECTS = 3;
const CACHE_TTL_MS = 5 * 60_000;
const CACHE_MAX = 200;

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
  // chỉ cache kết quả thành công để user có thể retry lỗi ngay
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
  "Không thể lấy thông tin sản phẩm từ liên kết này. Trang có thể yêu cầu đăng nhập hoặc chặn truy cập tự động — hãy thử lại, hoặc mở link rồi sao chép thủ công ở phiên bản đầy đủ.";

export async function fetchMetadata(rawUrl: string): Promise<MetadataResult> {
  let finalUrl: URL;
  try {
    finalUrl = validateUrl(rawUrl).url;
  } catch (e) {
    return {
      ok: false,
      code: e instanceof SsrfError ? "INVALID_URL" : "INVALID_URL",
      message: e instanceof Error ? e.message : "Đường dẫn không hợp lệ.",
    };
  }

  const key = finalUrl.toString();
  const cached = cacheGet(key);
  if (cached) return { ...cached, source: "cache" } as MetadataResult;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    await assertPublicDns(finalUrl.hostname);

    let res: Response | null = null;
    let visited = finalUrl;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      res = await fetch(visited.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 ProjectThaoVyPreview/1.0",
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
          return fail("INVALID_URL", "Liên kết chuyển hướng không hợp lệ.");
        }
        try {
          visited = validateUrl(next.toString()).url;
        } catch (e) {
          return fail("REDIRECT_BLOCKED", e instanceof Error ? e.message : "Chuyển hướng bị chặn.");
        }
        await assertPublicDns(visited.hostname);
        continue;
      }
      break;
    }

    if (!res) return fail("NETWORK", FALLBACK_ERROR);
    if (res.status === 404) return fail("NOT_FOUND", "Không tìm thấy sản phẩm (trang 404).");
    if (res.status === 403 || res.status === 429 || res.status === 451) {
      return fail("BLOCKED", `Sàn chặn truy cập tự động (lỗi ${res.status}). Hãy thử lại sau ít phút.`);
    }
    if (res.status >= 400) return fail("HTTP", `Máy chủ trả về lỗi HTTP ${res.status}.`);

    const ctype = res.headers.get("content-type") || "";
    if (!ctype.includes("html") && !ctype.includes("text")) {
      return fail("NO_DATA", FALLBACK_ERROR);
    }
    const html = await readBodyLimited(res);

    let parsed: ParsedMeta;
    try {
      parsed = parseMetadata(html, visited.toString());
    } catch {
      return fail("PARSE", FALLBACK_ERROR);
    }

    if (!parsed.title && !parsed.image && parsed.price == null) {
      return fail("NO_DATA", FALLBACK_ERROR);
    }

    const value: MetadataResult = {
      ok: true,
      source: "network",
      data: {
        image: parsed.image,
        title: parsed.title || "Sản phẩm (không đọc được tên)",
        price: parsed.price,
        price_label: parsed.price_label,
        marketplace: detectMarketplace(visited.toString()),
        source_url: visited.toString(),
      },
    };
    cacheSet(key, value);
    return value;
  } catch (e) {
    const err = e as Error & { name?: string };
    if (err.name === "AbortError") {
      return fail("TIMEOUT", "Máy chủ phản hồi quá chậm (hết thời gian chờ). Vui lòng thử lại.");
    }
    if (err instanceof SsrfError) return fail("SSRF_BLOCKED", err.message);
    return fail("NETWORK", FALLBACK_ERROR);
  } finally {
    clearTimeout(timer);
  }
}

function fail(code: string, message: string): MetadataResult {
  return { ok: false, code, message };
}
