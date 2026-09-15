import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Tra username hàng loạt từ public.profiles — KHÔNG dùng FK embed
 * (schema thật: user_id tham chiếu auth.users, embed profiles(...) sẽ lỗi 409).
 */
export async function usernamesByUserId(
  admin: SupabaseClient,
  ids: (string | null)[]
): Promise<Map<string, string>> {
  const uniq = Array.from(new Set(ids.filter((x): x is string => Boolean(x))));
  if (!uniq.length) return new Map();
  const map = new Map<string, string>();
  for (let i = 0; i < uniq.length; i += 200) {
    const chunk = uniq.slice(i, i + 200);
    const { data } = await admin
      .from("profiles")
      .select("user_id,username")
      .in("user_id", chunk)
      .limit(1000);
    for (const p of data ?? []) map.set(p.user_id as string, (p.username as string) ?? "—");
  }
  return map;
}
