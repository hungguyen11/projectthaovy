import { requireUser, jsonError, route } from "@/lib/session";
import { extractLinks, MAX_LINKS } from "@/lib/extract-links";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 2.5 * 1024 * 1024; // file 2.5MB đổ lại

/**
 * POST /api/products/bulk-parse { name, data_b64 }
 * Nhận file Excel/CSV/TXT (base64) → trích danh sách link sản phẩm (đã khử trùng, tối đa 300).
 * KHÔNG chạm DB — client sẽ lần lượt gửi từng link qua /api/metadata + /api/products.
 */
async function __POST(request: Request) {
  await requireUser();
  let body: { name?: unknown; data_b64?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError(400, "BAD_JSON", "Dữ liệu không hợp lệ.");
  }
  const name = typeof body.name === "string" ? body.name.toLowerCase() : "";
  const b64 = typeof body.data_b64 === "string" ? body.data_b64 : "";
  if (!b64) return jsonError(400, "EMPTY_FILE", "File trống.");

  let buf: Buffer;
  try {
    buf = Buffer.from(b64, "base64");
  } catch {
    return jsonError(400, "BAD_FILE", "Không đọc được file.");
  }
  if (buf.length === 0 || buf.length > MAX_BYTES) {
    return jsonError(400, "BAD_SIZE", "File cần nhỏ hơn 2.5MB.");
  }

  let text = "";
  try {
    if (/\.(xlsx|xls)$/.test(name)) {
      const { spreadsheetToText } = await import("@/lib/xlsx-text");
      text = spreadsheetToText(buf);
    } else {
      text = buf.toString("utf8");
    }
  } catch {
    return jsonError(400, "BAD_PARSE", "File không đọc được — cần .xlsx, .xls, .csv hoặc .txt.");
  }

  const { links, skipped } = extractLinks(text, MAX_LINKS);
  return Response.json({ links, skipped, max: MAX_LINKS }, { headers: { "Cache-Control": "no-store" } });
}

export const POST = route(__POST);
