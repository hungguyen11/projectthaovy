import { requireAdmin, jsonError, route } from "@/lib/session";
import { publicReadClient } from "@/lib/public-feed";

export const runtime = "nodejs";

/** GET /api/categories */
async function __GET() {
  // PUBLIC: khách xem được danh mục của Admin (kênh đọc — xem lib/public-feed.ts).
  const { client: supabase, adminIds } = await publicReadClient();
  let query = supabase
    .from("categories")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(200);
  if (adminIds) query = query.in("user_id", adminIds);
  const { data, error } = await query;
  if (error) return jsonError(500, "DB", "Không thể tải danh mục. Vui lòng thử lại.");
  return Response.json({ categories: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

/** POST /api/categories { name } */
async function __POST(request: Request) {
  const { supabase, user } = await requireAdmin();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, "BAD_JSON", "Dữ liệu không hợp lệ.");
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 64) return jsonError(400, "BAD_NAME", "Tên danh mục phải từ 1–64 ký tự.");

  const { data: clash } = await supabase.from("categories").select("id").eq("user_id", user.id).eq("name", name).maybeSingle();
  if (clash) return jsonError(409, "DUPLICATE", "Bạn đã có danh mục trùng tên này.");

  const { data, error } = await supabase
    .from("categories")
    .insert({ user_id: user.id, name })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") return jsonError(409, "DUPLICATE", "Bạn đã có danh mục trùng tên này.");
    return jsonError(500, "DB", "Không thể tạo danh mục. Vui lòng thử lại.");
  }
  return Response.json({ category: data }, { status: 201 });
}


export const GET = route(__GET);
export const POST = route(__POST);
