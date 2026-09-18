import { NextRequest } from "next/server";
import { requireAdmin, jsonError, route } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { fetchMetadata } from "@/lib/metadata/service";

export const runtime = "nodejs"; // cần node:dns cho SSRF guard
export const maxDuration = 30; // trang sàn chậm — giống /api/metadata

/**
 * POST /api/products/:id/price — "đồng bộ giá": server TỰ fetch lại link gốc của món này.
 *   - lấy được giá mới (range → lấy số CAO NHẤT, spec 2026-09) → cập nhật price/price_label;
 *   - sàn chặn / không có giá / giá không đổi → updated:false, GIỮ NGUYÊN giá cũ (không bịa).
 * Chỉ ADMIN được gọi, chỉ đụng sản phẩm của chính mình, có rate-limit chống spam.
 * © _hngnguynn_
 */
async function __POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireAdmin();
  const { id } = await ctx.params;
  if (!id) return jsonError(400, "BAD_ID", "ID sản phẩm không hợp lệ.");

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`prsync:${user.id}:${ip}`, 120, 60_000))
    return jsonError(429, "RATE_LIMITED", "Đồng bộ nhanh quá — chờ một phút rồi bấm tiếp nhé.");

  const { data: row } = await supabase
    .from("products")
    .select("id, source_url, price, price_label")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) return jsonError(404, "NOT_FOUND", "Không tìm thấy sản phẩm.");

  const res = await fetchMetadata(String(row.source_url ?? "").slice(0, 2000));
  const d = res?.ok ? (res.data as { price?: unknown; price_label?: unknown } | undefined) : undefined;
  const newPrice =
    typeof d?.price === "number" && Number.isFinite(d.price) && d.price >= 0 ? Math.round(d.price * 100) / 100 : null;
  const newLabel =
    typeof d?.price_label === "string" && d.price_label.trim() ? d.price_label.trim().slice(0, 80) : null;

  if (newPrice == null && !newLabel)
    return Response.json({ updated: false, reason: res?.ok ? "NO_PRICE" : "FETCH_FAILED", product: row });

  if (newPrice === row.price && (newLabel ?? null) === ((row.price_label as string | null) ?? null))
    return Response.json({ updated: false, reason: "SAME", product: row });

  const { data: product, error } = await supabase
    .from("products")
    .update({ price: newPrice, price_label: newLabel })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*, category:categories(id,name)")
    .maybeSingle();
  if (error) return jsonError(500, "DB", "Không lưu được giá mới — thử lại sau nhé.");
  return Response.json({ updated: true, product, old_price: row.price, old_label: row.price_label });
}

export const POST = route(__POST);
