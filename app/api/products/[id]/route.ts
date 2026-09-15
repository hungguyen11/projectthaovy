import { NextRequest } from "next/server";
import { requireAdmin, jsonError, route } from "@/lib/session";
import type { ProductStatus } from "@/types";

export const runtime = "nodejs";

const STATUSES: ProductStatus[] = ["PENDING", "PRIORITY", "FAVORITE", "PURCHASED"];

/** PATCH /api/products/:id — CHỈ được đổi status / category_id (metadata là READ-ONLY). */
async function __PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin();
  const { id } = await ctx.params;
  if (!id) return jsonError(400, "BAD_ID", "ID sản phẩm không hợp lệ.");

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, "BAD_JSON", "Dữ liệu không hợp lệ.");
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.status === "string") {
    if (!STATUSES.includes(body.status as ProductStatus)) return jsonError(400, "BAD_STATUS", "Trạng thái không hợp lệ.");
    patch.status = body.status;
  }
  if ("category_id" in body) {
    patch.category_id = typeof body.category_id === "string" && body.category_id ? body.category_id : null;
  }
  // mọi field metadata (tên/giá/ảnh/url) đều KHÔNG cho sửa — spec §24
  if (!Object.keys(patch).length) return jsonError(400, "NO_FIELDS", "Không có thay đổi để cập nhật.");

  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", id)
    .select("*, category:categories(id,name)")
    .maybeSingle();

  if (error) return jsonError(500, "DB", "Không thể cập nhật sản phẩm. Vui lòng thử lại.");
  if (!data) return jsonError(404, "NOT_FOUND", "Không tìm thấy sản phẩm.");
  return Response.json({ product: data });
}

/** DELETE /api/products/:id — xóa THẬT khỏi database (không soft-delete). */
async function __DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin();
  const { id } = await ctx.params;
  if (!id) return jsonError(400, "BAD_ID", "ID sản phẩm không hợp lệ.");

  const { data, error } = await supabase.from("products").delete().eq("id", id).select("id");

  if (error) return jsonError(500, "DB", "Không thể xóa sản phẩm. Vui lòng thử lại.");
  if (!data?.length) return jsonError(404, "NOT_FOUND", "Không tìm thấy sản phẩm.");
  return Response.json({ ok: true });
}


export const PATCH = route(__PATCH);
export const DELETE = route(__DELETE);
