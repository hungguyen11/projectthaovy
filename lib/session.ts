/**
 * Server-side authorization — KHÔNG tin role từ client.
 * Mọi API route cần đăng nhập gọi requireUser(); route admin gọi requireAdmin().
 */
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/types";

export interface SessionUser {
  supabase: SupabaseClient;
  user: User;
  role: Role;
}

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = "ERROR") {
    super(message);
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

/** Lỗi thường gặp → Response JSON thân thiện, không rò stack trace. */
export function toErrorResponse(e: unknown): Response {
  if (e instanceof HttpError) return jsonError(e.status, e.code, e.message);
  const msg = e instanceof Error ? String(e.message) : "";
  if (/URL and Key are required|supabase url/i.test(msg)) {
    return jsonError(503, "NOT_CONFIGURED", "Server chưa cấu hình Supabase — hãy tạo .env.local theo .env.example (xem README).");
  }
  console.error("[api]", e);
  return jsonError(500, "SERVER", "Không thể kết nối đến máy chủ. Vui lòng thử lại.");
}

/** Bọc handler: mọi exception (kể cả HttpError) đều thành JSON chuẩn. */
export function route<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      return toErrorResponse(e);
    }
  };
}

export async function requireUser(): Promise<SessionUser> {
  if (!isSupabaseConfigured()) {
    throw new HttpError(503, "Server chưa cấu hình Supabase — hãy tạo .env.local theo .env.example (xem README).", "NOT_CONFIGURED");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new HttpError(401, "Vui lòng đăng nhập để tiếp tục.", "UNAUTHORIZED");

  let role: Role = "USER";
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profile?.role === "ADMIN") role = "ADMIN";

  return { supabase, user, role };
}

export async function requireAdmin(): Promise<SessionUser> {
  const s = await requireUser();
  if (s.role !== "ADMIN") {
    throw new HttpError(403, "Bạn không có quyền truy cập khu vực quản trị.", "FORBIDDEN");
  }
  return s;
}

export function jsonError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}
