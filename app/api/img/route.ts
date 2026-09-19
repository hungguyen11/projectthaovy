import { NextRequest } from "next/server";
import { route } from "@/lib/session";
import { assertPublicDns, validateUrl } from "@/lib/metadata/ssrf";

export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * /api/img?u=<url> — proxy ảnh sản phẩm.
 * Lý do tồn tại: CDN của sàn (Shopee/TikTok/Lazada…) hay chặn ảnh khi trình duyệt
 * bên thứ 2 tải trực tiếp (hotlink/Referer/http-mixed) → người xem thấy ô ảnh trống.
 * Server tải ảnh bằng header tử tế rồi trả lại kèm cache 24h, ảnh luôn hiện.
 * An toàn: cùng bộ lọc SSRF như luồng lấy link — chỉ http(s), chỉ IP công khai,
 * chỉ nhận content-type image/*, cắt tối đa 6MB, cache LRU trong bộ nhớ.
 * © _hngnguynn_
 */

const MAX_BYTES = 6_000_000;
const CACHE_TTL_MS = 24 * 60 * 60_000;
const CACHE_MAX = 250;
const IMG_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface Entry {
  t: number;
  buf: ArrayBuffer;
  type: string;
}
const mem = new Map<string, Entry>();

function cacheGet(key: string): Entry | null {
  const hit = mem.get(key);
  if (!hit) return null;
  if (Date.now() - hit.t > CACHE_TTL_MS) {
    mem.delete(key);
    return null;
  }
  return hit;
}
function cacheSet(key: string, e: Entry) {
  if (mem.size >= CACHE_MAX) {
    const oldest = mem.keys().next().value;
    if (oldest != null) mem.delete(oldest);
  }
  mem.set(key, e);
}

async function __GET(request: NextRequest) {
  const u = request.nextUrl.searchParams.get("u") || "";
  let target: URL;
  try {
    target = validateUrl(u).url;
    await assertPublicDns(target.hostname);
  } catch {
    return new Response("bad url", { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const key = target.toString();
  const hit = cacheGet(key);
  if (hit) {
    return new Response(hit.buf, {
      headers: {
        "Content-Type": hit.type,
        "Cache-Control": "public, max-age=86400, immutable",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "X-Image-Source": "cache",
      },
    });
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9_000);
    const res = await fetch(key, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": IMG_UA,
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
        "Accept-Language": "vi,en;q=0.8",
      },
    });
    clearTimeout(timer);
    const ctype = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!res.ok || !ctype.startsWith("image/")) {
      // nguồn lỗi (403/404/html…) → 404 ngắn gọn; thẻ ảnh phía client sẽ tự đổi ảnh fallback
      return new Response("image unavailable", { status: 404, headers: { "Cache-Control": "public, max-age=600" } });
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) {
      return new Response("too big", { status: 413, headers: { "Cache-Control": "no-store" } });
    }
    cacheSet(key, { t: Date.now(), buf, type: ctype });
    return new Response(buf, {
      headers: {
        "Content-Type": ctype,
        "Cache-Control": "public, max-age=86400, immutable",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "X-Image-Source": "proxy",
      },
    });
  } catch {
    return new Response("fetch failed", { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}

export const GET = route(__GET);
