import { requireAdmin, jsonError, route } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** GET /api/admin/products — 200 sản phẩm gần nhất trên toàn hệ thống. */
async function __GET() {
  await requireAdmin();
  try {
    const admin = createAdminClient();
    const [{ data, error }, count] = await Promise.all([
      admin
        .from("products")
        .select("id,user_id,source_url,marketplace,product_name,price,status,created_at,profiles(username)")
        .order("created_at", { ascending: false })
        .limit(200),
      admin.from("products").select("id", { count: "exact", head: true }),
    ]);
    if (error) return jsonError(500, "DB", "Không tải được dữ liệu products.");
    return Response.json(
      { products: (data ?? []).map((p) => ({ ...p, username: (p as { profiles?: { username?: string } }).profiles?.username ?? "—" })), total: count.count ?? 0 },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return jsonError(500, "ADMIN", e instanceof Error ? e.message : "Lỗi admin.");
  }
}


export const GET = route(__GET);
