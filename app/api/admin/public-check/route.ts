import { requireAdmin, jsonError, route } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicReadClient } from "@/lib/public-feed";

export const runtime = "nodejs";

/**
 * GET /api/admin/public-check — tự kiểm tra "khách chưa đăng nhập thấy gì".
 * So sánh số sản phẩm mà KÊNH ĐỌC CÔNG KHAI trả về với tổng số sản phẩm của Admin trong DB.
 */
async function __GET() {
  await requireAdmin();
  try {
    const { client, adminIds } = await publicReadClient();
    let guestQ = client.from("products").select("id", { count: "exact", head: true });
    if (adminIds) guestQ = guestQ.in("user_id", adminIds);
    const { count: guestCount, error: guestErr } = await guestQ;

    let adminTotal: number | null = null;
    let admins = 0;
    try {
      const a = createAdminClient();
      const { data: adm } = await a.from("profiles").select("user_id").eq("role", "ADMIN").limit(50);
      admins = adm?.length ?? 0;
      if (admins) {
        let tq = a.from("products").select("id", { count: "exact", head: true });
        tq = tq.in("user_id", (adm ?? []).map((r) => r.user_id as string));
        const { count } = await tq;
        adminTotal = count ?? 0;
      }
    } catch {
      adminTotal = null;
    }

    const channel = adminIds ? "admin-key" : "anon";
    const visible = guestCount ?? 0;
    return Response.json(
      {
        channel, // "admin-key" = đọc qua service key (mạnh nhất, không phụ thuộc RLS)
        admins, // số tài khoản role ADMIN trong DB
        guestVisible: visible, // số sản phẩm khách thực sự xem được
        adminTotal, // tổng sản phẩm của Admin trong DB (null nếu không có service key)
        ok: !guestErr && visible > 0,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return jsonError(500, "ADMIN", e instanceof Error ? e.message : "Lỗi kiểm tra.");
  }
}

export const GET = route(__GET);
