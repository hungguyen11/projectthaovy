# 🌍 DEPLOY ProjectThaoVy — từ 0 đến website online có tên miền riêng (free cho sinh viên)

> Toàn bộ lộ trình dưới đây: **0 đồng**. Tổng thời gian thao tác: ~1–2 tiếng.
> Chờ duyệt sinh viên: 2–7 ngày (chạy SONG SONG với phần A, không cần chờ).
>
> Kết quả cuối cùng: `https://ten-cua-ban.me` — thật, có HTTPS, ai cũng truy cập được.

```
Code trên máy bạn ──push──▶ GitHub (chứa code)
                              │ tự deploy mỗi lần push
                              ▼
                        Vercel (host + SSL + tên miền)  ◀── bạn trỏ domain về đây
                              │
                              ▼
                        Supabase (database + auth + RLS, free)
```

---

# PHẦN A — Đưa app lên internet (60 phút, chưa cần tên miền)

## A1. Cài Git trên Windows (nếu chưa có)

Mở PowerShell và chạy:

```powershell
winget install --id Git.Git -e
```

Hoặc tải bộ cài: https://git-scm.com/download/win → Next hết, chấp nhận mặc định.
Đóng/mở lại PowerShell rồi kiểm tra:

```powershell
git --version
```

## A2. Tạo repository trên GitHub

1. Vào https://github.com → Sign up (nếu chưa có) — dùng email thật, nhớ mật khẩu.
2. Góc trên phải **＋ → New repository**.
3. Đặt tên: `listcuathaovy` · Quyền chọn: **Private** (an toàn hơn — web vẫn deploy Vercel bình thường).
4. **KHÔNG tick** "Add a README" / ".gitignore" / "license" (project đã có sẵn rồi).
5. Bấm **Create repository**. GitHub hiện trang hướng dẫn — đừng bận tâm, làm theo A3.

## A3. Đẩy code lên GitHub

Mở PowerShell, `cd` vào thư mục dự án (nơi có file `package.json`):

```powershell
cd C:\Duong\Cua\Ban\ProjectThaoVy

git init
git add -A
git commit -m "ProjectThaoVy v1.0"
git branch -M main
git remote add origin https://github.com/<TEN-TAI-KHOAN-GITHUB>/listcuathaovy.git
git push -u origin main
```

- Thay `<TEN-TAI-KHOAN-GITHUB>` bằng username của bạn.
- Lần đầu push, GitHub có thể hỏi đăng nhập → bấm link mở trình duyệt → authorize (hoặc tạo
  **Personal Access Token**: Settings → Developer settings → Tokens, check scope `repo`, dùng token làm password).
- 🔒 `.env.local` (nếu có) đã bị `.gitignore` chặn — **kiểm tra lại**: chạy `git status`, chắc chắn không thấy dòng nào chứa `.env.local`. KHÔNG BAO GIỜ để file env bị commit.

Xong: lên GitHub reload, thấy danh sách file là ✅.

## A4. Tạo project Supabase (nếu chưa làm)

1. https://supabase.com → **Start your project** → đăng nhập bằng GitHub.
2. **New project** → tên `listcuathaovy` · Database password: bấm *Generate* rồi **lưu lại vào file txt** · Region: **Singapore** · Plan: **Free** → Create (chờ 1–2 phút).
3. **SQL Editor** (menu trái) → **New query** → mở file `database/schema.sql` của dự án bằng Notepad, **Select All → Copy**, dán vào, bấm **Run**. Xong phải báo *Success*.
4. **Project Settings → API Keys** (hoặc "Data API") — copy 3 giá trị:
   - `Project URL` → `https://xxxxxx.supabase.co`
   - `publishable key` (cũ: `anon public`)
   - `secret key` (cũ: `service_role`) ← **cực mật, chỉ server dùng**
