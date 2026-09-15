import "server-only";

/**
 * Kênh ĐỌC CÔNG KHAI cho web ở chế độ public:
 * - Ưu tiên: đọc bằng service key (server-only, bypass RLS) và chỉ lấy đúng
 *   sản phẩm/danh mục của user có role ADMIN → khách luôn thấy "mấy cái admin gắn"
 *   dù RLS đang bật chủ-own hay chưa.
 * - Fallback: nếu thiếu service key → đọc bằng client thường (cần policy đọc công khai
 *   trong PUBLIC-MODE.sql).
 * Service key KHÔNG BAO GIỜ gửi xuống client — chỉ dùng trong API route.
 * © _hngnguynn_
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface PublicFeed {
  client: SupabaseClient;
  /** danh sách user_id là ADMIN — chỉ dữ liệu của họ được public */
  adminIds: string[];
}

export async function publicFeed(): Promise<PublicFeed | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("user_id")
      .eq("role", "ADMIN")
      .limit(50);
    if (error || !data?.length) return null;
    return { client: admin, adminIds: data.map((r) => r.user_id as string) };
  } catch {
    return null;
  }
}

export async function publicReadClient(): Promise<{ client: SupabaseClient; adminIds: string[] | null }> {
  const feed = await publicFeed();
  if (feed) return { client: feed.client, adminIds: feed.adminIds };
  return { client: await createClient(), adminIds: null };
}
