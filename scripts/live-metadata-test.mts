/**
 * Test LIVE end-to-end của engine metadata — chạy thật gọi mạng.
 * `npx tsx scripts/live-metadata-test.mts`
 * Không phải unit test (phụ thuộc mạng); dùng để xác nhận hành vi trên máy thật.
 */
import { fetchMetadata } from "../lib/metadata/service";

const CASES: Array<[string, string]> = [
  ["share text + slug Shopee (dạng link Chia sẻ từ app)", 'Siêu Sale 9.9! MŨ-LƯỠI-TRAI-NAM-CAO-CẤP-CHỐNG-NẮNG-i.176103579.11446449426 https://shopee.vn/MŨ-LƯỠI-TRAI-NAM-CAO-CẤP-CHỐNG-NẮNG-i.176103579.11446449426 bấm mua ngay kẻo lỡ'],
  ["slug Shopee thuần", "https://shopee.vn/ÁO-THUN-NAM-COTTON-CAO-CẤP-i.29868329.18120867249"],
  ["/product/a/b không slug", "https://shopee.vn/product/176103579/11446449426"],
  ["link rút gọn s.shopee.vn (sẽ fail DNS-mock nhưng phải xử lý sạch)", "https://s.shopee.vn/8UdlYhZ0d6"],
  [" Lazada slug", "https://www.lazada.vn/tag/o-luoi-trai-nam-khong.html"],
  ["không phải link", "hổng có link đâu em"],
];

let fail = 0;
for (const [name, input] of CASES) {
  const t0 = Date.now();
  let out: string;
  try {
    const r = await Promise.race([
      fetchMetadata(input),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("WALLCLOCK > 25s")), 25_000)),
    ]);
    out = JSON.stringify(r);
  } catch (e) {
    out = "CRASH: " + (e as Error).message;
    fail++;
  }
  const ms = Date.now() - t0;
  console.log(`\n▶ ${name}  (${ms}ms)\n  ${out.slice(0, 400)}`);
  if (ms > 25_000) fail++;
}
// case cuối được phép ok:false với message hướng dẫn — miễn không crash
console.log(fail === 0 ? "\nLIVE RESULT: không crash, mọi case về trong giờ ✔" : `\nLIVE RESULT: ${fail} vấn đề ✘`);
process.exit(fail ? 1 : 0);
