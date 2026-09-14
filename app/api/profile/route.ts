import { requireUser, jsonError, route } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUTH_EMAIL_DOMAIN } from "@/lib/auth-email";
import type { Profile } from "@/types";

export const runtime = "nodejs";

/** GET /api/profile */
async function __GET() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return jsonError(500, "DB", "Không thể tải hồ sơ. Vui lòng thử lại.");
  return Response.json({ profile: data as Profile | null }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * PATCH /api/profile { username?, display_name?, avatar_url? }
 * Đổi username → đồng bộ email nội bộ qua Supabase Admin API (server-side),
 * để đăng nhập bằng username mới vẫn hoạt động.
 */
async function __PATCH(request: Request) {
  const { supabase, user } = await requireUser();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, "BAD_JSON", "Dữ liệu không hợp lệ.");
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.display_name === "string") patch.display_name = body.display_name.trim().slice(0, 64) || null;
  if (typeof body.avatar_url === "string") {
    const a = body.avatar_url.trim();
    if (a && !/^https?:\/\//i.test(a)) return jsonError(400, "BAD_AVATAR", "Avatar phải là link http(s).");
    patch.avatar_url = a || null;
  }
  const newUsername = typeof body.username === "string" ? body.username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "") : "";

  if (newUsername) {
    if (newUsername.length < 3) return jsonError(400, "BAD_USERNAME", "Username cần tối thiểu 3 ký tự (a-z, 0-9, _ . -).");
    const { data: clash } = await supabase.from("profiles").select("id").eq("username", newUsername).neq("user_id", user.id).maybeSingle();
    if (clash) return jsonError(409, "USERNAME_TAKEN", "Username này đã có người dùng.");

    const email = `${newUsername}@${AUTH_EMAIL_DOMAIN}`;
    const currentEmail = (user.email || "").toLowerCase();
    if (currentEmail !== email) {
      try {
        const admin = createAdminClient();
        const { error: ue } = await admin.auth.admin.updateUserById(user.id, { email, email_confirm: true });
        if (ue) throw new Error(ue.message);
      } catch (e) {
        return jsonError(500, "AUTH_SYNC", `Không đồng bộ được username với tài khoản: ${e instanceof Error ? e.message : "lỗi không xác định"}`);
      }
    }
    patch.username = newUsername;
  }

  if (!Object.keys(patch).length) return jsonError(400, "NO_FIELDS", "Không có thay đổi để cập nhật.");

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return jsonError(409, "USERNAME_TAKEN", "Username này đã có người dùng.");
    return jsonError(500, "DB", "Không thể cập nhật hồ sơ. Vui lòng thử lại.");
  }
  return Response.json({ profile: data as Profile });
}


export const GET = route(__GET);
export const PATCH = route(__PATCH);
