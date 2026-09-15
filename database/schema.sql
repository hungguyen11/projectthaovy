-- ═══════════════════════════════════════════════════════════════════════
--  ListcuaThaoVy — Database v1.0 (Supabase / PostgreSQL)
--  Cách chạy: Supabase Dashboard → SQL Editor → Paste toàn bộ → Run.
--  (Hoặc `supabase db push` với file supabase/migrations/20260101_init.sql)
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Helper: tự cập nhật updated_at ─────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ── PROFILES ───────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references auth.users (id) on delete cascade,
  username     text not null unique,
  display_name text,
  avatar_url   text,
  role         text not null default 'USER' check (role in ('USER', 'ADMIN')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'Hồ sơ người dùng, gắn 1-1 với auth.users';

-- ── CATEGORIES ─────────────────────────────────────────────────────────
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ── PRODUCTS ───────────────────────────────────────────────────────────
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  category_id  uuid references public.categories (id) on delete set null,
  source_url   text not null,
  marketplace  text not null default 'OTHER'
               check (marketplace in ('SHOPEE','TIKTOK_SHOP','LAZADA','TIKI','OTHER')),
  image_url    text,
  product_name text not null check (char_length(product_name) between 1 and 500),
  -- price: số dùng cho tính toán (giá thấp nhất trong khoảng nếu có range)
  price        numeric(14,2) check (price is null or price >= 0),
  -- price_label: chuỗi hiển thị gốc dạng "299.000đ – 499.000đ" (không tự bịa)
  price_label  text,
  status       text not null default 'PENDING'
               check (status in ('PENDING','PRIORITY','FAVORITE','PURCHASED')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, source_url)  -- chặn duplicate URL ở tầng DB (spec §30)
);

-- ── BUDGETS ────────────────────────────────────────────────────────────
create table if not exists public.budgets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  month      int  not null check (month between 1 and 12),
  year       int  not null check (year between 2020 and 2100),
  amount     numeric(14,2) not null default 0 check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, year, month)
);

-- ── INDEXES (spec §48) ─────────────────────────────────────────────────
create index if not exists idx_products_user      on public.products (user_id);
create index if not exists idx_products_category  on public.products (category_id);
create index if not exists idx_products_status    on public.products (user_id, status);
create index if not exists idx_products_created   on public.products (user_id, created_at desc);
create index if not exists idx_products_url       on public.products (source_url);
create index if not exists idx_categories_user    on public.categories (user_id);
create index if not exists idx_budgets_user       on public.budgets (user_id, year, month);
create index if not exists idx_profiles_user      on public.profiles (user_id);

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_categories_updated before update on public.categories
  for each row execute function public.set_updated_at();
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();
create trigger trg_budgets_updated before update on public.budgets
  for each row execute function public.set_updated_at();

-- ── ADMIN CHECK (server-side authorization, dùng trong RLS) ───────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.role = 'ADMIN'
  );
$$;

-- ── ROW LEVEL SECURITY (spec §13, §49 — BẮT BUỘC) ─────────────────────
alter table public.profiles  enable row level security;
alter table public.categories enable row level security;
alter table public.products  enable row level security;
alter table public.budgets   enable row level security;

-- profiles: mỗi người chỉ thấy/sửa hồ sơ của mình; admin xem được hồ sơ (không phải password)
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert with check (user_id = (select auth.uid()));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and role = 'USER');
  -- user không tự nâng quyền ADMIN cho mình; chỉ service-role (admin script) mới đổi được role.

drop policy if exists profiles_delete_self on public.profiles;
create policy profiles_delete_self on public.profiles
  for delete using (user_id = (select auth.uid()));

-- categories
drop policy if exists categories_owner on public.categories;
create policy categories_owner on public.categories
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists categories_admin on public.categories;
create policy categories_admin on public.categories
  for select using (public.is_admin());

-- products
drop policy if exists products_owner on public.products;
create policy products_owner on public.products
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists products_admin_select on public.products;
create policy products_admin_select on public.products
  for select using (public.is_admin());

drop policy if exists products_admin_delete on public.products;
create policy products_admin_delete on public.products
  for delete using (public.is_admin());

-- budgets
drop policy if exists budgets_owner on public.budgets;
create policy budgets_owner on public.budgets
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── AUTO-PROVISION user mới (CHỈ tạo profile — danh mục do user tự tạo) ─
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
  -- tránh trùng username → thêm hậu tố ngẫu nhiên
  if exists (select 1 from public.profiles p where p.username = uname) then
    uname := uname || '_' || substr(md5(random()::text), 1, 4);
  end if;

  insert into public.profiles (user_id, username, display_name, role)
  values (uid, uname, dname, 'USER')
  on conflict (user_id) do nothing;

  -- KHÔNG seed danh mục mặc định — app để trống, user tự tạo.

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Xóa hết dữ liệu cá nhân khi tài khoản bị xóa (phòng dữ liệu mồ côi)
-- đã có on delete cascade ở trên — không cần thêm.

-- ═══════════════════════════════════════════════════════════════════════
--  ADMIN ACCOUNT
--  KHÔNG insert password vào SQL này. Tạo bằng script an toàn:
--      npm run create-admin
--  (script gọi Supabase Admin API phía server, hash bcrypt bởi Supabase,
--   sau đó nâng role = 'ADMIN' — password không nằm trong repo.)
--  Nếu tài khoản admin đã tồn tại, chỉ cần:
--      update public.profiles set role='ADMIN' where username='manhhung';
-- ═══════════════════════════════════════════════════════════════════════

-- ── STORAGE: ảnh đại diện (bucket "avatars" + RLS theo user_id) ─────
-- Xem database/avatar-storage.sql để biết chú thích từng dòng.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars owner insert" on storage.objects;
create policy "avatars owner insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
