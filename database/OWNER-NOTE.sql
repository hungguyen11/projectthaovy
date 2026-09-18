-- ════════════════════════════════════════════════════════════════
--  ĐỒNG BỘ CẤU TRÚC DATABASE — chạy 1 LẦN, bấm lặp lại cũng KHÔNG hại gì
--  (mọi lệnh đều "if not exists": cột nào đã có sẽ được bỏ qua)
--
--  Bật các tính năng:
--   • "Chủ list mách": lưu câu review cho sản phẩm (cột owner_note)
--   • Đảm bảo cột giá tồn tại (price / price_label) cho nút "Đồng bộ giá"
--
--  Cách chạy (Windows, 40 giây):
--   1. Mở https://supabase.com/dashboard → chọn project của bạn
--   2. Menu trái: SQL Editor → New query
--   3. DÁN TOÀN BỘ nội dung file này → bấm RUN (mũi tên chạy)
--   4. Thấy "Success. No rows returned." → về web, vào
--      Cài đặt → Công khai → "Kiểm tra ngay" → các cột phải báo ✓
--  © _hngnguynn_
-- ════════════════════════════════════════════════════════════════

-- Cột chứa câu mách/review của chủ list (nguyên nhân lỗi "Không thể cập nhật"
-- khi lưu review là DB thiếu cột này):
alter table public.products add column if not exists owner_note text;

-- Đảm bảo 2 cột giá tồn tại (nút "Đồng bộ giá" cần):
alter table public.products add column if not exists price numeric;
alter table public.products add column if not exists price_label text;

comment on column public.products.owner_note is
  'Câu mách của chủ wishlist — hiển thị trong pop-up khi người xem bấm vào tên sản phẩm';
