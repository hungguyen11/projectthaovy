/**
 * Shopee nhúng trạng thái sản phẩm (PDP_BFF_DATA) thẳng vào HTML của
 * https://shopee.vn/product/<shop>/<item> — máy chủ ngoài vẫn đọc được (không bị
 * tường API chặn). Từ đây lấy được TÊN THẬT + ẢNH THẬT của sản phẩm.
 * Giá KHÔNG nằm trong state (chỉ có trong API cần session) — để người dùng nhập.
 * © _hngnguynn_
 */

export interface ShopeeState {
  title: string | null;
  image: string | null;
  images: string[];
  shopName: string | null;
  shopLocation: string | null;
  itemStatus: string | null;
}

const CDN = "https://down-vn.img.susercontent.com/file/";

function jsonStr(s: string): string {
  try {
    return JSON.parse(`"${s}"`) as string;
  } catch {
    return s.replace(/\\"/g, '"').replace(/\\n/g, " ").replace(/\\+/g, "\\");
  }
}

function grab(seg: string, re: RegExp): string | null {
  const m = seg.match(re);
  return m ? m[1] : null;
}

/**
 * @param html   nội dung trang (có thể bị cắt bớt — state nằm đầu trang)
 * @param shopId itemId — để tìm đúng key "shop/item" trong cachedMap (tuỳ chọn)
 */
export function parseShopeeState(html: string, shopId?: string, itemId?: string): ShopeeState | null {
  if (!html || html.length < 20_000) return null;
  let idx = -1;
  if (shopId && itemId) {
    idx = html.indexOf(`"${shopId}/${itemId}":{"item":`);
    if (idx < 0) idx = html.indexOf(`"${shopId}/${itemId}":{`);
  }
  if (idx < 0) {
    const m = html.match(/"cachedMap":\s*\{\s*"\d+\/\d+":\s*\{\s*"item"\s*:/);
    if (m && m.index != null) idx = m.index;
  }
  if (idx < 0) {
    idx = html.indexOf("PDP_BFF_DATA");
  }
  if (idx < 0) return null;

  const seg = html.slice(idx, idx + 12_000);
  const title = grab(seg, /"title"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const imageId = grab(seg, /"image"\s*:\s*"([a-zA-Z0-9_-]{8,64})"/);
  const imagesRaw = grab(seg, /"images"\s*:\s*\[([^\]]{0,800})\]/);
  const shopName = grab(seg, /"shop"\s*:\s*\{[^{}]*?"name"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const shopLocation = grab(seg, /"shop_location"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const itemStatus = grab(seg, /"item_status"\s*:\s*"([a-z_]+)"/);

  const images: string[] = [];
  if (imagesRaw) {
    for (const m of imagesRaw.matchAll(/"([a-zA-Z0-9_-]{8,64})"/g)) {
      if (images.length < 5) images.push(CDN + m[1]);
    }
  }
  const image = imageId ? CDN + imageId : images[0] ?? null;

  if (!title && !image) return null;
  return {
    title: title ? jsonStr(title).slice(0, 200) : null,
    image,
    images,
    shopName: shopName ? jsonStr(shopName).slice(0, 120) : null,
    shopLocation: shopLocation ? jsonStr(shopLocation) : null,
    itemStatus: itemStatus ?? null,
  };
}
