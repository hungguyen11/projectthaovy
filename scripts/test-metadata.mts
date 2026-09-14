/**
 * Unit test cho engine metadata (không cần mạng): chạy `npm run test:metadata`.
 * Kiểm tra: Open Graph, Twitter Card, JSON-LD, giá range, không bịa giá, chống SSRF.
 */
import assert from "node:assert/strict";
import { parseMetadata, parsePriceString } from "../lib/metadata/parse";
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
    assert.equal(r.price, 299000);
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

console.log(`\nRESULT: all ${n} metadata/ssrf tests passed ✔`);
