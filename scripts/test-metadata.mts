/**
 * Unit test cho engine metadata (không cần mạng): chạy `npm run test:metadata`.
 * Kiểm tra: Open Graph, Twitter Card, JSON-LD, giá range, không bịa giá, chống SSRF.
 */
import assert from "node:assert/strict";
import { parseMetadata, parsePriceString } from "../lib/metadata/parse";
import { parseShopee, parseTikTok, titleFromSlug, extractFirstUrl, isShortLink } from "../lib/metadata/link";
import { extractPrices, parseRss } from "../lib/metadata/serp";
import { parseShopeeState } from "../lib/metadata/state";
import { isPrivateIp, isBlockedHostname, validateUrl, assertPublicDns, SsrfError } from "../lib/metadata/ssrf";

let n = 0;
const ok = (name: string, fn: () => void | Promise<void>) => async () => {
  await fn();
  n++;
  console.log("  ✓", name);
};

const BASE = "https://shopee.vn/product/123/456";

/* ── parse: Open Graph ── */
await ok(
  "OG title + image + price",
  () => {
    const html = `<!doctype html><html><head>
      <meta property="og:title" content="Giày sneaker nữ basic - Shopee Việt Nam" />
      <meta property="og:image" content="https://cf.shopee.vn/file/abc.jpg" />
      </head><body>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Giày","offers":{"@type":"AggregateOffer","lowPrice":"299000","highPrice":"499000","priceCurrency":"VND"}}</script>
      </body></html>`;
    const r = parseMetadata(html, BASE);
    assert.equal(r.title, "Giày sneaker nữ basic");
    assert.equal(r.image, "https://cf.shopee.vn/file/abc.jpg");
    assert.equal(r.price, 499000); // range → lấy số cao nhất (spec 2026-09)
    assert.equal(r.price_label, "299.000đ – 499.000đ");
  }
)();

/* ── parse: JSON-LD only ── */
await ok(
  "JSON-LD product single price",
  () => {
    const html = `<html><head><title>Trang sản phẩm | TikTok Shop</title></head><body>
      <script type="application/ld+json">{"@type":"Product","name":"Tai nghe Bluetooth","image":["https://x.com/a.png"],"offers":{"price":"699000","priceCurrency":"VND"}}</script>
      </body></html>`;
    const r = parseMetadata(html, "https://www.tiktok.com/shop/pdp/123");
    assert.equal(r.title, "Tai nghe Bluetooth");
    assert.equal(r.image, "https://x.com/a.png");
    assert.equal(r.price, 699000);
    assert.equal(r.price_label, "699.000đ");
  }
)();

/* ── parse: itemprop + text fallback ── */
await ok(
  "fallback: itemprop price + og:image relative",
  () => {
    const html = `<html><head><meta property="og:image" content="/images/p/1.jpg"><meta property="og:title" content="Áo thun" /></head>
      <body><div itemscope itemtype="http://schema.org/Product"><span itemprop="price" content="149000">149.000₫</span></div></body></html>`;
    const r = parseMetadata(html, BASE);
    assert.equal(r.title, "Áo thun");
    assert.equal(r.image, "https://shopee.vn/images/p/1.jpg");
    assert.equal(r.price, 149000);
  }
)();

/* ── parse: no price → null, KHÔNG bịa ── */
await ok(
  "no price anywhere → null",
  () => {
    const r = parseMetadata(`<html><head><meta property="og:title" content="Món này"></head><body>x</body></html>`, BASE);
    assert.equal(r.price, null);
    assert.equal(r.price_label, null);
    assert.equal(r.image, null);
  }
)();

await ok(
  "parsePriceString formats",
  () => {
    assert.equal(parsePriceString("1.299.000₫"), 1299000);
    assert.equal(parsePriceString("VND 899,000"), 899000);
    assert.equal(parsePriceString("129000"), 129000);
    assert.equal(parsePriceString("79.00"), 79); // "79.00" not a valid VND thousands format → conservative 79
    assert.equal(parsePriceString(null), null);
    assert.equal(parsePriceString("liên hệ"), null);
  }
)();

