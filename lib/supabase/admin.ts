import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — BỎ QUA RLS.
 * Chỉ được import từ API routes đã kiểm tra role ADMIN ở server-side.
 * Không import vào bất kỳ file client nào (sẽ build fail khi có "server-only").
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) {
    throw new Error(
      "Thiếu SUPABASE_SECRET_KEY trong .env.local — không thể tạo admin client."
    );
  }
  return createSupabaseClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
