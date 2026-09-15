import { NextRequest } from "next/server";
import { requireAdmin, jsonError, route } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { validateUrl } from "@/lib/metadata/ssrf";
import { detectMarketplace } from "@/lib/config";
import { normalizeUrl } from "@/lib/utils";
import type { Product, ProductStatus } from "@/types";

export const runtime = "nodejs";

const STATUSES: ProductStatus[] = ["PENDING", "PRIORITY", "FAVORITE", "PURCHASED"];

/** GET /api/products — PUBLIC: toàn bộ sản phẩm do Admin quản lý, ai cũng xem được. */
async function __GET(request: NextRequest) {
  // CHẾ ĐỘ CÔNG KHAI: ai cũng đọc được list của Admin (không cần đăng nhập).
  const supabase = await createClient();
  const sp = request.nextUrl.searchParams;

  let query = supabase
    .from("products")
    .select("*, category:categories(id,name)")
    .order("created_at", { ascending: false })
    .limit(500);

  const status = sp.get("status");
  if (status && STATUSES.includes(status as ProductStatus)) query = query.eq("status", status);
  const category = sp.get("category");
  if (category) query = query.eq("category_id", category);
  const q = sp.get("q")?.trim();
  if (q) query = query.or(`product_name.ilike.%${q.replace(/[,%()]/g, "")}%,category.name.ilike.%${q.replace(/[,%()]/g, "")}%`);
  const sort = sp.get("sort");
  if (sort === "price_asc") query = query.order("price", { ascending: true });
  else if (sort === "price_desc") query = query.order("price", { ascending: false });
  else if (sort === "oldest") query = query.order("created_at", { ascending: true });

  const { data, error } = await query;
  if (error) return jsonError(500, "DB", "Không thể tải danh sách sản phẩm. Vui lòng thử lại.");
  return Response.json({ products: (data ?? []) as Product[] }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST /api/products { source_url, category_id?, status, snapshot? }
 * snapshot được client gửi sau bước fetch metadata (ảnh/tên/giá READ-ONLY từ link).
 * Duplicate URL → 409 { code: 'DUPLICATE', product }.
 */
async function __POST(request: NextRequest) {
  const { supabase, user } = await requireAdmin();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, "BAD_JSON", "Dữ liệu không hợp lệ.");
  }

  const sourceUrl = typeof body.source_url === "string" ? body.source_url.trim() : "";
  if (!sourceUrl) return jsonError(400, "MISSING_URL", "Thiếu link sản phẩm.");
  try {
    validateUrl(sourceUrl); // chỉ http(s), chặn localhost/private IP
  } catch (e) {
    return jsonError(400, "INVALID_URL", e instanceof Error ? e.message : "Link không hợp lệ.");
  }

  const status = STATUSES.includes(body.status as ProductStatus) ? (body.status as ProductStatus) : "PENDING";
  const snap = (body.snapshot ?? {}) as Record<string, unknown>;
  const product_name =
    typeof snap.title === "string" && snap.title.trim()
      ? snap.title.trim().slice(0, 500)
      : "Sản phẩm (không đọc được tên)";
  const image_url =
    typeof snap.image === "string" && /^https?:\/\//i.test(snap.image) ? snap.image.slice(0, 2048) : null;
  const priceRaw = snap.price;
  const price =
    typeof priceRaw === "number" && Number.isFinite(priceRaw) && priceRaw >= 0
      ? Math.round(priceRaw * 100) / 100
      : null;
  const price_label =
    typeof snap.price_label === "string" && snap.price_label.trim()
      ? snap.price_label.trim().slice(0, 80)
      : null;
  let category_id: string | null =
    typeof body.category_id === "string" && body.category_id ? body.category_id : null;

  // đảm bảo category thuộc về user này (RLS cũng chặn, đây là validate)
  if (category_id) {
    const { data: cat } = await supabase.from("categories").select("id").eq("id", category_id).eq("user_id", user.id).maybeSingle();
    if (!cat) category_id = null;
  }

  // duplicate theo URL đã chuẩn hóa (spec §30)
  const { data: existing } = await supabase
    .from("products")
    .select("*, category:categories(id,name)")
    .eq("user_id", user.id)
    .limit(500);
  const dup = (existing as Product[] | null)?.find(
    (p) =>
      normalizeUrl(p.source_url) === normalizeUrl(sourceUrl) ||
      (!!safePath(sourceUrl) && new URL(p.source_url, "http://x").pathname === safePath(sourceUrl))
  );
  if (dup) {
    return Response.json(
      { code: "DUPLICATE", message: "Sản phẩm này đã được lưu.", product: dup },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      user_id: user.id,
      source_url: sourceUrl,
      marketplace: typeof snap.marketplace === "string" ? String(snap.marketplace) : detectMarketplace(sourceUrl),
      image_url,
      product_name,
      price,
      price_label,
      status,
      category_id,
    })
    .select("*, category:categories(id,name)")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: p } = await supabase
        .from("products")
        .select("*, category:categories(id,name)")
        .eq("source_url", sourceUrl)
        .maybeSingle();
      return Response.json(
        { code: "DUPLICATE", message: "Sản phẩm này đã được lưu.", product: p },
        { status: 409 }
      );
    }
    return jsonError(500, "DB", "Không thể lưu sản phẩm. Vui lòng thử lại.");
  }
  return Response.json({ product: data as Product }, { status: 201 });
}

function safePath(u: string): string {
  try {
    return new URL(u).pathname;
  } catch {
    return "";
  }
}


export const GET = route(__GET);
export const POST = route(__POST);
