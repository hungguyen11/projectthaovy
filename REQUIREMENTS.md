# 📋 ProjectThaoVy — Hồ sơ yêu cầu & cài đặt hoàn chỉnh

> **© 2026 _hngnguynn_** — tài liệu này ghi lại TOÀN BỘ mục đích gốc của website,
> các quy tắc bất biến, cài đặt hệ thống và mọi lần nâng cấp, để bất kỳ ai (kể cả
> bạn trong tương lai) đọc vào là hiểu ngay sản phẩm này là gì và vận hành ra sao.

---

## 1. Mục đích chính của website (không đổi)

**List của Thảo Vy** — kho lưu **những món đồ bạn muốn mua** (wishlist cá nhân).

Luồng lõi duy nhất, phải luôn hoàn thành trong vài giây:

```
COPY LINK sản phẩm (Shopee / TikTok Shop / sàn khác)
→ DÁN vào ô "Thêm sản phẩm"
→ Hệ thống TỰ LẤY: ảnh + tên + giá (metadata, READ-ONLY)
→ Chọn DANH MỤC + TRẠNG THÁI
→ LƯU  (nếu link không đọc được giá → tự nhập giá tay rồi vẫn lưu)
```

Sau đó: tìm kiếm, lọc trạng thái/danh mục, sắp xếp; đánh dấu ⭐ Yêu thích,
⭐ Ưu tiên mua, ✅ Đã mua; nút **Mua ngay** mở đúng link gốc (`target="_blank"
rel="noopener noreferrer"`).

**KHÔNG phải website thương mại điện tử.** Không bao giờ có: giỏ hàng, thanh toán,
đơn hàng, vận chuyển, chat, đánh giá shop, affiliate, quảng cáo, AI gợi ý,
so giá/khuyến mãi tự động. Mọi tính năng ngoài phạm vi "lưu & quản lý món đồ muốn
mua" đều bị từ chối.

## 2. Quy tắc bất biến (acceptance criteria)

1. Metadata **chỉ 3 trường**: ảnh, tên, giá — người dùng KHÔNG sửa được dữ liệu lấy
   từ link (giá tự nhập tay là ngoại lệ duy nhất, chỉ khi fetch thất bại/thiếu giá).
2. **Không số liệu giả** ở môi trường thật (stats/budget/metadata phải là dữ liệu
   thật). Bản preview offline phải có nhãn DEMO.
3. **Không hardcode mật khẩu** ở repo/frontend/GitHub — chỉ server-side / Supabase Auth.
4. URL là **input duy nhất** khi thêm sản phẩm — không form nhập tên/giá/ảnh thủ công.
5. Responsive thiết kế **theo từng breakpoint** (mobile là trải nghiệm riêng:
   bottom-nav + FAB + modal bottom-sheet), không phải desktop thu nhỏ.
6. Code sạch, dễ bảo trì, chạy được trên Windows (npm install → npm run build → npm start).
7. Build phải **xanh trước khi bàn giao**: code → build → test → sửa → build lại → QA.

## 3. Công nghệ & kiến trúc

| Lớp | Công nghệ |
|---|---|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS |
| Backend | API Routes Node runtime (server-side), Supabase Admin API |
| Database | Supabase Postgres + **RLS mọi bảng** + Storage bucket `avatars` |
| Auth | Supabase Auth, session cookie HttpOnly; trick `username → username@AUTH_EMAIL_DOMAIN` (email nội bộ, không cần thật) |
| Icons | **Lucide** (stroke 2, bo tròn — không emoji làm icon) |
| Hosting | Vercel (Hobby, free) · Repo: GitHub `projectthaovy` |
| Metadata | OG → Twitter Card → JSON-LD → Schema.org · timeout 12s · anti-SSRF (chặn localhost/private/metadata IP, revalidate DNS) |

**Bảng dữ liệu**: `profiles` (username unique, avatar_url, role USER|ADMIN) ·
`categories` (unique user+name) · `products` (source_url, marketplace, image_url,
product_name, price numeric, price_label, status, unique user+source_url) ·
`budgets` (tồn tại trong DB cho tương lai — UI đã gỡ) · trigger `handle_new_user`
tạo profile + 7 danh mục mặc định.

**API**: `/api/products(+/[id])` · `/api/categories(+/[id])` · `/api/profile` ·
`/api/metadata` · `/api/admin/users|products|categories` (POST users = admin tạo tài khoản) ·
`/api/auth/callback|signout` · rate-limit 40 lần/phút.

