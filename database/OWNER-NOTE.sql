-- ════════════════════════════════════════════════════════════════
--  BẬT TÍNH NĂNG "CHỦ LIST MÁCH" — chạy 1 LẦN để LƯU được câu review
--  (chưa chạy thì web vẫn chạy bình thường, chỉ là câu mách chưa cất vào DB được)
--  Cách chạy: Supabase Dashboard → chọn project → SQL Editor → New query
--             → dán hết file này → Run → "Success. No rows returned" là xong.
--  © _hngnguynn_
-- ════════════════════════════════════════════════════════════════

alter table public.products add column if not exists owner_note text;

comment on column public.products.owner_note is
  'Câu mách của chủ wishlist — hiển thị trong pop-up khi người xem bấm vào tên sản phẩm';
