/**
 * Supabase Auth yêu cầu email. Để user chỉ cần nhớ USERNAME,
 * ta map username → email nội bộ: `username@AUTH_EMAIL_DOMAIN`.
 * Email này không cần tồn tại thật; đăng nhập bằng username sẽ tự quy đổi.
 */
export const AUTH_EMAIL_DOMAIN = process.env.AUTH_EMAIL_DOMAIN || "listcuathaovy.app";

export function toAuthEmail(login: string): string {
  const v = String(login || "").trim().toLowerCase();
  if (v.includes("@")) return v;
  return `${v.replace(/[^a-z0-9_.-]/g, "")}@${AUTH_EMAIL_DOMAIN}`;
}

export function usernameFromInput(login: string): string {
  const v = String(login || "").trim().toLowerCase();
  return v.includes("@") ? v.split("@")[0] : v;
}