**Tài khoản admin chuẩn**: `manhhung` (email nội bộ `manhhung@listcuathaovy.app`,
role ADMIN — tạo bằng script `npm run create-admin` hoặc Supabase Dashboard → Add user
+ `update profiles set role='ADMIN'`).

## 4. Design System — "Aqua Pastel" v4 (dựng lại theo ảnh mock chủ nhân gửi)

Cảm giác mục tiêu: **Trẻ trung · Hiện đại · Mượt · Premium · Friendly**, web app 2026.
Cyan là màu **nhận diện/dẫn mắt** — tuyệt đối không phủ nền, không neon chói, không gradient mạnh.

### Màu (light)
| Token | Giá trị | Dùng cho |
|---|---|---|
| Primary Cyan | `#00E5FF` | nền nút chính (chữ `#06323D` — tương phản ~9:1), selection |
| Dark Cyan | `#00B8D4` | border focus, icon, link hover, active nav |
| Deep Cyan | `#067A96` | nền badge/số bước (chữ trắng AA), text on soft |
| Light Cyan | `#D9F6FC` / soft `#E8FBFF` | nền icon-box 44px, chip active, hover |
| Background | `#F5FAFC` | nền trang |
| Card | `#FFFFFF` | surface |
| Text | `#172026` / `#60727A` | chính / phụ (contrast cao, đọc ngoài trời) |
| Border | `#D9E7EB` | viền mọi ô |
| Success/Warning/Danger | `#16A34A` / `#F59E0B` / `#EF4444` | trạng thái, toast, xóa |

### Dark mode (đúng palette, không đảo màu)
`#0B1114` nền · `#111B20` card · `#F1FAFC` chữ · `#A9BEC5` phụ · `#23343B` border · cyan `#00E5FF`.

### Typography
**Inter** (Google Fonts, subsets Việt ngữ đầy đủ) → fallback `system-ui, Segoe UI,
Roboto, Arial`. Hierarchy: heading extrabold tracking-tight · body regular ·
label medium · caption **không nhỏ hơn 12px** (chấp nhận 11.5px ở chip nhỏ).

### Hình thái
Radius: button/input `10–12px` · card `18px` · modal `22px` · icon-box `13px` —
**không bo viên thuốc mọi thứ**. Shadow 3 tầng: card (rất nhẹ) / lift (hover) / pop (modal).
Touch target: **40px tối thiểu, ưu tiên 44px** (nút icon, tim yêu thích, ⋮, ✏️, 🗑).
Icon container chuẩn: 44×44, nền `#E8FBFF`, icon `#00B8D4`.

### Animation (CSS thuần — không thư viện, không lag)
Chỉ `transform` + `opacity`. Micro 150–200ms, transition 200–300ms, tối đa ~400ms,
ease-out/ease-in-out. Cards rise-in stagger 30–60ms (cap 280ms) · modal fade nền +
scale .97→1 **và chiều ngược lại khi đóng** · dropdown pop-in · toast slide-up ·
fav heart bounce 1→1.15→1 · hamburger morph Menu⇄X · hover CHỈ khi
`(hover:hover) and (pointer:fine)` (Tailwind `hoverOnlyWhenSupported`) — mobile dùng `:active`.
Tôn trọng `prefers-reduced-motion` (tất cả về 0.01ms).

### Layout
Mobile-first, breakpoint 640/1024. App: desktop sidebar 264px + topbar; mobile:
bottom-nav 4 tab + FAB 54px + drawer slide-left. Landing có hamburger + menu panel
fade/slide. Grid product: mobile 2 cột → desktop tới 4. Table admin cuộn ngang trong
khung, không vỡ trang. Empty state chuẩn: icon + heading + mô tả + CTA
("Thêm những sản phẩm bạn đang quan tâm để dễ theo dõi và mua sau.").

## 5. 13 nâng cấp chức năng đã được duyệt & cài đặt (giữ nguyên trong bản này)

1. Font rõ, đồng nhất một hệ (nay là Inter theo spec mới).
2. Hiệu năng: bỏ hoàn toàn motion library, bỏ backdrop-blur, ảnh lazy+async.
3. **Đã gỡ mục Ngân sách** khỏi UI (bảng DB vẫn còn cho tương lai).
4. **Ảnh đại diện tải từ thiết bị** (Cài đặt): cắt vuông 256px + WebP ngay trình duyệt
   → Supabase Storage `avatars` + RLS theo uid; nút Xóa ảnh.