5. **TẮT "Confirm email"** — Supabase đổi vị trí menu liên tục, tìm theo UI bạn đang thấy:
   - **Cách nhanh nhất**: bấm `Ctrl K` (⌘K) ở góc dashboard → gõ `authentication` → Enter.
   - Dashboard mới: **biểu tượng bánh răng "Project Settings"** (góc trái dưới) → **Configuration → Authentication** → kéo xuống khối **Providers / Email** → tắt **Confirm email** → **Save**.
   - Dashboard cũ: menu trái **Authentication → Providers → Email** → tắt **Confirm email**.
   - Nếu vẫn không thấy — dùng thẳng API (không cần dashboard): tạo token tại `supabase.com/dashboard/account/tokens` → "New token", rồi chạy PowerShell:
     ```powershell
     curl.exe -X PATCH "https://api.supabase.com/v1/projects/<REF>/config/auth" -H "Authorization: Bearer <TOKEN>" -H "content-type: application/json" -d '{\"GOTRUE_MAILER_AUTOCONFIRM\":true}'
     ```
     (`<REF>` = chuỗi project, xem trên URL dashboard: `supabase.com/dashboard/project/**abc123def**/...`)
   - **Kế hoạch C** (không đổi được settings vẫn sống): mặc định bật Confirm email thì user đăng ký sẽ ở trạng thái chờ — vào **Authentication → Users** → bấm user → **Confirm user** là dùng được ngay. Tài khoản admin tạo bằng `npm run create-admin` **không bị ảnh hưởng** (script đã set `email_confirm: true`).

## A5. Chạy thử trên máy bạn (nếu chưa)

Tạo file **`.env.local`** ở thư mục dự án (Notepad → Save As → tên `.env.local`, loại *All Files*):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_pub_xxxxxxxx
SUPABASE_SECRET_KEY=sb_sec_xxxxxxxx
NEXT_PUBLIC_SITE_URL=http://localhost:3000
AUTH_EMAIL_DOMAIN=listcuathaovy.app
```

```powershell
npm install
npm run dev
```

Mở http://localhost:3000 → **/register** tạo 1 tài khoản → thêm thử 1 sản phẩm bằng link Shopee. OK thì Ctrl+C tắt.

Tạo tiếp admin:

```powershell
npm run create-admin
# Username: manhhung · Password: tự đặt ≥ 8 ký tự (KHÔNG dùng lại "manhhung03" khi lên môi trường công khai)
```

## A6. Deploy lên Vercel — bạn nhận tên miền `.vercel.app` NGAY tại đây

1. https://vercel.com → **Sign Up with GitHub** → authorize.
2. Dashboard → **Add New… → Project** → tìm repo `listcuathaovy` → **Import**.
3. Framework tự nhận **Next.js**, Build settings giữ nguyên. Mở mục **Environment Variables**, thêm đúng 5 biến:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxxx.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_pub_...` |
   | `SUPABASE_SECRET_KEY` | `sb_sec_...` |
   | `NEXT_PUBLIC_SITE_URL` | `https://<tên-du-án>.vercel.app` *(xem chú thích dưới)* |
   | `AUTH_EMAIL_DOMAIN` | `listcuathaovy.app` |

   ⚠️ **Không tick** "Sensitive" cho các biến `NEXT_PUBLIC_...` (cần đọc lúc build). Riêng secret key có tick được.
4. Về tên `https://<tên-du-án>.vercel.app`: Vercel đặt theo repo; bạn có thể đổi ở **Settings → Projects → Rename** trước, ví dụ `projectthaovy`. Nếu chưa chắc, tạm điền `https://projectthaovy.vercel.app` — sai vẫn sửa sau được (bước A8).
5. Bấm **Deploy**. Đợi ~1 phút → **🎉 Live tại `https://projectthaovy.vercel.app`**.

Mỗi lần sau này sửa code: `git add -A` → `git commit -m "..."` → `git push` → Vercel **tự deploy lại**. Không bao giờ phải đụng Vercel nữa.

## A7. Khai báo domain Vercel cho Supabase

Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://projectthaovy.vercel.app`
- **Redirect URLs**: thêm `https://projectthaovy.vercel.app/**`

## A8. Kiểm tra cuối phần A

| # | Test | Đạt khi |
|---|---|---|
| 1 | Mở domain `.vercel.app` | Landing hiện, không banner "Chưa cấu hình Supabase" |
| 2 | /register tạo tài khoản mới | Vào được dashboard |
| 3 | Đăng nhập `manhhung` | Sidebar có mục **Quản trị** |
| 4 | Dán link Shopee thật → Lấy thông tin | Hiện đúng **ảnh + tên + giá THẬT** (nếu sàn đang chặn bot → báo lỗi + Thử lại, thử lại sau ít phút) |
| 5 | F5 trình duyệt | Vẫn đăng nhập (session cookie OK) |
| 6 | Đăng xuất / đăng nhập | Không lỗi CORS/redirect |

