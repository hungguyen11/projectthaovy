import { NextRequest } from "next/server";
import { requireUser, jsonError, route } from "@/lib/session";
import { fetchMetadata } from "@/lib/metadata/service";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs"; // cần node:dns cho SSRF guard

/**
 * POST /api/metadata  { url }
 * Trả về: { ok:true, data:{ image,title,price,price_label,marketplace,source_url } }
 *      hoặc { ok:false, code, message }  — client hiển thị "Thử lại".
 * Timeout 12s, cache 5 phút, rate-limit theo user+IP, chống SSRF.
 */
async function __POST(request: NextRequest) {
  let s;
  try {
    s = await requireUser();
  } catch (e) {
    const err = e as { status?: number; code?: string; message?: string };
    return jsonError(err.status ?? 401, err.code ?? "UNAUTHORIZED", err.message ?? "Vui lòng đăng nhập.");
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`meta:${s.user.id}:${ip}`, 40, 60_000)) {
    return jsonError(429, "RATE_LIMITED", "Bạn thao tác nhanh quá — chờ một phút rồi thử lại nhé.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "BAD_JSON", "Dữ liệu gửi lên không hợp lệ.");
  }
  const url = (body as { url?: unknown })?.url;
  if (typeof url !== "string" || !url.trim()) {
    return jsonError(400, "MISSING_URL", "Hãy dán link sản phẩm trước đã.");
  }

  const result = await fetchMetadata(url.trim().slice(0, 2000));
  return Response.json(result, {
    status: 200, // lỗi nghiệp vụ (blocked/timeout) vẫn trả 200 + ok:false để UI hiện nút Thử lại
    headers: { "Cache-Control": "no-store" },
  });
}


export const POST = route(__POST);