await ok(
  "handles broken JSON-LD without throwing",
  () => {
    const r = parseMetadata(
      `<html><head><meta property="og:title" content="OK"></head><body><script type="application/ld+json">{oops,,,</script></body></html>`,
      BASE
    );
    assert.equal(r.title, "OK");
  }
)();

/* ── SSRF ── */
await ok(
  "validateUrl blocks bad protocols",
  () => {
    assert.throws(() => validateUrl("javascript:alert(1)"), SsrfError);
    assert.throws(() => validateUrl("not a url"), SsrfError);
    assert.throws(() => validateUrl("http://127.0.0.1/x"), SsrfError);
    assert.throws(() => validateUrl("http://localhost:5432"), SsrfError);
    assert.throws(() => validateUrl("http://169.254.169.254/latest/meta-data/"), SsrfError);
    assert.throws(() => validateUrl("http://10.0.0.5/"), SsrfError);
    assert.throws(() => validateUrl("http://192.168.1.1/"), SsrfError);
    assert.throws(() => validateUrl("http://[::1]/"), SsrfError);
    assert.throws(() => validateUrl("http://metadata.google.internal/"), SsrfError);
    validateUrl("https://shopee.vn/abc"); // must NOT throw
    validateUrl("http://tiki.vn/abc"); // must NOT throw
  }
)();

await ok(
  "isPrivateIp covers ranges",
  () => {
    for (const ip of ["0.0.0.0", "10.1.2.3", "127.0.0.1", "169.254.1.1", "172.16.0.1", "172.31.9.9", "192.168.0.1", "224.0.0.1", "::1", "fc00::1", "fe80::2", "::ffff:10.1.1.1"])
      assert.equal(isPrivateIp(ip), true, ip + " should be private");
    for (const ip of ["8.8.8.8", "151.101.1.175", "172.15.0.1", "18.136.20.20"])
      assert.equal(isPrivateIp(ip), false, ip + " should be public");
  }
)();

await ok(
  "assertPublicDns blocks rebinding host with mock resolver",
  async () => {
    const bad = async () => [{ address: "127.0.0.1" }];
    await assert.rejects(() => assertPublicDns("evil.example", bad as never), SsrfError);
    const good = async () => [{ address: "103.5.23.100" }];
    await assertPublicDns("shopee.vn", good as never);
  }
)();

await ok(
  "blocked hostnames",
  () => {
    assert.equal(isBlockedHostname("localhost"), true);
    assert.equal(isBlockedHostname("foo.internal"), true);
    assert.equal(isBlockedHostname("127.0.0.1"), true);
    assert.equal(isBlockedHostname("shopee.vn"), false);
  }
)();

/* ── định dạng link sàn (offline) ── */
await ok(
  "parseShopee — mọi định dạng",
  () => {
    const U = (s: string) => new URL(s);
    const a = parseShopee(U("https://shopee.vn/product/176103579/11446449426?uls_trackid=x"));
    assert.equal(a?.shopId, "176103579");
    assert.equal(a?.itemId, "11446449426");
    const b = parseShopee(U("https://shopee.vn/MŨ-LƯỠI-TRAI-TIM-VÀ-FRIENDS-i.176103579.11446449426"));
    assert.equal(b?.itemId, "11446449426");
    assert.equal(titleFromSlug(b?.slug || ""), "MŨ LƯỠI TRAI TIM VÀ FRIENDS");
    const c = parseShopee(U("https://shopee.vn/i.176103579.11446449426"));
    assert.equal(c?.shopId, "176103579");
    const d = parseShopee(U("https://shopee.vn/i/176103579/11446449426"));
    assert.equal(d?.itemId, "11446449426");
    const e = parseShopee(U("https://shopee.vn/product?itemId=11446449426&shopId=176103579"));
    assert.equal(e?.itemId, "11446449426");
    const f = parseShopee(U("https://shopee.vn/product?item_id=11446449426&shop_id=176103579"));
    assert.equal(f?.shopId, "176103579");
    assert.equal(parseShopee(U("https://lazada.vn/hang-a-i.999.888.html")), null);
  }
)();

