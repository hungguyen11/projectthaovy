/**
 * lib/db-compat.ts — nhận diện lỗi "DB chưa có cột owner_note" (chưa chạy OWNER-NOTE.sql).
 * PostgREST/Supabase trả về mã khác nhau tuỳ đường kiểm: PGRST204 (schema cache)
 * hoặc 42703 (undefined_column). Phải khớp cả tên cột trong message để không nhầm
 * với các cột khác.
 * © _hngnguynn_
 */
export function isMissingOwnerNote(error: unknown): boolean {
  const e = error as { code?: string; message?: string; details?: string; hint?: string } | null;
  if (!e) return false;
  const text = `${e.code ?? ""} ${e.message ?? ""} ${e.details ?? ""} ${e.hint ?? ""}`;
  const codeHit = e.code === "PGRST204" || e.code === "42703" || text.includes("PGRST204");
  return codeHit && /owner_note/i.test(text);
}
