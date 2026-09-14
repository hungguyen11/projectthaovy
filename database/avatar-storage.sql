-- ═══════════════════════════════════════════════════════════════════════
--  ListcuaThaoVy — Ảnh đại diện qua Supabase Storage
--  Chạy MỘT LẦN cho project đã có: Supabase Dashboard → SQL Editor →
--  paste toàn bộ → Run. (Project mới thì schema.sql đã bao gồm phần này.)
-- ═══════════════════════════════════════════════════════════════════════

-- 1) Bucket công khai tên "avatars" (mỗi user 1 file: <user_id>/avatar.webp)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2) Policy: ai cũng đọc được ảnh (URL công khai), nhưng chỉ CHỦ của user_id
--    trong đường dẫn mới được ghi/sửa/xóa file của mình.
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars owner insert" on storage.objects;
create policy "avatars owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Xong. Vào web → Cài đặt → "Chọn ảnh từ máy" là dùng được ngay.
