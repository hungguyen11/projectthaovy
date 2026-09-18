/** Kiểu dữ liệu dùng chung — khớp với database/schema.sql */

export type ProductStatus = "PENDING" | "PRIORITY" | "FAVORITE" | "PURCHASED";

export type Marketplace = "SHOPEE" | "TIKTOK_SHOP" | "LAZADA" | "TIKI" | "OTHER";

export type Role = "USER" | "ADMIN";

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  category_id: string | null;
  source_url: string;
  marketplace: Marketplace;
  image_url: string | null;
  product_name: string;
  /** Giá dùng để tính toán (số CAO NHẤT trong khoảng, nếu có range — spec 2026-09) */
  price: number | null;
  /** Chuỗi hiển thị gốc, ví dụ "299.000đ – 499.000đ" — không tự bịa giá */
  price_label: string | null;
  status: ProductStatus;
  /** Câu "chủ list mách" — hiện trong pop-up khi người xem bấm vào tên SP (tùy chọn,
   *  cần chạy database/OWNER-NOTE.sql; chưa có cột thì app bỏ qua im lặng, không lỗi) */
  owner_note?: string | null;
  created_at: string;
  updated_at: string;
  category?: Pick<Category, "id" | "name"> | null;
}

/** Kết quả POST /api/metadata */
export interface ExtractedMeta {
  image: string | null;
  title: string;
  price: number | null;
  price_label: string | null;
  marketplace: Marketplace;
  source_url: string;
}

export interface ApiError {
  code: string;
  message: string;
}

/** /api/products trả về khi URL trùng */
export interface DuplicateResponse {
  code: "DUPLICATE";
  message: string;
  product: Product;
}
