import { NextRequest } from "next/server";
import { requireAdmin, jsonError, route } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { toAuthEmail } from "@/lib/auth-email";

export const runtime = "nodejs";

/**
 * GET /api/admin/users?page=1&per=50
 * Liệt kê user + số sản phẩm. KHÔNG trả thông tin nhạy cảm
 * (không email verify token, không metadata bí mật…).
 */
async function __GET(request: NextRequest) {
  await requireAdmin();
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const per = Math.min(100, Math.max(10, Number(sp.get("per") ?? 50) || 50));

  try {
    const admin = createAdminClient();
    const { data: listed, error } = await admin.auth.admin.listUsers({ page, perPage: per });
    if (error) return jsonError(500, "AUTH_ADMIN", "Không tải được danh sách người dùng.");

    const ids = (listed.users ?? []).map((u) => u.id);
    let productCounts: Record<string, number> = {};
    if (ids.length) {
      const { data: products } = await admin
        .from("products")
        .select("user_id")
        .in("user_id", ids)
        .limit(10000);
      productCounts = (products ?? []).reduce<Record<string, number>>((acc, p) => {
        acc[p.user_id as string] = (acc[p.user_id as string] ?? 0) + 1;
        return acc;
      }, {});
    }
    const { data: profiles } = await admin.from("profiles").select("user_id,username,display_name,role").in("user_id", ids);
    const byUser = new Map((profiles ?? []).map((p) => [p.user_id as string, p]));

    const users = (listed.users ?? []).map((u) => {
      const pr = byUser.get(u.id) as
        | { username?: string; display_name?: string | null; role?: string }
        | undefined;
      return {
        id: u.id,
        username: pr?.username ?? u.email?.split("@")[0] ?? "—",
        display_name: pr?.display_name ?? null,
        role: (pr?.role as "USER" | "ADMIN") ?? "USER",
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at ?? null,
        products: productCounts[u.id] ?? 0,
      };
    });

    return Response.json(
      { users, total: listed.total ?? users.length, page, per },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return jsonError(500, "ADMIN", e instanceof Error ? e.message : "Lỗi admin.");
  }
}


/**
 * POST /api/admin/users { username, password, display_name? }
 * Admin tạo tài khoản cho người dùng khác. Không cần email thật:
 * username được map → `username@<AUTH_EMAIL_DOMAIN>` và auto-confirm.
 * Trigger handle_new_user tự tạo profile + danh mục mặc định (role USER).
 */
async function __POST(request: NextRequest) {
  await requireAdmin();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, "BAD_JSON", "Dữ liệu không hợp lệ.");
  }

  const username = typeof body.username === "string" ? body.username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "") : "";
  const password = typeof body.password === "string" ? body.password : "";
  const displayName = typeof body.display_name === "string" ? body.display_name.trim().slice(0, 64) : "";

  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return jsonError(400, "BAD_USERNAME", "Username 3–32 ký tự: chữ thường, số, “.”, “_”, “-”.");
  }
  if (password.length < 8) {
    return jsonError(400, "WEAK_PASSWORD", "Mật khẩu cần tối thiểu 8 ký tự.");
  }

  try {
    const admin = createAdminClient();

    const { data: clash } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
    if (clash) return jsonError(409, "USERNAME_TAKEN", `Username “${username}” đã có người dùng.`);

    const { data: created, error } = await admin.auth.admin.createUser({
      email: toAuthEmail(username),
      password,
      email_confirm: true,
      user_metadata: { username, display_name: displayName || username },
    });
    if (error) {
      if (/already|exists|registered/i.test(error.message)) {
        return jsonError(409, "USERNAME_TAKEN", `Username “${username}” đã tồn tại trong hệ thống đăng nhập.`);
      }
      return jsonError(500, "AUTH_ADMIN", `Không tạo được tài khoản: ${error.message}`);
    }

    return Response.json({ user: { id: created.user.id, username } }, { status: 201 });
  } catch (e) {
    return jsonError(500, "ADMIN", e instanceof Error ? e.message : "Lỗi admin.");
  }
}


export const GET = route(__GET);
export const POST = route(__POST);
