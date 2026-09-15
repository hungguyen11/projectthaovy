import { requireAdmin, jsonError, route } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernamesByUserId } from "@/lib/admin-usernames";

export const runtime = "nodejs";

/** GET /api/admin/categories — thống kê danh mục toàn hệ thống.
 *  Join username THỦ CÔNG từ profiles (không dùng FK embed: user_id tham chiếu auth.users). */
async function __GET() {
  await requireAdmin();
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("categories")
      .select("id,name,user_id,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return jsonError(500, "DB", "Không tải được dữ liệu categories.");

    const cats = data ?? [];
    const [names, { data: prodRows }] = await Promise.all([
      usernamesByUserId(admin, cats.map((c) => c.user_id as string)),
      admin.from("products").select("category_id").not("category_id", "is", null).limit(10000),
    ]);
    const counts = new Map<string, number>();
    for (const p of prodRows ?? []) {
      const cid = p.category_id as string;
      counts.set(cid, (counts.get(cid) ?? 0) + 1);
    }

    return Response.json(
      {
        categories: cats.map((c) => ({
          id: c.id,
          name: c.name,
          username: names.get(c.user_id as string) ?? "—",
          count: counts.get(c.id as string) ?? 0,
        })),
        total: cats.length,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return jsonError(500, "ADMIN", e instanceof Error ? e.message : "Lỗi admin.");
  }
}

export const GET = route(__GET);