---

# PHẦN B — Tên miền RIÊNG miễn phí với GitHub Student Pack

> Bạn là sinh viên → được duyệt Pack sẽ có:
> • **1 năm miền `.me` MIỄN PHÍ + SSL qua Namecheap** (hết năm 1 gia hạn chỉ ~$4.88/năm, muốn không mất phí thì tắt auto-renew/xóa domain)
> • hoặc **1 năm miền `.TECH`** qua Get .TECH
> • kèm cả tá quà khác: GitHub Pro, Copilot, Azure $100, DigitalOcean $200, JetBrains…

## B1. Nộp đơn Student Pack (làm NGAY, chờ duyệt song song với phần A)

1. Vào https://education.github.com/pack → **Apply for Student Developer Pack** (đăng nhập GitHub).
2. Chọn **Student**. Điền form — **bí quyết duyệt nhanh, đậu ngay lần đầu**:
   - **Email trường là nhanh nhất**: nếu trường bạn cấp email dạng `@…edu.vn` (VD: `dcht@uit.edu.vn`) → chọn "I have a school email" và thêm email đó vào GitHub **Settings → Emails** (verify) trước khi nộp.
   - Không có email trường → chọn "No, I need to verify with documents" và tải lên:
     - **Ảnh thẻ/sinh viên hoặc giấy xác nhận sinh viên** (trường cấp — xin bản mềm trên cổng thông tin SV, hoặc chụp giấy vật lý): chụp rõ nét, đủ 4 góc, không che mờ, KHÔNG chỉnh sửa/crop méo, ngày còn hạn.
     - Giấy tờ ghi tên + trường + **thời gian học còn hiệu lực** — người duyệt đọc được là đậu.
   - Tên trên hồ sơ GitHub trùng tên trên giấy tờ.
3. Nộp → chờ **2–7 ngày** (đôi khi vài giờ). Kết quả báo qua email GitHub.

## B2. Claim tên miền miễn phí (sau khi được duyệt)

**Cách 1 — Namecheap (khuyên dùng, `.me`):**
1. Vào trang benefits của Pack (education.github.com → *Student Developer Pack*) → tìm offer **Namecheap** → Connect with GitHub → dẫn tới trang `nc.me/landing/github`.
2. Tìm kiếm tên miền bạn muốn: `thaovy.me`, `listcuathaovy.me`, `thaovy-list.me`… (càng ngắn đẹp càng dễ bị lấy trước).
3. Thêm vào giỏ → giá ra **0đ cho năm đầu** → thanh toán. *(Namecheap có thể yêu cầu thêm thẻ Visa/Master vào ví để chống abuse — không bị trừ tiền cho offer 0đ.)*
4. Tắt **Auto-Renew** trong Domain List nếu bạn định bỏ sau năm 1 (khỏi bị tính ~$12-15/năm — thực tế $4.88 cho .me là quá rẻ, cân nhắc giữ).

**Cách 2 — Get .TECH:** trong Pack → offer *.TECH* → vào `get.tech/github-student-developer-pack` → claim domain `ten-ban.tech` miễn phí 1 năm.

## B3. Nối tên miền vào Vercel (5 phút thao tác + chờ DNS)

1. Vercel → project → **Settings → Domains** → nhập `thaovy.me` → **Add**.
2. Vercel hiện bảng **những bản ghi DNS cần tạo** — mở **Namecheap → Domain List → Manage → Advanced DNS** và tạo đúng theo (mặc định Vercel yêu cầu):

   | Type | Host | Value |
   |---|---|---|
   | A Record | `@` | `76.76.21.21` |
   | CNAME Record | `www` | `cname.vercel-dns.com` |

   *(Luôn lấy giá trị Vercel hiển thị trên màn hình làm chuẩn — nếu khác bảng trên, làm theo màn hình.)*
3. Lưu → chờ DNS lan tỏa (5 phút – 4 tiếng). Vercel tự kích hoạt **HTTPS/SSL** khi tên miền về.
4. **Redeploy với env mới** — Vercel → Settings → Environment Variables → sửa
   `NEXT_PUBLIC_SITE_URL` = `https://thaovy.me` → Project → **Deployments → … → Redeploy**.
5. Supabase → Authentication → URL Configuration → đổi **Site URL** + **Redirect URLs** sang `https://thaovy.me`.
6. Mở `https://thaovy.me` → đăng nhập thử → xong. 🌷