5. Trang chủ chỉ 2 thẻ: **Tổng sản phẩm** + **Sản phẩm đã mua**.
6. Câu chào trang chủ: **“Chào {tên}, chào mừng tới giỏ hàng của em Vy 👋”**.
7. **Nhập giá thủ công** khi link không đọc được (nút *Dừng lại* khi đang chờ) —
   hiểu `399.000`, `399000`, `399k`, `1,5tr`.
8. Bố cục card gọn: ảnh 4:3 đồng nhất, dòng giá rõ, không class lỗi/kích cỡ lệch.
9. Bản quyền **© _hngnguynn_** ở footer landing + đáy mọi trang trong app + tài liệu.
10. **Chip lọc danh mục có đếm số** trên trang Tất cả sản phẩm (bấm = lọc, bấm lại = hủy).
11. Hệ animation mượt toàn app (mục Design System ở trên).
12. **Admin tạo tài khoản cho người dùng** (Quản trị → Tạo tài khoản: username + mật khẩu,
    auto-confirm, không cần email — POST `/api/admin/users`).
13. Tiêu chuẩn bao trùm: **mượt · nhanh · đẹp**.

## 6. Cài đặt môi trường (đủ 5 biến, bản local và Vercel phải GIỐNG NHAU)

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_pub...     # KHÔNG tick Sensitive
SUPABASE_SECRET_KEY=sb_sec...                     # server-only, Sensitive được
NEXT_PUBLIC_SITE_URL=https://<domain-của-bạn>     # vd https://projectthaovy.vercel.app
AUTH_EMAIL_DOMAIN=listcuathaovy.app               # giữ nguyên nếu dùng lại DB cũ
```
File: copy `.env.example` → `.env.local`. **Không commit file .env nào** (đã có `.gitignore`).

## 7. Vận hành

- Chạy local: `npm install` → `npm run dev` → `http://localhost:3000`
- Build production: `npm run build` → `npm start`
- Kiểm tra: `npm run typecheck` · `npm run test:metadata`
- Tạo admin: `npm run create-admin` (nhập username/pass theo prompt — không lưu vào file)
- Database cũ cần bật avatar: chạy `database/avatar-storage.sql` (SQL Editor, 1 lần)
- Deploy: xem **DEPLOY.md** (GitHub → Supabase → Vercel → domain)

---

*Ngày chốt: 2026-09-14 · Phiên bản: ProjectThaoVy v4.0 "Aqua Pastel" ·
© **_hngnguynn_** — code, thiết kế và tài liệu.*

### 4b. v4 "Aqua Pastel" — quy đổi từ mock (thay bảng màu §4 cũ, giữ mọi quy tắc chức năng)
| Token | Giá trị | Vai trò |
|---|---|---|
| Nền trang | `#EFF8F7` mist mint | hero-mint gradient + blob hồng/teal blur |
| Card | `#FFFFFF`, border `#DBEFEC` | radius 18px, shadow 3 tầng |
| Chữ | `#113038` / `#5B7981` | tương phản cao |
| Nút chính | gradient `#2BD4C7→#10B5AD`, chữ trắng | btn-primary toàn app |
| Giá sản phẩm | **`#F4522E` coral** | điểm nhận thị giác số 1 |
| Yêu thích/Ưu tiên | hồng candy `#FB72A8` trên nền `#FFE4F0`/`#FFE3EA` | pill trạng thái + tim |
| Đã mua | mint `#10B981`/`#DFF7EC` · Dự định: trắng-xanh nhạt | chip |
| Sàn | Shopee `#EE4D2D` · TikTok `#010101` | badge màu hiệu thật |
| Dark | nền `#0A1A20` · card `#0F242C` · line `#1D3B45` | đêm biển |

Layout theo mock: sidebar ListcuaThaoVy 10 mục + quote viết tay đáy; dashboard hero
"Chào {name}! 👋 / Bạn đang muốn mua gì hôm nay?" + 5 thẻ số liệu (Tổng · Dự định ·
Ưu tiên · Yêu thích · Đã mua) + "Sản phẩm nổi bật" cuộn ngang; card sản phẩm: ảnh 4:3,
badge trạng thái đè góc, tên → giá coral → "Mua ngay" + nút tim cạnh nút, click ảnh/tên
= mở Chi tiết 2 cột; modal Thêm 4 bước đếm số; mobile bottom-nav 5 ô + FAB trung tâm
(Trang chủ · Sản phẩm · **(+)** · Yêu thích · Tài khoản) + trang /account riêng;
chuông góc phải = popover "Vừa thêm gần đây" (5 món mới nhất, bấm mở chi tiết).
