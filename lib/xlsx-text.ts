/** CHỈ route server (/api/products/bulk-parse) được import file này — có require("xlsx"), không dùng phía client. */

/** Chỉ dùng phía server (route /api/products/bulk-parse). client KHÔNG được import file này. */
export function spreadsheetToText(buf: Buffer): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const XLSX = require("xlsx") as typeof import("xlsx");
  const wb = XLSX.read(buf, { type: "buffer" });
  const lines: string[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name] as import("xlsx").WorkSheet;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: "" });
    for (const r of rows) for (const cell of r) {
      const v = String(cell ?? "").trim();
      if (v) lines.push(v);
    }
  }
  return lines.join("\n");
}
