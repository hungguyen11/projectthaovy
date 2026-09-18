import { NextRequest } from "next/server";
import { requireAdmin, jsonError, route } from "@/lib/session";
import { isMissingOwnerNote } from "@/lib/db-compat";
import { rateLimit } from "@/lib/rate-limit";
import { fetchMetadata } from "@/lib/metadata/service";
import { draftOwnerNote } from "@/lib/review-gen";

export const runtime = "nodejs"; // cần node:dns cho SSRF guard
export const maxDuration = 30; // trang sàn chậm — giống /api/metadata

/**
 * POST /api/products/:id/price — "đồng bộ giá + câu mách" cho TỪNG sản phẩm:
 *   1) server tự fetch lại link gốc bằng engine metadata (link Shopee/TikTok…);
 *   2) lấy được giá → cập nhật price/price_label (giá khoảng → lấy số CAO NHẤT, spec 2026-09);
 *   3) sản phẩm CHƯA có câu mách (owner_note trống) → tự soạn NHÁP từ tên + danh mục;
 *      admin duyệt/sửa lại trong Chi tiết bất cứ lúc nào;
 *   4) không lấy được giá / sàn chặn → updated:false + lý do, GIỮ nguyên giá cũ (không bịa).
 * Chỉ ADMIN gọi được, chỉ đụng sản phẩm của chính mình. Có rate-limit chống spam.
 * © _hngnguynn_
 */
async function __POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireAdmin();
  const { id } = await ctx.params;
  if (!id) return jsonError(400, "BAD_ID", "ID sản phẩm không hợp lệ.");

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`prsync:${user.id}:${ip}`, 120, 60_000))
    return jsonError(429, "RATE_LIMITED", "Đồng bộ nhanh quá — chờ một phút rồi bấm tiếp nhé.");

  // (1) đọc món hàng — KHÔNG select owner_note ở đây để không sập trên DB cũ chưa có cột
  const { data: row, error: rowErr } = await supabase
    .from("products")
    .select("id, source_url, price, price_label, product_name, category:categories(name)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (rowErr) return jsonError(500, "DB", "DB lỗi khi đọc sản phẩm: " + String(rowErr.message).slice(0, 120));
  if (!row) return jsonError(404, "NOT_FOUND", "Không tìm thấy sản phẩm.");

  // (2) câu mách hiện có? (thăm dò riêng — DB cũ chưa có cột thì coi như trống)
  let existingNote: string | null = null;
  let noteColumnOk = true;
  {
    const r = await supabase.from("products").select("owner_note").eq("id", id).maybeSingle();
    if (r.error) noteColumnOk = !isMissingOwnerNote(r.error);
    else existingNote = typeof r.data?.owner_note === "string" ? r.data.owner_note.trim() || null : null;
  }

  // (3) fetch lại metadata từ link gốc
  type Meta = { price?: unknown; price_label?: unknown; title?: unknown };
  type MetaRes = { ok: boolean; data?: Meta; code?: string; message?: string };
  let meta: MetaRes | null = null;
  try {
    meta = (await fetchMetadata(String(row.source_url ?? "").slice(0, 2000))) as unknown as MetaRes;
  } catch (e) {
    meta = { ok: false, code: "NETWORK", message: e instanceof Error ? e.message : "fetch thất bại" };
  }

  const d = meta?.ok ? (meta?.data as Meta | undefined) : undefined;
  const newPrice =
    typeof d?.price === "number" && Number.isFinite(d.price) && d.price >= 0 ? Math.round(d.price * 100) / 100 : null;
  const newLabel =
    typeof d?.price_label === "string" && d.price_label.trim() ? d.price_label.trim().slice(0, 80) : null;

  // (4) câu mách nháp — chỉ khi món chưa có câu nào
  const draftNote =
    noteColumnOk && !existingNote
      ? draftOwnerNote({
          title: String(
            (typeof d?.title === "string" && d.title.trim()) || row.product_name || ""
          ),
          category: (row.category as { name?: string } | null)?.name ?? null,
          priceLabel: newLabel ?? (typeof row.price_label === "string" ? row.price_label : null),
        })
      : null;

  const update: Record<string, unknown> = {};
  if (newPrice != null || newLabel) {
    update.price = newPrice;
    update.price_label = newLabel;
  }
  if (draftNote) update.owner_note = draftNote.slice(0, 240);

  if (!Object.keys(update).length) {
    // không có gì mới: giá không đổi và đã có note
    if (meta?.ok && newPrice == null && !newLabel) {
      return Response.json({
        updated: false,
        reason: "NO_PRICE",
        detail: "sàn không trả giá dạng số — giữ nguyên dữ liệu cũ",
        product: row,
      });
    }
    return Response.json({
      updated: false,
      reason: meta?.ok ? "SAME" : (meta?.code ?? "FETCH_FAILED"),
      detail: meta?.ok ? "giá không đổi, không có gì mới" : String(meta?.message ?? "sàn chặn").slice(0, 140),
      product: row,
    });
  }

  // (5) ghi DB — nếu thiếu cột owner_note giữa chừng → bỏ note, vẫn lưu giá
  let { data: product, error } = await supabase
    .from("products")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*, category:categories(id,name)")
    .maybeSingle();

  if (error && isMissingOwnerNote(error) && "owner_note" in update) {
    delete update.owner_note;
    ({ data: product, error } = await supabase
      .from("products")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*, category:categories(id,name)")
      .maybeSingle());
  }

  if (error) {
    return Response.json(
      {
        updated: false,
        reason: "DB",
        detail: "Không lưu được: " + String((error as { message?: string }).message ?? "").slice(0, 140),
        product: row,
      },
      { status: 200 } // trả 200 + reason để modal hiện đúng nguyên nhân thay vì sập 500
    );
  }
  if (!product) return jsonError(404, "NOT_FOUND", "Không tìm thấy sản phẩm.");

  return Response.json({
    updated: true,
    product,
    priceChanged: update.price != null || update.price_label != null,
    old_price: row.price,
    old_label: row.price_label,
    noteAdded: !!update.owner_note,
    noteDraft: typeof update.owner_note === "string" ? update.owner_note : null,
  });
}

export const POST = route(__POST);
