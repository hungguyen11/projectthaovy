#!/usr/bin/env node
/**
 * Tạo tài khoản ADMIN ban đầu cho ListcuaThaoVy — chạy PHÍA SERVER, an toàn:
 *
 *   • Password không hard-code trong mã nguồn, không nằm trong frontend.
 *   • Supabase Auth tự bcrypt (bcrypt) khi nhận yêu cầu tạo user.
 *   • Script chỉ dùng 1 lần bởi người vận hành, cần SUPABASE_SECRET_KEY
 *     (service role) — key này không bao giờ tới browser.
 *
 * Cách dùng:
 *   1) Đã chạy database/schema.sql trong Supabase SQL Editor.
 *   2) Điền .env.local (xem .env.example).
 *   3) Chạy:   npm run create-admin
 *      Hoặc không tương tác:
 *        ADMIN_USERNAME=manhhung ADMIN_PASSWORD='***' npm run create-admin
 */
import { readFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

/* ── đọc .env.local thủ công (không cần dotenv) ───────────────────────── */
function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m || line.trim().startsWith("#")) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const DOMAIN = process.env.AUTH_EMAIL_DOMAIN || "listcuathaovy.app";

if (!URL_ || !SECRET) {
  console.error("✖ Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY. Hãy tạo .env.local (xem .env.example).");
  process.exit(1);
}

/* ── nhập liệu ─────────────────────────────────────────────────────────── */
let username = process.env.ADMIN_USERNAME;
let password = process.env.ADMIN_PASSWORD;
let displayName = process.env.ADMIN_DISPLAY_NAME;

if (!username || !password) {
  const rl = createInterface({ input, output });
  username = username || (await rl.question("Username admin [manhhung]: ")) || "manhhung";
  password =
    password ||
    (await rl.question("Password (sẽ được hash bằng bcrypt ở Supabase, không lưu plaintext trong repo): "));
  displayName = displayName || (await rl.question("Tên hiển thị [Quản trị]: ")) || "Quản trị";
  rl.close();
}
username = String(username).trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");
if (!username) {
  console.error("✖ Username rỗng sau khi làm sạch ký tự.");
  process.exit(1);
}
if (!password || password.length < 8) {
  console.error("✖ Mật khẩu cần tối thiểu 8 ký tự.");
  process.exit(1);
}
const email = `${username}@${DOMAIN}`;

const headers = { apikey: SECRET, Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" };

/* ── 1. Tạo user qua Auth Admin API (nếu chưa tồn tại) ─────────────────── */
async function api(pathname, init) {
  const res = await fetch(new URL(pathname, URL_), { ...init, headers: { ...headers, ...(init?.headers || {}) } });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  if (!res.ok) {
    const msg = body?.error?.message || body?.message || JSON.stringify(body).slice(0, 300);
    const err = new Error(`HTTP ${res.status}: ${msg}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

let userId;
try {
  const created = await api("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, display_name: displayName, role: "ADMIN" },
    }),
  });
  userId = created.id ?? created?.user?.id;
  console.log(`✔ Đã tạo tài khoản: ${username}  (email nội bộ: ${email})`);
} catch (e) {
  if (e.status === 422 && /already exists|already registered/i.test(JSON.stringify(e.body || {}))) {
    console.log("• Tài khoản đã tồn tại — sẽ cập nhật mật khẩu + role.");
    const list = await api(`/auth/v1/admin/users?page=1&per_page=1000&filter=${encodeURIComponent(username)}`);
    const found = (list.users || []).find((u) => (u.email || "").toLowerCase() === email);
    if (!found) {
      console.error("✖ Không tìm thấy user trong Auth admin — hãy xóa thủ công rồi chạy lại.");
      process.exit(1);
    }
    userId = found.id;
    await api(`/auth/v1/admin/users/${userId}`, { method: "PUT", body: JSON.stringify({ password }) });
    console.log(`✔ Đã đặt lại mật khẩu cho ${username}.`);
  } else {
    console.error("✖ Lỗi khi tạo user:", e.message);
    process.exit(1);
  }
}

/* ── 2. Upsert profile với role ADMIN (service role bypass RLS) ────────── */
await api(`/rest/v1/profiles?on_conflict=user_id`, {
  method: "POST",
  headers: { Prefer: "resolution=merge-duplicates,return=representation", "Content-Type": "application/json" },
  body: JSON.stringify([{ user_id: userId, username, display_name: displayName || "Quản trị", role: "ADMIN" }]),
});
console.log("✔ Profile ADMIN đã sẵn sàng (role='ADMIN' trong public.profiles).");
console.log(`\n→ Đăng nhập tại /login với username: ${username}`);
console.log("  (username được map tự động tới email nội bộ, bạn cũng có thể đăng nhập bằng email đó.)");
