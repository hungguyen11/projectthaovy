-- ═══════════════════════════════════════════════════════════════════
-- FIX-PRODUCTION.sql — chạy MỘT LẦN duy nhất trong Supabase
--   Dashboard → SQL Editor → Paste tất cả → Run.
-- An toàn: không đụng tới sản phẩm đã lưu.   © _hngnguynn_
-- ═══════════════════════════════════════════════════════════════════

-- (1)User MỚI sẽ KHÔNG còn được cài sẵn 7 danh mục mặc định nữa
--     (app đã bỏ seed; đây là con trigger cũ trong DB còn sót lại)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid   uuid := new.id;
  uname text := coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1));
  dname text := coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), uname);
begin
  if exists (select 1 from public.profiles p where p.username = uname) then
    uname := uname || '_' || substr(md5(random()::text), 1, 4);
  end if;

  insert into public.profiles (user_id, username, display_name, role)
  values (uid, uname, dname, 'USER')
  on conflict (user_id) do nothing;

  -- (đã bỏ phần insert danh mục mặc định — user tự tạo)
  return new;
end $$;

-- (2) Dọn RÁC: xoá mọi danh mục không còn sản phẩm nào tham chiếu
--     (sạch cả các bản trùng lặp cũ; danh mục ĐANG có sản phẩm được giữ nguyên)
delete from public.categories c
where not exists (
  select 1 from public.products p where p.category_id = c.id
);

-- (3) Khoá quyền RLS để mỗi user CHỈ thấy dữ liệu của chính mình ở tầng DB
--     (app cũng đã tự lọc user_id — đây là lớp phòng thủ thứ hai)
alter table public.categories enable row level security;
alter table public.products   enable row level security;

drop policy if exists categories_owner on public.categories;
create policy categories_owner on public.categories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists products_owner on public.products;
create policy products_owner on public.products
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admin panel KHÔNG bị ảnh hưởng: mọi route /api/admin/* dùng service key
-- (bỏ qua RLS) và đã kiểm tra role ADMIN ở server-side.

-- (4) Xác nhận: chạy 2 dòng này, kết quả phải là 0 hoặc chỉ danh mục còn dùng
-- select count(*) from public.categories;
-- select username from public.profiles;
