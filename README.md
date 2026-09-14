# 🛍️ ProjectThaoVy — *Lưu những món đồ bạn muốn mua*

> **ProjectThaoVy KHÔNG phải sàn thương mại điện tử.** Không bán hàng, không giỏ hàng,
> không thanh toán, không quản lý đơn. Đây là **kho lưu trữ wishlist cá nhân**:
> thấy món gì thích → dán link → hệ thống tự lấy **ảnh + tên + giá** → chọn danh mục +
> trạng thái → **Lưu**. Khi cần → mở list → bấm **“Mua ngay”** để về đúng link gốc trên
> Shopee / TikTok Shop.

```
COPY LINK → DÁN → HỆ THỐNG LẤY ẢNH/TÊN/GIÁ → CHỌN DANH MỤC → CHỌN TRẠNG THÁI → LƯU
```

## 🎨 Giao diện — "Aqua Pastel" (dựng theo mock của chủ nhân)

Bản v4 mô phỏng sát ảnh thiết kế: nền mist mint `#EFF8F7`, card trắng bo 18px,
nút chính gradient teal `#2BD4C7→#10B5AD` (chữ trắng), **giá màu san hô `#F4522E`**,
pill Yêu thích/Ưu tiên hồng candy `#FB72A8`, sàn giữ màu hiệu thật (Shopee cam,
TikTok đen) — badge "S"/"♪" nhận diện tức thì. Dashboard: hero chào + 5 thẻ số liệu
click-được + dải "Sản phẩm nổi bật" cuộn ngang; modal Thêm sản phẩm dạng 4 bước
(đếm số teal), modal Chi tiết 2 cột + hộp "Thông tin sản phẩm"; mobile: bottom-nav
5 ô với FAB "+" nổi giữa, sidebar drawer + hamburger morph, quote viết tay ở đáy
sidebar ("Thấy thích thì lưu lại, cần thì mua! 🤍"). Font Be Vietnam Pro (dấu tiếng
Việt đẹp), animation thuần CSS transform/opacity, dark mode đêm biển `#0A1A20`,
touch target ≥ 38–40px, hover chỉ trên desktop, tôn trọng `prefers-reduced-motion`.
Bản quyền **© _hngnguynn_** (footer trang public + mọi trang trong app + tài liệu).


---

## ✨ Tính năng

| Nhóm | Chi tiết |
|---|---|
| Cốt lõi | Thêm sản phẩm bằng link; metadata tự động (OG → Twitter Card → JSON-LD → Schema.org); ảnh/tên **READ-ONLY**; link không đọc được giá → **nhập tay mỗi giá** vẫn lưu |
| Marketplace | Shopee, TikTok Shop (ưu tiên) + Lazada/Tiki/link khác; badge sàn; “Mua ngay” mở đúng `source_url` (`target="_blank" rel="noopener noreferrer"`) |
| Trạng thái | `PENDING` Dự định mua · `PRIORITY` Ưu tiên mua trước · `FAVORITE` Yêu thích · `PURCHASED` Đã mua |
| Tổ chức | Danh mục mặc định (7) + tự tạo danh mục riêng; tìm kiếm (debounce, lọc tên + danh mục); lọc nhanh bằng **chip danh mục có đếm số**; sắp xếp 5 kiểu |
| Trùng lặp | Phát hiện URL trùng (chuẩn hóa) → “Sản phẩm này đã được lưu” → *Xem sản phẩm / Hủy*; unique index chặn ở tầng DB |
| Ảnh đại diện | Tải ảnh từ máy (Cài đặt) — tự cắt vuông 256px + nén WebP ngay trên trình duyệt; lưu trong Supabase Storage (bucket `avatars`, RLS theo `user_id`) |
| Xóa | Modal xác nhận → xóa **thật** khỏi database (không soft-delete) |
| Admin | Dashboard: tổng users/products/categories + bảng quản lý; **tạo tài khoản cho người dùng** (username + mật khẩu, không cần email); kiểm tra role **server-side** (không tin frontend) |
| UX | Skeleton loading, empty state, error + nút **Thử lại**, toast, timeout 12s (không loading vô hạn), anti-SSRF, rate-limit, cache metadata 5 phút |
| Giao diện | Premium · cute · pastel (aqua `#97FFFF`, nền `#F7FBFC`); responsive Desktop/Tablet/Mobile; bottom-nav + FAB trên mobile; **Dark / Light / System** |
| Bảo mật | Supabase Auth + cookie session; **RLS** mọi bảng; secret key chỉ server-side; password hash bcrypt (Supabase) |

---

## 🗂 Cấu trúc dự án

