import { requireAdmin, jsonError, route } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernamesByUserId } from "@/lib/admin-usernames";

export const runtime = "nodejs";

/** GET /api/admin/products — 200 sản phẩm gần nhất trên toàn hệ thống.
 *  Join username THỦ CÔNG từ profiles (không dùng FK embed). */
async function __GET() {
  await requireAdmin();
  try {
    const admin = createAdminClient();
    const [listRes, countRes] = await Promise.all([
      admin
        .from("products")
        .select("id,user_id,source_url,marketplace,product_name,price,status,created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      admin.from("products").select("id", { count: "exact", head: true }),
    ]);
    if (listRes.error) return jsonError(500, "DB", "Không tải được dữ liệu products.");
    const names = await usernamesByUserId(admin, (listRes.data ?? []).map((p) => p.user_id as string));
    return Response.json(
      {
        products: (listRes.data ?? []).map((p) => ({ ...p, username: names.get(p.user_id as string) ?? "—" })),
        total: countRes.count ?? 0,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return jsonError(500, "ADMIN", e instanceof Error ? e.message : "Lỗi admin.");
  }
}

export const GET = route(__GET);
