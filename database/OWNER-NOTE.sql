-- ════════════════════════════════════════════════════════════════
--  BẬT TÍNH NĂNG "CHỦ LIST MÁCH" (review trong pop-up khi người xem bấm tên)
--  Chạy 1 LẦN duy nhất: Supabase Dashboard → SQL Editor → New query → RUN.
--  KHÔNG chạy cũng không sao: web vẫn chạy y hệt, chỉ là câu review chưa
--  được lưu vào DB (app tự hiểu và không lỗi gì cả).
--  © _hngnguynn_
-- ════════════════════════════════════════════════════════════════

alter table public.products add column if not exists owner_note text;

comment on column public.products.owner_note is
  'Câu mách của chủ wishlist — hiển thị trong pop-up khi người xem bấm vào tên sản phẩm';
