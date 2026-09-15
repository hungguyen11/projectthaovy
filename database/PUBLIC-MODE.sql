-- ═══════════════════════════════════════════════════════════════════
-- PUBLIC-MODE.sql — chạy MỘT LẦN trong Supabase → SQL Editor → Run.
-- Bật "web công khai": ai cũng XEM được sản phẩm/danh mục (không cần
-- tài khoản); ghi/sửa/xoá vẫn chỉ qua API máy chủ của Admin.
-- © _hngnguynn_
-- ═══════════════════════════════════════════════════════════════════

alter table public.products   enable row level security;
alter table public.categories enable row level security;

-- (1) CHO PHÉP ĐỌC CÔNG KHAI (kẻ gian không đăng nhập vẫn xem được list)
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select to anon, authenticated using (true);

drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories
  for select to anon, authenticated using (true);

-- (2)VIẾT không mở ở đây — các policy *_owner (chỉ chủ sở hữu) giữ nguyên;
--    server luôn dùng requireAdmin trước khi gọi DB nên user thường không ghi được.

-- (3) DỌN: danh sách công khai chỉ nên chứa dữ liệu của Admin
delete from public.products
where user_id not in (select user_id from public.profiles where role = 'ADMIN');

delete from public.categories
where user_id not in (select user_id from public.profiles where role = 'ADMIN');

-- (4) (Tuỳ chọn) xoá các tài khoản test cũ: làm trong
--     Supabase Dashboard → Authentication → Users → Delete (KHÔNG xoá tay trong auth.users).
--     Lưu ý: mọi user thường nếu còn sẽ KHÔNG vào được khu quản trị (API chặn 403).

-- (5) Xác nhận: chạy từng dòng, kết quả = số liệu của Admin
-- select count(*) from public.products;
-- select count(*) from public.categories;
