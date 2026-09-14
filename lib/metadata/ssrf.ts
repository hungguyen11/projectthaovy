/**
 * Chống SSRF cho /api/metadata (spec §22).
 * - Chỉ cho phép http/https.
 * - Cấm localhost, IP riêng (private/link-local/loopback/unique-local…),
 *   metadata endpoint (169.254.169.254, metadata.google.internal…).
 * - Phân giải DNS và kiểm tra MỌI IP trỏ tới; kiểm lại ở mỗi hop redirect.
 */
import { promises as dns } from "node:dns";
import net from "node:net";

export class SsrfError extends Error {
  code = "SSRF_BLOCKED" as const;
  constructor(message = "Đường dẫn không được phép.") {
    super(message);
    this.name = "SsrfError";
  }
}

type LookupFn = (host: string, opts: { all: true }) => Promise<Array<{ address: string }>>;

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata",
  "metadata.google.internal",
  "instance-data",
]);

function ip6ToBigInt(v: string): bigint | null {
  const orig = v.toLowerCase().trim();
  v = orig.replace(/^\[/, "").replace(/\]$/, "").split("%")[0];
  const dbl = v.indexOf("::");
  let head = v, tail = "";
  if (dbl >= 0) {
    head = v.slice(0, dbl);
    tail = v.slice(dbl + 2);
  } else if (v.split(":").length !== 8 && !v.includes(".")) {
    return null;
  }
  const toGroups = (g: string): string[] | null => {
    if (g.includes(".")) {
      const p = g.split(".").map(Number);
      if (p.length !== 4 || p.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return null;
      const hi = ((p[0] << 8) | p[1]).toString(16);
      const lo = ((p[2] << 8) | p[3]).toString(16);
      return [hi.padStart(4, "0"), lo.padStart(4, "0")];
    }
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    return [g.padStart(4, "0")];
  };
  const expand = (s2: string): string[] | null => {
    if (s2 === "") return [];
    const out: string[] = [];
    for (const g of s2.split(":")) {
      const e = toGroups(g);
      if (!e) return null;
      out.push(...e);
    }
    return out;
  };
  const headG = dbl >= 0 || v.split(":").length === 8 ? expand(head) : expand(head);
  if (!headG) return null;
  let groups = headG;
  if (dbl >= 0) {
    const tailG = expand(tail);
    if (!tailG) return null;
    const missing = 8 - headG.length - tailG.length;
    if (missing < 0) return null;
    groups = [...headG, ...Array<string>(missing).fill("0000"), ...tailG];
  }
  if (groups.length !== 8) return null;
  try {
    return BigInt("0x" + groups.join(""));
  } catch {
    return null;
  }
}

export function isPrivateIp(ip: string): boolean {
  const h = ip.replace(/^\[/, "").replace(/\]$/, "");
  const kind = net.isIP(h);
  if (kind === 4) {
    const parts = h.split(".").map(Number);
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true; // this-network / private / loopback
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmark
    if (a === 192 && b === 0) return true; // 0.0 / 64:44 / 169
    if (a >= 224) return true; // multicast + reserved
    return false;
  }
  if (kind === 6) {
    const n = ip6ToBigInt(h);
    if (n === null) return true; // không parse được → chặn để an toàn
    if (n === 0n || n === 1n) return true; // unspecified + loopback (::1, [::1], 0:0:…:1)
    if (n >> 32n === 0xffffn) {
      // IPv4-mapped (::ffff:a.b.c.d) → trích IPv4 rồi áp đúng bộ luật IPv4
      const low = Number(n & 0xffffffffn);
      const ip4 = [(low >>> 24) & 255, (low >>> 16) & 255, (low >>> 8) & 255, low & 255].join(".");
      return isPrivateIp(ip4);
    }
    if (n >> 121n === 0x7en) return true; // fc00::/7 unique-local
    if (n >> 118n === 0x3fan) return true; // fe80::/10 link-local
    if (n >> 120n === 0xffn) return true; // ff00::/8 multicast
    return false;
  }
  return true; // không phải IP hợp lệ → chặn ở tầng hostname
}

export function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (!h) return true;
  if (BLOCKED_HOSTS.has(h)) return true;
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) return true;
  if (net.isIP(h.replace(/^\[/, "").replace(/\]$/, ""))) return isPrivateIp(h);
  return false;
}

export interface SafeUrl {
  url: URL;
  raw: string;
}

/** Parse + validate hình thức URL (chưa chạm mạng). */
export function validateUrl(raw: string): SafeUrl {
  let u: URL;
  try {
    u = new URL(String(raw).trim());
  } catch {
    throw new SsrfError("Đường dẫn không hợp lệ.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new SsrfError("Chỉ hỗ trợ link bắt đầu bằng http:// hoặc https://.");
  }
  if (u.username || u.password) throw new SsrfError("Đường dẫn không hợp lệ.");
  if (isBlockedHostname(u.hostname)) {
    throw new SsrfError("Đường dẫn trỏ tới địa chỉ nội bộ nên bị chặn.");
  }
  return { url: u, raw: u.toString() };
}

/** Kiểm tra DNS: mọi A/AAAA record phải là IP công khai. */
export async function assertPublicDns(
  hostname: string,
  lookup: LookupFn = ((h: string, o: { all: true }) => dns.lookup(h, o)) as unknown as LookupFn
): Promise<void> {
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new SsrfError("Địa chỉ IP nội bộ bị chặn.");
    return;
  }
  let records: Array<{ address: string }>;
  try {
    records = await lookup(hostname, { all: true });
  } catch {
    throw new SsrfError("Không phân giải được tên miền — vui lòng thử lại.");
  }
  if (!records.length) throw new SsrfError("Không phân giải được tên miền.");
  for (const r of records) {
    if (isPrivateIp(r.address)) {
      throw new SsrfError("Tên miền trỏ tới địa chỉ nội bộ nên bị chặn.");
    }
  }
}