```
ProjectThaoVy/
├── index.html            ← PREVIEW độc lập (double-click là chạy, KHÔNG cần Node/Supabase)
├── style.css             ← design system của preview (chung token với app thật)
├── script.js             ← logic preview (localStorage, demo metadata, đủ mọi luồng)
│
├── app/                  ← Next.js App Router (bản production)
│   ├── page.tsx              landing công khai (+ SEO/OG/Twitter)
│   ├── layout.tsx            root layout, theme, toast, confirm
│   ├── (auth)/login|register Supabase Auth (username ↔ email nội bộ)
│   ├── (app)/dashboard|products|categories|settings|admin  (yêu cầu đăng nhập)
│   └── api/                  REST API (metadata, products, categories, profile, admin, signout)
├── components/           ui · layout · products · providers
├── lib/                  supabase clients · metadata engine (parse/SSRF/service) · utils · config
├── types/                kiểu dữ liệu khớp DB
├── database/schema.sql   TOÀN BỘ: bảng · index · RLS · triggers · default categories
├── supabase/migrations/  bản copy cho `supabase db push`
├── scripts/              create-admin.mjs (an toàn) · test-metadata.mts (unit test)
├── public/               icon, og.png, artwork sản phẩm
├── middleware.ts         refresh session + chặn route cần đăng nhập
├── .env.example          hướng dẫn key · .gitignore (không commit secret)
└── package.json / tsconfig.json / next.config.ts / tailwind.config.ts
```

---

# 🚀 Chạy NHANH bằng bản preview (5 giây)

Không cần Node.js, npm, Supabase, database, backend:

1. **Double-click `index.html`** → mở trong trình duyệt.
2. Bấm *Bắt đầu sử dụng* (modal demo) → dùng thử **toàn bộ luồng**: thêm sản phẩm bằng link,
   lấy metadata (mô phỏng), chọn danh mục/trạng thái, tìm kiếm, lọc, sắp xếp, đổi trạng thái,
   đánh dấu đã mua, xóa, dark mode, mobile layout (thử thu hẹp cửa sổ), admin demo.
3. Dữ liệu lưu trong `localStorage` của bạn. Preview có nhãn **DEMO DATA**; metadata trong
   preview chỉ là mô phỏng — production xử lý bằng backend.

---

# ⚙️ Chạy bản thật (Next.js + Supabase)

## Bước 0 — Cài Node.js (một lần)

Tải **Node.js 18.18+ (LTS)** từ https://nodejs.org → cài đặt → mở **CMD** (Windows) hoặc
Terminal, kiểm tra:

```bash
node -v
npm -v
```

## Bước 1 — Vào dự án & cài dependencies

```bash
cd Duong/Dan/Toi/ProjectThaoVy
npm install
```

## Bước 2 — Tạo project Supabase (miễn phí)

1. Vào https://supabase.com → **New project** → đặt tên (vd `listcuathaovy`), region **Singapore**,
   chọn mật khẩu DB → **Create**.
2. Chờ project khởi tạo (1–2 phút).

## Bước 3 — Chạy database SQL

1. Supabase Dashboard → **SQL Editor** → **New query**.
2. Mở file **`database/schema.sql`** trong dự án, **copy TOÀN BỘ** dán vào, bấm **Run**.
   → Tạo 4 bảng `profiles · categories · products · budgets` + bucket `avatars`, toàn bộ index, **RLS policies**,
   trigger tự tạo profile + 7 danh mục mặc định cho user mới.
3. *(Tùy chọn)* `supabase db push` sẽ dùng `supabase/migrations/20260101000000_init.sql`.

## Bước 4 — Lấy API keys

