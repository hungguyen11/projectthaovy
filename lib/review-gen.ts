/**
 * lib/review-gen.ts — Soạn NHÁP câu "chủ list mách" từ thông tin sản phẩm.
 * - Rule-based thuần (nhận diện loại món đồ qua từ khóa tên + danh mục), chạy ở client,
 *   không AI, không gọi mạng, không bịa thông số — chỉ tạo GIỌNG VĂN để admin sửa/duyệt.
 * - Câu hiển thị công khai là câu admin đã xác nhận, dưới danh nghĩa chủ list.
 * © _hngnguynn_
 */

interface Kind {
  re: RegExp;
  label: string;
  praise: string[];
}

/** bỏ dấu để match từ khóa (tai nghe ↔ tai nghe) */
function deacc(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

const KINDS: Kind[] = [
  { re: /ta\s?y? ?trang|micellar|makeup remover|nuoc ta\b/, label: "nước tẩy trang", praise: ["lau sạch kem chống nắng cả ngày, không cay mắt", "một miếng là sạch, da không khô căng sau đó"] },
  { re: /sua rua mat|cleanser|rua mat/, label: "sữa rửa mặt", praise: ["bọt mịn, rửa xong da dịu mà sạch sâu", "kiên trì sáng-tối là lỗ chân lông thoáng hẳn"] },
  { re: /toner|nuoc can bang/, label: "em toner", praise: ["vỗ lên là da dịu ngay, cấp ẩm nhẹ vừa đủ"] },
  { re: /retinol|tretinoin|tretin|diffacin|kem tri|dac tri|\bmun\b|acne|đặc trị|mụn/, label: "kem đặc trị", praise: ["kiên trì 3-4 tuần là thấy khác, nhớ chống nắng kỹ", "giai đoạn đầu hơi khô da rồi quen, chấm đúng điểm mụn"] },
  { re: /ta(?:y)? bao chet|te bao chet|peeling|scrub|exfoliat|\baha\b|\bbha\b/, label: "tẩy da chết", praise: ["1-2 lần/tuần da mịn hẳn, không rát", "đừng tham số, 2 lần/tuần là đủ đẹp"] },
  { re: /serum|tinh chat|ampoule|vitamin c|niacinamide/, label: "em serum", praise: ["thấm nhanh, sáng dậy da mướt hơn hẳn", "kiên trì 2 tuần là thấy khác"] },
  { re: /kem duong am|moisturizer|duong am|cream\b/, label: "kem dưỡng ẩm", praise: ["khóa ẩm ổn, sáng dậy da mềm, không bết", "chất kem mỏng nhẹ, dùng kèm các bước khác không bị vón"] },
  { re: /chong nang|sunscreen|spf|sunstick/, label: "kem chống nắng", praise: ["không nâng tone, không bết, đủ cho cả ngày dài", "thoa lại giữa ngày dễ, không trắng bệch"] },
  { re: /nuoc hoa|perfume|fragrance/, label: "mùi hương", praise: ["thơm dịu mà bám lâu, tới chiều vẫn còn phảng phất", "lên mùi sang, không gắt mũi", "xịt 2 tia là đủ thơm nhẹ cả ngày"] },
  { re: /\bson\b|lipstick|lip balm|moi\b/, label: "em son", praise: ["màu lên chuẩn như swatch, môi không khô", "chất mượt, đánh lòng môi xinh lắm"] },
  { re: /serum|kem duong|chong nang|mat na|rua mat|skincare/, label: "em skincare", praise: ["thấm nhanh, sáng dậy da mềm hơn hẳn", "không bết rít, da dầu dùng ổn áp"] },
  { re: /tai nghe|headphone|earbuds|earphone|airpods/, label: "con tai nghe", praise: ["nghe nhạc ấm, chống ồn ổn áp", "đeo cả buổi không đau tai", "gọi video bên kia nghe rõ, không lẫn tiếng"] },
  { re: /ban phim|keyboard/, label: "con bàn phím", praise: ["gõ đanh tay, làm cả buổi không mỏi", "nhận máy cái rẹt, không trễ tín hiệu"] },
  { re: /man hinh|monitor/, label: "con màn hình", praise: ["màu lên nịnh mắt, nhìn lâu vẫn dễ chịu", "rõ nét, chia đôi màn hình làm việc thoải mái"] },
  { re: /dien thoai|iphone|xiaomi|galaxy|smartphone/, label: "dế mới", praise: ["chạy mượt, nặng nhẹ có hạn mức nhưng mình chịu được", "sáng tới tối pin còn dư, đỡ phải mang sạc"] },
  { re: /laptop|macbook/, label: "máy mới", praise: ["mở máy là làm việc liền, không phải chờ", "mỏng nhẹ, bỏ balo mang ra cafe vô tư"] },
  { re: /noi chien|chiên không dầu/, label: "nồi chiên", praise: ["đồ chiên giòn mà nhẹ bụng, vệ sinh cũng nhanh", "nhanh gọn, nhà nhỏ dùng rất hợp"] },
  { re: /may xay|blender/, label: "máy xay", praise: ["xay mịn, sáng nào cũng làm được ly sinh tố"] },
  { re: /ca phe|coffee|may pha/, label: "món cà phê", praise: ["pha ra ly thơm, sáng nào cũng tỉnh cả người", "hơi tốn công vệ sinh tí nhưng đáng"] },
  { re: /hut bui|vacuum/, label: "robot hút bụi", praise: ["đi quanh nhà sạch bong, tóc mèo cũng ăn hết", "tự về dock, mình chỉ việc nhìn"] },
  { re: /chair|\bghe\b/, label: "cái ghế", praise: ["ngồi liền 2 buổi không ê lưng, lưới thoáng", "hơi nhiều chỗ để chỉnh, chỉnh xong là êm như ý"] },
  { re: /den ban|mijia|led\b/, label: "đèn bàn", praise: ["sáng đều, ánh vàng dịu, học khuya không mỏi mắt"] },
  { re: /\bsach\b|novel|ebook|habits/, label: "trang sách", praise: ["đọc cuốn, mình ngốn hết trong 2 tối", "mua về không ngại đọc lại lần 2"] },
  { re: /giay|sneaker|shoes/, label: "đôi giày", praise: ["form chuẩn, đi cả ngày không phồng chân", "đế êm, phối đồ dễ"] },
  { re: /\bao\b|\bquan\b|\bvay\b|dress|ao thun/, label: "món đồ", praise: ["vải mát, form đúng như ảnh, lên đồ xinh", "đường may kỹ, không dư chỉ"] },
  { re: /balo|backpack|\btui\b|xach/, label: "cái túi", praise: ["ngăn nhiều, khóa mượt, laptop để vừa khít", "form đứng, đeo lên người xinh hơn ảnh"] },
  { re: /dong ho|watch/, label: "cái đồng hồ", praise: ["hiện số sắc nét, pin trâu hơn mình tưởng", "đeo lên form cổ tay xinh"] },
  { re: /binh nuoc|giu nhiet|tumbler/, label: "bình nước", praise: ["giữ đá từ sáng tới chiều vẫn còn lách cách"] },
  { re: /quat\b|\bfan\b/, label: "cái quạt", praise: ["mát sâu, số nhỏ là đủ ngủ, số to kêu hơn tí"] },
];

const DEFAULT_PRAISE = ["dáng nhỏ gọn mà có võ", "ổn so với mấy món mình từng mua", "dùng rồi thấy hợp gu nên mách lại"];
const CTAS = ["mấy bà dùng thử nha", "đáng cho vô list sớm á", "ai đang phân vân thì mình xác nhận: chốt được", "mình xài thiệt mới mách, không quảng cáo mô", "thấy hợp thì múc lẹ, đừng để hết deal"];
const CONS = ["chờ giao hơi lâu tí", "hộp hơi giản dị, bù đồ bên trong chỉn chu", "mình mua trễ hơn đợt sale, ai săn được giá hời thì càng vui"];
const OPENERS = [
  "{K} này mình dùng ổn nè — {P}.",
  "Vừa rước {K} về được vài hôm, {P}.",
  "Thật lòng thì {K} này đáng tiền: {P}.",
  "Hỏi {K} hả — {P}, mình duyệt.",
  "Mình xài {K} này rồi, {P}.",
];

/** Câu "tagline viết tay" ngắn cho góc ảnh sản phẩm (theo mockup pop-up).
 *  null = không nhận diện được loại → app ẩn tagline, không bịa cho có. */
const CATCHPHRASES: Array<[RegExp, string]> = [
  [/ta\s?y? ?trang|micellar|makeup remover/, "Sạch sâu, không cay mắt"],
  [/sua rua mat|rua mat|cleanser/, "Rửa xong không khô căng"],
  [/toner|nuoc can bang/, "Dịu da tức thì"],
  [/retinol|tretinoin|diffacin|kem tri|dac tri|\bmun\b|acne/, "Chân ái da mụn"],
  [/ta(?:y)? bao chet|te bao chet|peeling|scrub|exfoliat|\baha\b|\bbha\b/, "Lỗ chân lông thoáng hẳn"],
  [/serum|tinh chat|ampoule/, "Thấm nhanh, da mướt"],
  [/kem duong am|moisturizer|duong am/, "Khóa ẩm cả đêm"],
  [/chong nang|sunscreen|spf/, "Không bết, không nâng tone"],
  [/mat na|mask/, "Cấp ẩm cấp tốc"],
  [/tai nghe|headphone|earbuds|airpods/, "Âm thanh cực hay"],
  [/nuoc hoa|perfume|fragrance/, "Thơm cả ngày không rời"],
  [/\bson\b|lipstick/, "Lên màu xinh xỉu"],
  [/serum|kem duong|chong nang|skincare|mat na/, "Da mướt thấy rõ"],
  [/noi chien/, "Chiên giòn, không lo dầu mỡ"],
  [/ban phim|keyboard/, "Gõ là ghiền"],
  [/man hinh|monitor/, "Nhìn là mê"],
  [/dien thoai|iphone|galaxy|laptop|macbook/, "Mượt từng chạm"],
  [/\bghe\b|chair/, "Ngồi êm cả ngày"],
  [/den ban|mijia|led\b/, "Sáng dịu mắt"],
  [/\bsach\b|novel|ebook|habits/, "Đọc một mạch tới khuya"],
  [/giay|sneaker/, "Đi nhẹ như bay"],
  [/balo|backpack|\btui\b|xach/, "Xinh hơn ngoài ảnh"],
  [/dong ho|watch/, "Lên tay là sang"],
  [/hut bui|vacuum/, "Nhà sạch bong, không cần đụng tay"],
  [/ca phe|coffee|may pha/, "Cà phê ngon như quán"],
  [/binh nuoc|giu nhiet|tumbler/, "Giữ đá tới chiều"],
];

export function draftCatchphrase(o: { title?: string | null; category?: string | null }): string | null {
  const hay = deacc(`${o.title || ""} ${o.category || ""}`);
  for (const [re, s] of CATCHPHRASES) if (re.test(hay)) return s;
  return null;
}

/**
 * Soạn NHÁP câu ≤ 240 ký tự. Cùng 1 tên + cùng variant → cùng 1 câu (ổn định),
 * bấm "Viết lại" (variant+1) → câu khác để chọn.
 */
export function draftOwnerNote(o: {
  title?: string | null;
  category?: string | null;
  priceLabel?: string | null;
  variant?: number;
}): string {
  const title = (o.title || "").replace(/\s+/g, " ").trim();
  const hay = deacc(`${title} ${o.category || ""}`);
  const kind = KINDS.find((k) => k.re.test(hay));

  let h = 2166136261;
  const seed = `${title}#${o.variant ?? 0}`;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const pick = <T,>(arr: T[], shift: number): T => arr[(h >>> shift) % arr.length];

  const praise = kind ? pick(kind.praise, 3) : pick(DEFAULT_PRAISE, 3);
  const label = kind?.label ?? (title ? "món này" : "món đồ này");
  let out = pick(OPENERS, 5).replace("{K}", label).replace("{P}", praise);
  if ((h >>> 8) % 3 === 0) out += ` ${pick(CONS, 10)}.`;
  const pl = (o.priceLabel || "").trim();
  if (pl && (h >>> 12) % 2 === 0) out += ` Giá ${pl} mà vậy là đáng.`;
  out += ` ${pick(CTAS, 7)}.`;
  out = out.replace(/\s+/g, " ").trim();
  if (out.length > 240) out = out.slice(0, 236).replace(/\S*$/, "").trim() + "…";
  return out;
}
