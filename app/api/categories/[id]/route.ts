import { NextRequest } from "next/server";
import { requireUser, jsonError, route } from "@/lib/session";

export const runtime = "nodejs";

/** PATCH /api/categories/:id { name } */
async function __PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireUser();
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, "BAD_JSON", "Dữ liệu không hợp lệ.");
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 64) return jsonError(400, "BAD_NAME", "Tên danh mục phải từ 1–64 ký tự.");

  const { data, error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return jsonError(409, "DUPLICATE", "Bạn đã có danh mục trùng tên này.");
    return jsonError(500, "DB", "Không thể cập nhật danh mục. Vui lòng thử lại.");
  }
  if (!data) return jsonError(404, "NOT_FOUND", "Không tìm thấy danh mục.");
  return Response.json({ category: data });
}

/** DELETE /api/categories/:id — sản phẩm trong danh mục chuyển sang 'Khác' (tự tạo nếu thiếu). */
async function __DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireUser();
  const { id } = await ctx.params;

  const { data: cat } = await supabase
    .from("categories")
    .select("id,name")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!cat) return jsonError(404, "NOT_FOUND", "Không tìm thấy danh mục.");

  let { data: other } = await supabase
    .from("categories")
    .select("id")
    .eq("name", "Khác")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!other) {
    const { data: created } = await supabase
      .from("categories")
      .insert({ user_id: user.id, name: "Khác" })
      .select("id")
      .single();
    other = created;
  }

  await supabase
    .from("products")
    .update({ category_id: other?.id ?? null })
    .eq("user_id", user.id)
    .eq("category_id", id);

  const { error } = await supabase.from("categories").delete().eq("id", id).eq("user_id", user.id);
  if (error) return jsonError(500, "DB", "Không thể xóa danh mục. Vui lòng thử lại.");
  return Response.json({ ok: true, moved_to: other?.id ?? null });
}


export const PATCH = route(__PATCH);
export const DELETE = route(__DELETE);