await ok(
  "parseTikTok — view/product/object_id",
  () => {
    const U = (s: string) => new URL(s);
    assert.equal(parseTikTok(U("https://shop.tiktok.com/view/product/1729419835240539605"))?.productId, "1729419835240539605");
    assert.equal(parseTikTok(U("https://www.tiktok.com/shop/p/1729419835240539605"))?.productId, "1729419835240539605");
    assert.equal(parseTikTok(U("https://www.tiktok.com/shop/product/view?object_id=1731115696550020038&region=VN"))?.productId, "1731115696550020038");
    assert.equal(parseTikTok(U("https://shopee.vn/product/1/2")), null);
  }
)();

await ok(
  "extractFirstUrl + isShortLink",
  () => {
    const share = "Siêu Sale 9.9 MŨ LƯỠI TRAI i.176103579.11446449426 https://s.shopee.vn/8UdlYhZ0d6 hãy mua đi";
    assert.equal(extractFirstUrl(share), "https://s.shopee.vn/8UdlYhZ0d6");
    assert.equal(isShortLink(new URL("https://s.shopee.vn/8UdlYhZ0d6")), true);
    assert.equal(isShortLink(new URL("https://vt.tiktok.com/ZSxABC123/")), true);
    assert.equal(isShortLink(new URL("https://shopee.vn/product/1/2")), false);
    assert.equal(extractFirstUrl("không có link gì ở đây"), null);
  }
)();

await ok(
  "extractPrices — dạng giá Việt Nam",
  () => {
    assert.equal(extractPrices("Giá chỉ 129.000₫ giảm 34%").price, 129000);
    assert.equal(extractPrices("299.000đ – 499.000đ").price, 499000); // range → cao nhất
    assert.equal(extractPrices("shop bán 1.290.000 đồng mỗi cái").price, 1290000);
    assert.equal(extractPrices("999 người đã bán").price, null); // dưới ngưỡng hàng thật
    assert.equal(extractPrices("mã 1234567 thường").price, null); // không có đơn vị
  }
)();

await ok(
  "parseRss — Bing RSS fixture",
  () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item><title>MŨ LƯỠI TRAI NAM CAO CẤP | Shopee Việt Nam</title><link>https://shopee.vn/MU-i.1.2</link><description>Giá chỉ 129.000₫ freeship toàn quốc</description></item>
      <item><title>tin linh tinh</title><description>không giá</description></item>
    </channel></rss>`;
    const hits = parseRss(xml);
    assert.equal(hits.length, 2);
    assert.equal(hits[0].title, "MŨ LƯỠI TRAI NAM CAO CẤP");
    assert.equal(hits[0].price, 129000);
    assert.equal(hits[1].price, null);
    assert.equal(parseRss("<rss>hổng có item</rss>").length, 0);
  }
)();

await ok(
  "parseShopeeState — fixture thật từ PDP_BFF_DATA",
  () => {
    const core = `"PDP_BFF_DATA":{"cachedMap":{"357915542/9024478325":{"item":{"item_id":9024478325,"shop_id":357915542,"item_status":"normal","title":"Lót chuột cỡ lớn 100 mẫu 90x40 \\"xịn\\"","image":"vn-11134201-23030-l4m6ofhrsuovca","images":["vn-imgaaa111","vn-imgbbb222"],"shop_location":"Thành phố Hà Nội"}}}}`;
    const html = "<html><head><title>Shopping Cart Icon</title></head><body>" + core + "x".repeat(30000) + "</body></html>";
    const st = parseShopeeState(html, "357915542", "9024478325");
    assert.ok(st);
    assert.equal(st!.title, 'Lót chuột cỡ lớn 100 mẫu 90x40 "xịn"');
    assert.equal(st!.image, "https://down-vn.img.susercontent.com/file/vn-11134201-23030-l4m6ofhrsuovca");
    assert.equal(st!.images.length, 2);
    assert.equal(st!.itemStatus, "normal");
    assert.equal(parseShopeeState("<html></html>"), null);
    // link affiliate dạng /opaanlp/<shop>/<item>
    const u = parseShopee(new URL("https://shopee.vn/opaanlp/357915542/9024478325?__mobile__=1&uls_trackid=x"));
    assert.equal(u?.shopId, "357915542");
    assert.equal(u?.itemId, "9024478325");
  }
)();

console.log(`\nRESULT: all ${n} metadata/ssrf tests passed ✔`);
