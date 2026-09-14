import { requireAdmin, jsonError, route } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** GET /api/admin/categories — thống kê danh mục toàn hệ thống. */
async function __GET() {
  await requireAdmin();
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("categories")
      .select("id,name,user_id,profiles(username),products(count)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return jsonError(500, "DB", "Không tải được dữ liệu categories.");
    const cats = (data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      username: (c as { profiles?: { username?: string } }).profiles?.username ?? "—",
      count: (c as { products?: Array<{ count: number }> }).products?.[0]?.count ?? 0,
    }));
    return Response.json({ categories: cats, total: cats.length }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return jsonError(500, "ADMIN", e instanceof Error ? e.message : "Lỗi admin.");
  }
}


export const GET = route(__GET);
