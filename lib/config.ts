import type { Marketplace, ProductStatus } from "@/types";

export const SITE = {
  name: "ProjectThaoVy",
  brand: "ListcuaThaoVy",
  title: "List của Thảo Vy — Lưu những món đồ bạn muốn mua",
  tagline: "Lưu lại những món đồ bạn thích để dễ dàng tìm lại và mua khi cần.",
  motto: "Thấy thích thì lưu lại, cần thì mua!",
  description:
    "Dán link sản phẩm từ Shopee hoặc TikTok Shop — hệ thống tự lấy ảnh, tên và giá. Bạn chỉ chọn danh mục, trạng thái rồi lưu. Cần mua? Bấm “Mua ngay”, đúng link gốc sẽ mở trên sàn. Riêng tư tuyệt đối.",
};

/**
 * Màu trạng thái "Aqua Pastel" (theo mock):
 * trung tính trắng-xanh · hồng candy (ưu tiên/yêu thích) · mint (đã mua).
 */
export const STATUS_META: Record<
  ProductStatus,
  { label: string; short: string; chip: string; tint: string }
> = {
  PENDING: {
    label: "Dự định mua",
    short: "Dự định mua",
    chip: "bg-surface/95 text-[#475569] shadow-card ring-1 ring-line dark:bg-[#111B2D]/95 dark:text-[#94A3B8]",
    tint: "bg-aqua-soft text-[#475569] dark:bg-[#1E293B] dark:text-[#94A3B8]",
  },
  PRIORITY: {
    label: "Ưu tiên mua trước",
    short: "Ưu tiên",
    chip: "bg-honey-soft text-amber-700 dark:bg-[#3A2C14] dark:text-amber-300",
    tint: "bg-honey-soft text-amber-700 dark:bg-[#3A2C14] dark:text-amber-300",
  },
  FAVORITE: {
    label: "Yêu thích",
    short: "Yêu thích",
    chip: "bg-[#FCE7F3] text-[#E11D48] dark:bg-[#3F1D2B] dark:text-[#FDA4AF]",
    tint: "bg-[#FCE7F3] text-[#E11D48] dark:bg-[#3F1D2B] dark:text-[#FDA4AF]",
  },
  PURCHASED: {
    label: "Đã mua",
    short: "Đã mua",
    chip: "bg-mint-soft text-[#059669] dark:bg-[#053B2E] dark:text-[#6EE7B7]",
    tint: "bg-mint-soft text-[#059669] dark:bg-[#053B2E] dark:text-[#6EE7B7]",
  },
};

export const ALL_STATUSES: ProductStatus[] = ["PENDING", "PRIORITY", "FAVORITE", "PURCHASED"];

/** Màu NHẬN DIỆN của từng sàn — màu hiệu thật trên nền pastel (theo mock). */
export const MARKETPLACE_META: Record<Marketplace, { label: string; badge: string; letter: string }> = {
  SHOPEE: { label: "Shopee", badge: "bg-[#FFEEEB] text-[#EE4D2D] dark:bg-[#3A1E1B] dark:text-[#FFB4A2]", letter: "S" },
  TIKTOK_SHOP: { label: "TikTok Shop", badge: "bg-[#E9F1F1] text-[#010101] dark:bg-[#1C2833] dark:text-[#E9F1F1]", letter: "♪" },
  LAZADA: { label: "Lazada", badge: "bg-[#EFF0FF] text-[#5B4EE8] dark:bg-[#1E2148] dark:text-[#B4BCFF]", letter: "L" },
  TIKI: { label: "Tiki", badge: "bg-[#E6F4FF] text-[#0268AA] dark:bg-[#122A40] dark:text-[#7CC4F2]", letter: "T" },
  OTHER: { label: "Web khác", badge: "bg-aqua-soft text-teal-ink dark:bg-[#083344] dark:text-teal-200", letter: "↗" },
};

export function detectMarketplace(url: string): Marketplace {
  const u = String(url || "").toLowerCase();
  if (u.includes("shopee")) return "SHOPEE";
  if (u.includes("tiktok")) return "TIKTOK_SHOP";
  if (u.includes("lazada")) return "LAZADA";
  if (u.includes("tiki.")) return "TIKI";
  return "OTHER";
}

export const DEFAULT_CATEGORIES = [
  "Thời trang",
  "Giày dép",
  "Làm đẹp",
  "Công nghệ",
  "Đồ dùng",
  "Phụ kiện",
  "Khác",
] as const;

export const FALLBACK_IMAGE = "/products/placeholder.svg";