**Project Settings → API keys (hoặc Data API)** — copy:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `publishable key` (bản cũ gọi `anon public`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `secret key` (bản cũ gọi `service_role`) → `SUPABASE_SECRET_KEY` — **chỉ dùng server-side**

## Bước 5 — Cấu hình Auth

1. **Authentication → Sign In / Up**: **tắt** “Confirm email” *(khuyến nghị để trải nghiệm
   đăng ký bằng username mượt nhất; nếu để bật, user phải bấm link xác minh email nội bộ
   không tồn tại → không thể đăng nhập)*.
2. **Authentication → URL Configuration**: `Site URL` = `http://localhost:3000`
   (sau này đổi thành domain chính thức).

> Mẹo: tài khoản đăng ký bằng `username = thaovy` thực chất map tới email nội bộ
> `thaovy@listcuathaovy.app` (đổi tên miền qua `AUTH_EMAIL_DOMAIN`). Màn hình đăng nhập chấp nhận
> **username hoặc email đầy đủ**.

## Bước 6 — Tạo file môi trường

Tạo file **`.env.local`** ở gốc dự án (copy từ `.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_pubxxxxxxxx
SUPABASE_SECRET_KEY=sb_secxxxxxxxx
NEXT_PUBLIC_SITE_URL=http://localhost:3000
AUTH_EMAIL_DOMAIN=listcuathaovy.app
```

⚠️ `.env.local` đã nằm trong `.gitignore` — **đừng commit, đừng gửi cho ai, đừng dán vào frontend.**

## Bước 7 — Chạy

```bash
npm run dev
```

Mở **http://localhost:3000** 🎉 · Kiểm tra nhanh: `npm run typecheck`, `npm run test:metadata`,
`npm run build && npm start`.

---

# 👑 Tài khoản ADMIN ban đầu (`manhhung`)

**Không** hard-code password trong frontend, **không** lưu plaintext, **không** đưa vào repo/GitHub.
Script `create-admin.mjs` chạy **phía server**, gọi Supabase Admin API — Supabase tự **bcrypt**:

```bash
npm run create-admin
# Username admin [manhhung]:  manhhung   (Enter để lấy mặc định)
# Password:  bạn tự nhập (vd manhhung03)  — tối thiểu 8 ký tự
# Tên hiển thị [Quản trị]:  Enter
```

- Đăng nhập tại `/login` với username `manhhung` + mật khẩu bạn vừa nhập.
- Script upsert `profiles.role = 'ADMIN'` → menu **Quản trị** (admin dashboard) hiện ra.
- Nếu cần đổi lại: SQL Editor → `update public.profiles set role='ADMIN' where username='manhhung';`
- **Bảo mật:** mật khẩu mẫu `manhhung03` chỉ nên dùng khi test — hãy đổi ngay qua
  *Cài đặt → Đổi mật khẩu* hoặc `npm run create-admin` lần 2.

Người dùng khác: tự đăng ký **miễn phí** tại `/register` — mỗi người có profile, sản phẩm,
danh mục, ảnh đại diện **riêng**; RLS bảo đảm user A **không thể** đọc dữ liệu của B.

---

# 🧭 Dùng website

| Việc | Làm |
|---|---|
| **Thêm sản phẩm** | Nút *+ Thêm sản phẩm* (desktop: sidebar/modal; mobile: FAB) → dán link → *Lấy thông tin sản phẩm* → chọn **danh mục** + **trạng thái** → *Lưu sản phẩm*. URL trùng → thông báo *Xem sản phẩm / Hủy* |
| Metadata không lấy được | Sàn chặn bot / timeout → **Thử lại** hoặc bấm **Dừng lại** → nhập tay giá (vd `399.000` hoặc `399k`) rồi vẫn *Lưu sản phẩm* như thường |
| **Mua ngay** | Mở đúng link gốc ở tab mới |
| Tìm / lọc / sắp xếp | Ô tìm kiếm trên cùng (debounce 250ms) · chips trạng thái · **chip danh mục bấm là lọc** (kèm số lượng) · sort 5 kiểu (tổ hợp được) |
| **Đã mua** | Menu `⋮` trên card → *Đánh dấu đã mua* → sản phẩm sang trang Đã mua |
| Xóa | Menu `⋮` → *Xóa* → xác nhận → **xóa thật khỏi DB** |
| **Danh mục** | Trang *Danh mục*: thêm / đổi tên / xóa (xóa → sản phẩm chuyển sang “Khác” tự động); 7 danh mục mặc định có sẵn |
| Cài đặt | Hồ sơ (username, tên hiển thị, avatar), theme **Light/Dark/System**, đổi mật khẩu, đăng xuất |
| Admin | *Quản trị*: tổng users/products/categories; bảng user, sản phẩm (xóa được), danh mục; **role check server-side** |

---

# 📡 API & 🗄 dữ liệu

**API** (tất cả route kiểm session ở server, dữ liệu luôn scoped theo `user_id` + RLS):

```
POST   /api/metadata              {url} → {image,title,price,price_label,marketplace} | {ok:false,message} + Thử lại
GET    /api/products              ?status=&category=&q=&sort= (mới/cũ/giá↑/giá↓/tên)
POST   /api/products              {source_url, category_id, status, snapshot} → 409 DUPLICATE nếu trùng
PATCH  /api/products/:id          {status?, category_id?}   (metadata KHÔNG sửa được — READ ONLY)
DELETE /api/products/:id          xóa vĩnh viễn
GET/POST /api/categories · PATCH/DELETE /api/categories/:id
GET/PATCH /api/profile             username đổi → đồng bộ email auth (admin API, server-side)
POST /api/auth/signout
GET  /api/admin/users|products|categories   (chỉ role ADMIN)
POST /api/admin/users              {username,password,display_name?} → tạo tài khoản (auto-confirm, role USER)
```

**Bảng chính** (xem `database/schema.sql`):

- `profiles(id, user_id, username, display_name, avatar_url, role USER|ADMIN, timestamps)`
- `categories(id, user_id, name, timestamps)` + unique `(user_id,name)`
- `products(id, user_id, category_id→categories, source_url, marketplace, image_url, product_name, price numeric, price_label, status, timestamps)` + unique `(user_id, source_url)` + index `user_id/category_id/status/created_at/source_url`
- `budgets(...)` — *bảng vẫn còn trong DB (lịch sử) — UI đã gỡ theo yêu cầu*
- `storage.objects` (bucket `avatars`): RLS theo `user_id` — chỉ chủ ảnh mới sửa/xóa được file của mình
- `price` = số **nhỏ nhất** trong khoảng (để tính ngân sách); `price_label` giữ nguyên dạng
  `"299.000đ – 499.000đ"` để hiển thị — **không tự bịa giá**

**RLS:** bật cho cả 4 bảng; user chỉ SELECT/INSERT/UPDATE/DELETE dòng `user_id = auth.uid()`;
admin có policy riêng (select toàn cục + delete sản phẩm), user **không tự nâng role** được.

**Bảo mật đã triển khai:** chống SSRF (chỉ http/https; chặn localhost/`127.0.0.1`/IP private/
`169.254.169.254`/`.internal`; kiểm tra **mọi record DNS** + **mọi hop redirect**; timeout; cache
5 phút; rate-limit 40 req/phút/user) · secret key không sang browser · middleware refresh
session + chặn đường dẫn đăng nhập · không lộ thông tin nhạy cảm ở admin.

---

# ☁️ Deploy lên Vercel + tên miền riêng

> **Bản đầy đủ từng bước (kèm hướng dẫn Student Pack → domain `.me` miễn phí cho sinh viên): xem [`DEPLOY.md`](./DEPLOY.md).** Tóm tắt:

1. Đẩy code lên GitHub (**chưa có** `.env.local`, đã nằm trong `.gitignore`).
2. https://vercel.com → **Add New → Project** → import repo → Vercel tự nhận Next.js.
3. **Settings → Environment Variables**: thêm 5 biến như `.env.local`
   (`NEXT_PUBLIC_SITE_URL=https://domain-cua-ban.vercel.app`).
4. **Deploy**. Sau đó vào Supabase → URL Configuration → *Site URL* + *Redirect URLs* điền domain mới.
5. Chạy `npm run create-admin` trên máy bạn (script chỉ cần URL + secret key).

---

# 🧪 Kiểm tra

```bash
npm run typecheck      # TypeScript strict
npm run test:metadata  # 10 unit test: OG/JSON-LD/itemprop/giá range/không bịa giá/SSRF
npm run build          # production build
npm start              # chạy bản build
```

Preview `index.html` đã kiểm thử tự động bằng jsdom: 39/39 luồng (thêm/trùng/retry/xóa/lọc/sắp
xếp/ngân sách/danh mục/theme/admin/persistence) — không lỗi runtime.

---

# ❓ Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Banner *Chưa cấu hình Supabase* / API báo `NOT_CONFIGURED` | Thiếu `.env.local` hoặc chưa restart `npm run dev` sau khi tạo file |
| “Sai tên đăng nhập hoặc mật khẩu” khi mới tạo tài khoản | Bạn đang bật *Confirm email* → vào Supabase → Authentication → **tắt** Confirm email (hoặc xác minh qua bảng Users) |
| Đăng ký báo username trùng | Supabase chặn email trùng (`username@AUTH_EMAIL_DOMAIN`) → chọn username khác |
| Lấy metadata Shopee/TikTok thất bại, báo *Thử lại* | Sàn chặn truy cập tự động/CAPTCHA theo từng thời điểm — bình thường; thử lại sau, hoặc thêm ở trình duyệt đang đăng nhập. Hệ thống không bao giờ loading vô hạn (timeout 12s) |
| Build báo lỗi env | Bản build KHÔNG cần key thật; chỉ khi chạy `npm start` mới gọi Supabase |
| Trang admin trống | Tài khoản chưa có `role='ADMIN'` → chạy `npm run create-admin` hoặc update SQL |
| Ảnh sản phẩm không hiện trên card | Một số CDN chặn hot-link → app tự fallback ảnh placeholder; link “Mua ngay” vẫn đúng |

---

Made with ♥ — *“Thấy thích thì lưu lại, cần thì mua.”*