---

# PHẦN C — Checklist tổng (tick hết là hoàn thành)

```
[ ] A1  Git cài xong (git --version chạy)
[ ] A2  Repo GitHub tồn tại, code đã push
[ ] A3  git status sạch, KHÔNG file .env trong repo
[ ] A4  Supabase: schema.sql Run = Success · 3 API keys · Confirm email = OFF
[ ] A5  npm run dev local: register + login + add product OK
[ ] A5b npm run create-admin OK (manhhung, mật khẩu mới)
[ ] A6  Vercel deploy xanh, 5 env vars đúng
[ ] A7  Supabase Site URL trỏ domain live
[ ] A8  6 bài test cuối pass
[ ] B1  Student Pack APPROVED
[ ] B2  Domain .me/.tech về tài khoản Namecheap/Get.tech
[ ] B3  Domain nối Vercel, HTTPS khóa xanh, Redeploy env, Supabase URL cập nhật
```

# ❓ Sự cố hay gặp

| Lỗi | Xử lý |
|---|---|
| Build Vercel fail `Invalid NEXT_PUBLIC_SUPABASE_URL` | Thiếu env trên Vercel → thêm rồi Redeploy (env local không tự qua Vercel) |
| Build Vercel fail `Couldn't find any 'pages' or 'app' directory` | Repo GitHub thiếu folder (kéo file lẻ lên web GitHub làm dẹt cấu trúc) → upload lại **các folder** `app components lib public scripts database types supabase` |
| Đăng ký/đăng nhập báo `Email address "..." is invalid` | Chính sách SMTP dựng sẵn của Supabase chặn domain email "không thật" (app này map username → `user@<AUTH_EMAIL_DOMAIN>`). Chữa: ① Authentication → Sign In / Providers → Email → tắt **Confirm email** (Save); ② cũng mục Email/SMTP Settings → bật **Custom SMTP** và điền giá trị đối phó (Host `smtp.gmail.com`, Port `465`, User `no-reply@<domain-của-bạn>`, Pass `dummy123456`) — không cần gửi được mail thật, vì Confirm đã tắt nên Supabase chẳng gửi gì; ③ Save rồi đăng ký lại. KHÔNG bấm "Send test email" (sẽ fail, bỏ qua). |
| Đăng ký được nhưng login báo lỗi | Confirm email trên Supabase còn bật → tắt, Redeploy |
| Domain đã add nhưng 20 phút chưa lên | DNS chưa lan tỏa — thử `nslookup thaovy.me`; qua 6 tiếng chưa được thì kiểm tra lại bảng ghi (nhầm ô Host `@`) |
| Vercel báo domain đã dùng ở project khác | Xóa domain khỏi project cũ rồi add lại |
| Tên `.me` ưng ý bị lấy mất | Thêm hậu số: `thaovy-list.me`, `list.thao-vy... (dấu gạch)`, hoặc dùng song song offer `.tech` |
| Link Shopee báo lỗi metadata trên prod | Sàn đang chặn truy cập tự động tại thời điểm đó — app hiện "Thử lại" theo thiết kế, thử lại sau; không phải lỗi deploy |
| Hết năm 1 Namecheap đòi tiền | Vào Domain List → tắt Auto-Renew (mất domain) hoặc trả ~$4.88/năm để giữ |

> 🔐 **Nhắc lại lần cuối:** secret key (`sb_sec_...`) chỉ nằm trong `.env.local` (máy bạn) + Environment Variables của Vercel. Không dán vào chat/GitHub repo/frontend. Nếu lỡ commit → xoay (roll) key mới trong Supabase ngay.

## Tính năng "Chủ list mách" (review trong pop-up người xem)
- Chạy **database/OWNER-NOTE.sql** 1 lần trong SQL Editor để bật lưu câu review (KHÔNG chạy thì web vẫn chạy bình thường, app tự bỏ qua, không lỗi).
- Khi thêm sản phẩm: ô "Câu mách của bạn" đã có sẵn câu gợi ý — sửa/xóa/tự viết đều được.
- Khi nhập hàng loạt: mỗi món tự có câu nháp, vào Chi tiết → "Gợi ý câu" để đổi, bấm Lưu review khi duyệt.
- Người xem bấm vào TÊN sản phẩm → pop-up: ảnh → câu mách → Mua ngay.
