/* ═══════════════════════════════════════════════════════════════
   ListcuaThaoVy — Standalone Preview (no backend, no build step)
   Toàn bộ dữ liệu demo lưu trong localStorage của trình duyệt.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ───────────────── helpers ───────────────── */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const uid = () => 'id' + Math.random().toString(36).slice(2, 10);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => (n == null ? '—' : Number(n).toLocaleString('vi-VN') + 'đ');
const fmtDate = ts => new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function hash32(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ───────────────── icons (lucide-style) ───────────────── */
const P = (d, extra) => `<svg class="svgico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${extra || ''}>${d}</svg>`;
const ICONS = {
  home: P('<path d="M3 10.5 12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 0 1 3 20z"/>'),
  dashboard: P('<rect x="3" y="3" width="7.5" height="9" rx="1.8"/><rect x="13.5" y="3" width="7.5" height="5" rx="1.8"/><rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.8"/><rect x="3" y="15.5" width="7.5" height="5.5" rx="1.8"/>'),
  list: P('<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>'),
  bookmark: P('<path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>'),
  star: P('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
  heart: P('<path d="M19.8 4.6a5.24 5.24 0 0 0-7.4 0L12 5l-.4-.4a5.24 5.24 0 1 0-7.4 7.4l.4.4L12 22l7.4-9.6.4-.4a5.24 5.24 0 0 0 0-7.4z"/>'),
  heartFill: P('<path d="M19.8 4.6a5.24 5.24 0 0 0-7.4 0L12 5l-.4-.4a5.24 5.24 0 1 0-7.4 7.4l.4.4L12 22l7.4-9.6.4-.4a5.24 5.24 0 0 0 0-7.4z" fill="currentColor"/>'),
  check: P('<path d="M20 6 9 17l-5-5"/>'),
  checkCircle: P('<circle cx="12" cy="12" r="9"/><path d="m8.5 12.2 2.4 2.4 4.6-5"/>'),
  tag: P('<path d="M12.6 2.6H4.8A2.2 2.2 0 0 0 2.6 4.8v7.8c0 .6.2 1.2.7 1.7l8.1 8.1a2.4 2.4 0 0 0 3.4 0l6.5-6.5a2.4 2.4 0 0 0 0-3.4l-8.1-8.1c-.5-.5-1.1-.7-1.7-.7z"/><circle cx="7.6" cy="7.6" r="1.4"/>'),
  tags: P('<path d="M9 5H5a2 2 0 0 0-2 2v4l9.3 9.3a2 2 0 0 0 2.8 0l4.2-4.2a2 2 0 0 0 0-2.8L11 5z" opacity=".55"/><path d="M15 5h6v6"/><path d="M9 5h6v6"/>'),
  wallet: P('<path d="M20 8V6.5A1.5 1.5 0 0 0 18.5 5H5.2A2.2 2.2 0 0 1 5 2.8"/><path d="M3 5.5v13A2.5 2.5 0 0 0 5.5 21h14a1 1 0 0 0 1-1v-3"/><path d="M21 12.5a2.5 2.5 0 0 0-2.5-2.5H17a2.5 2.5 0 0 0 0 5h1.5a2.5 2.5 0 0 0 2.5-2.5z"/>'),
  settings: P('<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  shield: P('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>'),
  plus: P('<path d="M12 5v14M5 12h14"/>'),
  search: P('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
  bell: P('<path d="M6 8.5a6 6 0 0 1 12 0c0 6.5 2.5 8.5 2.5 8.5h-17S6 15 6 8.5"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>'),
  x: P('<path d="M18 6 6 18M6 6l12 12"/>'),
  trash: P('<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/>'),
  external: P('<path d="M15 3h6v6M10.5 13.5 21 3"/><path d="M18 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.5"/>'),
  pencil: P('<path d="M17 3.5a2.1 2.1 0 0 1 3 3L7.5 19 2.5 21l2-5z"/>'),
  chevronL: P('<path d="m15 18-6-6 6-6"/>'),
  chevronR: P('<path d="m9 18 6-6-6-6"/>'),
  sun: P('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.5 12h-2M21.5 12h-2M6.4 6.4 5 5M19 19l-1.4-1.4M17.6 6.4 19 5M5 19l1.4-1.4"/>'),
  moon: P('<path d="M12 3a6.5 6.5 0 0 0 9 9 9 9 0 1 1-9-9z"/>'),
  info: P('<circle cx="12" cy="12" r="9.2"/><path d="M12 16.5v-5M12 8h.01"/>'),
  alert: P('<path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9.5V14M12 17.5h.01"/>'),
  link: P('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7.1-7.1L11.7 5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7"/>'),
  bag: P('<path d="M6.5 2.5 3 6.5V20a1.8 1.8 0 0 0 1.8 1.8h14.4A1.8 1.8 0 0 0 21 20V6.5l-3.5-4z"/><path d="M3.2 6.6h17.6M15.8 10.5a4 4 0 0 1-7.6 0"/>'),
  sparkles: P('<path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9zM5 15l.7 1.6L7.4 17l-1.7.7L5 19.4l-.7-1.7L2.6 17l1.7-.4z"/>'),
  clock: P('<circle cx="12" cy="12" r="9.2"/><path d="M12 6.8V12l3.4 2"/>'),
  more: P('<circle cx="12" cy="5.5" r=".8" fill="currentColor"/><circle cx="12" cy="12" r=".8" fill="currentColor"/><circle cx="12" cy="18.5" r=".8" fill="currentColor"/>'),
  logout: P('<path d="M9.5 21H5.8A2.8 2.8 0 0 1 3 18.2V5.8A2.8 2.8 0 0 1 5.8 3h3.7"/><path d="m15.5 17 5-5-5-5M20.5 12H9.5"/>'),
  user: P('<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.7 7.7 0 0 1 15 0"/>'),
  users: P('<circle cx="9.5" cy="8" r="3.6"/><path d="M2.5 21a7.2 7.2 0 0 1 14 0"/><path d="M16 4.2a3.6 3.6 0 0 1 0 7M19 21a6.6 6.6 0 0 0-2.6-5.2"/>'),
  package: P('<path d="m7.5 4 9 5.2v9.6L7.5 24l-9-5.2V9.2z" transform="translate(4.5 -4) scale(0.98)"/><path d="M3.6 7.5 12 12.4l8.4-4.9M12 22v-9.6"/>'),
  menu: P('<path d="M4 6.5h16M4 12h16M4 17.5h16"/>'),
  eye: P('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3.2"/>'),
  lock: P('<rect x="4.5" y="10.5" width="15" height="10" rx="2.4"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>'),
  palette: P('<circle cx="12" cy="12" r="9.3"/><circle cx="9" cy="8.5" r="1.3" fill="currentColor"/><circle cx="14.5" cy="8" r="1.3" fill="currentColor"/><circle cx="8" cy="13.5" r="1.3" fill="currentColor"/><path d="M12 21a2.5 2.5 0 0 0 0-5 2 2 0 0 1 2-2h3a4.3 4.3 0 0 0 4-4.4"/>'),
};
const ic = n => ICONS[n] || '';

/* ───────────────── brand mark ───────────────── */
const BRAND_SVG = `<svg viewBox="0 0 48 48" fill="none"><path d="M16 20v-2.5a8 8 0 0 1 16 0V20" stroke="#0D9488" stroke-width="3" stroke-linecap="round"/><rect x="12" y="20" width="24" height="19" rx="6.5" fill="#97FFFF"/><path d="M24 34c-3.4-3-5.6-4.9-5.6-7.4a3.2 3.2 0 0 1 5.6-2.1 3.2 3.2 0 0 1 5.6 2.1c0 2.5-2.2 4.4-5.6 7.4z" fill="#FB72A8"/></svg>`;

/* ───────────────── product artwork (inline SVG, works offline) ───────────────── */
const ART = {
  tshirt: (a, b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" rx="0" fill="${a}"/><path d="M155 78c0 14 90 14 90 0l52 24-17 42-23-9v107a12 12 0 0 1-12 12H207a12 12 0 0 1-12-12v-95h-2v95a12 12 0 0 1-12 12h-38a12 12 0 0 1-12-12V135l-23 9-17-42z" fill="${b}" stroke="#1F2937" stroke-opacity=".16" stroke-width="4" stroke-linejoin="round"/><path d="M155 78c12 12 78 12 90 0" fill="none" stroke="#1F2937" stroke-opacity=".2" stroke-width="5"/><circle cx="200" cy="185" r="26" fill="#fff" fill-opacity=".55"/><path d="M200 197c-9-7-14-12-14-18a8 8 0 0 1 14-5 8 8 0 0 1 14 5c0 6-5 11-14 18z" fill="#FB72A8"/></svg>`,
  sneaker: (a, b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="${a}"/><path d="M70 214c-9-2-14-8-12-16l6-30c2-9 10-14 19-12l40 9 46-52c9-10 25-4 26 8l1 16c12 12 28 18 47 20l54 6c17 2 30 8 39 18l6 7v10c0 6-5 10-11 10z" fill="${b}" stroke="#1F2937" stroke-opacity=".18" stroke-width="4"/><path d="M58 198h280c9 0 14 6 14 13 0 8-6 13-15 13H72c-9 0-16-5-16-13 0-6 2-11 2-13z" fill="#fff" stroke="#1F2937" stroke-opacity=".18" stroke-width="4"/><path d="m172 124 12 12M185 110l14 14M200 100l13 13" stroke="#1F2937" stroke-opacity=".25" stroke-width="5" stroke-linecap="round"/><circle cx="122" cy="180" r="9" fill="#FB72A8"/><path d="M240 168c14 8 34 12 56 13" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".8"/></svg>`,
  headphones: (a, b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="${a}"/><path d="M110 190V145a90 90 0 0 1 180 0v45" fill="none" stroke="${b}" stroke-width="26" stroke-linecap="round" opacity=".95"/><rect x="84" y="164" width="52" height="84" rx="24" fill="${b}"/><rect x="264" y="164" width="52" height="84" rx="24" fill="${b}"/><rect x="96" y="178" width="28" height="56" rx="14" fill="#fff" opacity=".65"/><rect x="276" y="178" width="28" height="56" rx="14" fill="#fff" opacity=".65"/><path d="M136 108a64 64 0 0 1 60-24" stroke="#fff" stroke-width="9" stroke-linecap="round" fill="none" opacity=".7"/></svg>`,
  lipstick: (a, b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="${a}"/><rect x="150" y="186" width="76" height="72" rx="10" fill="${b}"/><rect x="150" y="186" width="76" height="16" fill="#1F2937" opacity=".12"/><rect x="162" y="120" width="52" height="66" rx="6" fill="#F5E9D7"/><path d="M162 130c8-26 30-46 52-52v108h-52z" fill="#E11D48"/><path d="M162 130c8-26 30-46 52-52" stroke="#fff" stroke-width="6" opacity=".5" fill="none"/><circle cx="290" cy="90" r="10" fill="#FB72A8" opacity=".6"/><circle cx="106" cy="80" r="6" fill="#fff" opacity=".8"/><rect x="166" y="214" width="64" height="10" rx="5" fill="#fff" opacity=".4"/></svg>`,
  bag: (a, b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="${a}"/><path d="M118 118h164l22 130a20 20 0 0 1-20 24H116a20 20 0 0 1-20-24z" fill="${b}"/><path d="M118 118h164l8 46H110z" fill="#fff" opacity=".18"/><path d="M156 122v-16a44 44 0 0 1 88 0v16" fill="none" stroke="#1F2937" stroke-opacity=".28" stroke-width="8" stroke-linecap="round"/><rect x="180" y="150" width="40" height="26" rx="8" fill="#fff" opacity=".85"/><rect x="192" y="158" width="16" height="10" rx="5" fill="${b}"/><path d="M124 240h152" stroke="#fff" stroke-width="6" opacity=".35" stroke-linecap="round"/></svg>`,
  keyboard: (a, b) => { let k = ''; const cols = 10, rows = 3; for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) k += `<rect x="${96 + x * 22}" y="${128 + y * 24}" width="17" height="18" rx="4" fill="#fff" opacity="${.92 - y * .12}"/>`; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="${a}"/><rect x="70" y="96" width="260" height="128" rx="16" fill="${b}"/><rect x="84" y="110" width="232" height="100" rx="10" fill="#000" opacity=".12"/>${k}<rect x="96" y="176" width="185" height="18" rx="4" fill="#fff" opacity=".68"/></svg>`; },
  watch: (a, b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="${a}"/><rect x="168" y="34" width="64" height="70" rx="14" fill="${b}" opacity=".85"/><rect x="168" y="196" width="64" height="70" rx="14" fill="${b}" opacity=".85"/><circle cx="200" cy="150" r="66" fill="${b}"/><circle cx="200" cy="150" r="52" fill="#fff" opacity=".92"/><path d="M200 118v34l24 10" stroke="#1F2937" stroke-width="6" stroke-linecap="round" fill="none"/><circle cx="268" cy="150" r="7" fill="${b}"/></svg>`,
  lamp: (a, b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="${a}"/><path d="M136 130a66 66 0 0 1 132 0z" fill="${b}"/><rect x="192" y="128" width="16" height="90" rx="7" fill="${b}" opacity=".8"/><ellipse cx="200" cy="226" rx="58" ry="14" fill="${b}" opacity=".9"/><circle cx="200" cy="136" r="14" fill="#FDE68A"/><path d="M96 88l14 14M304 88l-14 14" stroke="#FDE68A" stroke-width="6" stroke-linecap="round"/><circle cx="120" cy="64" r="5" fill="#FB72A8" opacity=".7"/></svg>`,
  book: (a, b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="${a}"/><rect x="96" y="196" width="208" height="26" rx="6" fill="${b}"/><rect x="110" y="164" width="184" height="26" rx="6" fill="#fff" opacity=".9" stroke="#1F2937" stroke-opacity=".1"/><rect x="100" y="132" width="196" height="26" rx="6" fill="${b}" opacity=".75"/><rect x="120" y="100" width="170" height="26" rx="6" fill="#FDE68A" opacity=".95"/><rect x="110" y="170" width="8" height="14" fill="${b}" opacity=".8"/><circle cx="312" cy="86" r="10" fill="#FB72A8" opacity=".55"/></svg>`,
  generic: (a, b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="${a}"/><path d="M200 74l104 46v110l-104 46-104-46V120z" fill="${b}" opacity=".9"/><path d="M96 120l104 46 104-46M200 166v104" stroke="#fff" stroke-width="7" opacity=".8" fill="none"/><path d="M200 190c-16-14-27-23-27-35a15 15 0 0 1 27-10 15 15 0 0 1 27 10c0 12-11 21-27 35z" fill="#FB72A8" opacity=".95"/></svg>`,
};
const art = (type, a, b) => `data:image/svg+xml;utf8,${encodeURIComponent(ART[type] ? ART[type](a, b) : ART.generic(a, b))}`;
const PALETTE = [
  ['#E3F0FF', '#93C5FD'], ['#FFE4EF', '#F9A8D4'], ['#EFE9FE', '#C4B5FD'], ['#DFF7EC', '#6EE7B7'],
  ['#FFF3DB', '#FCD34D'], ['#E0F7F5', '#5EEAD4'], ['#FDE4E4', '#FCA5A5'], ['#EEF2FF', '#A5B4FC'],
];
const pal = s => PALETTE[hash32(s) % PALETTE.length];
const imgFor = p => p.image || art(p.art || 'generic', ...(p.pal || ['#E0F7F5', '#99F6E4']));

/* ───────────────── constants ───────────────── */
const DEFAULT_CATS = ['Thời trang', 'Giày dép', 'Làm đẹp', 'Công nghệ', 'Đồ dùng', 'Phụ kiện', 'Khác'];
const CAT_STYLE = {
  'Thời trang': { e: '👗', c: 0 }, 'Giày dép': { e: '👟', c: 1 }, 'Làm đẹp': { e: '💄', c: 2 },
  'Công nghệ': { e: '💻', c: 3 }, 'Đồ dùng': { e: '🧸', c: 4 }, 'Phụ kiện': { e: '🎒', c: 5 }, 'Khác': { e: '✨', c: 6 },
};
const STATUSES = {
  PENDING: { label: 'Dự định mua', short: 'Dự định', icon: 'clock', cls: 'st-pending', tint: 'c-tint-blue' },
  PRIORITY: { label: 'Ưu tiên mua trước', short: 'Ưu tiên', icon: 'star', cls: 'st-priority', tint: 'c-tint-purple' },
  FAVORITE: { label: 'Yêu thích', short: 'Yêu thích', icon: 'heart', cls: 'st-favorite', tint: 'c-tint-pink' },
  PURCHASED: { label: 'Đã mua', short: 'Đã mua', icon: 'checkCircle', cls: 'st-purchased', tint: 'c-tint-mint' },
};
const MKT = { SHOPEE: { label: 'Shopee', cls: 'mp-shopee', i: 'S' }, TIKTOK_SHOP: { label: 'TikTok Shop', cls: 'mp-tiktok', i: '♪' }, LAZADA: { label: 'Lazada', cls: 'mp-lazada', i: 'L' }, TIKI: { label: 'Tiki', cls: 'mp-tiki', i: 'T' }, OTHER: { label: 'Web khác', cls: 'mp-other', i: '🔗' } };

function marketplaceOf(url) {
  const u = String(url).toLowerCase();
  if (u.includes('shopee')) return 'SHOPEE';
  if (u.includes('tiktok')) return 'TIKTOK_SHOP';
  if (u.includes('lazada')) return 'LAZADA';
  if (u.includes('tiki')) return 'TIKI';
  return 'OTHER';
}

/* ───────────────── state ───────────────── */
const LS_KEY = 'ltv_preview_v1';
const now = Date.now();
const D = new Date();
const BMONTH = D.getMonth() + 1, BYEAR = D.getFullYear();

function seedState() {
  const cats = DEFAULT_CATS.map(n => ({ id: uid(), name: n }));
  const cid = n => cats.find(c => c.name === n)?.id;
  const mk = (name, price, label, cat, status, mkt, url, artType, ago) => ({
    id: uid(), product_name: name, price, price_label: label || null,
    category_id: cid(cat), status, marketplace: mkt, source_url: url,
    image: art(artType, ...pal(name)), created_at: now - ago * 3600e3, favorite: status === 'FAVORITE',
  });
  const products = [
    mk('Giày sneaker nữ basic phong cách trẻ trung, dễ phối đồ', 399000, '399.000đ – 499.000đ', 'Giày dép', 'PRIORITY', 'SHOPEE', 'https://shopee.vn/Giay-sneaker-nu-basic-i.123.456', 'sneaker', 5),
    mk('Túi xách thời trang da mềm quai ngắn', 259000, null, 'Phụ kiện', 'PRIORITY', 'SHOPEE', 'https://shopee.vn/tui-xach-thoi-trang-i.9.1', 'bag', 20),
    mk('Tai nghe Bluetooth True Wireless chống ồn', 699000, null, 'Công nghệ', 'FAVORITE', 'TIKTOK_SHOP', 'https://www.tiktok.com/shop/pdp/tai-nghe-bluetooth.17312', 'headphones', 30),
    mk('Son kem lì lâu trôi, không trôi khi ăn', 199000, null, 'Làm đẹp', 'FAVORITE', 'SHOPEE', 'https://shopee.vn/son-kem-li-lau-troi-i.2.8', 'lipstick', 48),
    mk('Áo thun basic form rộng unisex cotton 4 chiều', 149000, null, 'Thời trang', 'PENDING', 'TIKTOK_SHOP', 'https://www.tiktok.com/shop/pdp/ao-thun-basic.88', 'tshirt', 60),
    mk('Bàn phím cơ gaming RGB hot-swap', 899000, null, 'Công nghệ', 'PURCHASED', 'SHOPEE', 'https://shopee.vn/ban-phim-co-gaming-i.5.5', 'keyboard', 120),
    mk('Áo hoodie unisex form rộng nỉ bông', 219000, null, 'Thời trang', 'PENDING', 'SHOPEE', 'https://shopee.vn/ao-hoodie-unisex-i.7.7', 'tshirt', 90),
    mk('Đèn bàn học chống mờ mắt LED cảm ứng', 159000, null, 'Đồ dùng', 'PENDING', 'TIKTOK_SHOP', 'https://www.tiktok.com/shop/pdp/den-ban-hoc-led.99', 'lamp', 96),
  ];
  return {
    products, cats,
    budgets: { [`${BYEAR}-${BMONTH}`]: 5000000 },
    budgetMonth: { m: BMONTH, y: BYEAR },
    profile: { username: 'thaovy', display_name: 'Thảo Vy', avatar: '🌷', admin: true, theme: 'light' },
    ui: { query: '', status: 'ALL', cat: 'ALL', sort: 'newest' },
    entered: false,
  };
}
let S;
try { S = JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) { S = null; }
if (!S || !S.products) { S = seedState(); }
S.ui = Object.assign({ query: '', status: 'ALL', cat: 'ALL', sort: 'newest' }, S.ui);
const save = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { } };

/* theme */
function applyTheme() {
  const t = S.profile.theme;
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $('#icoTheme').innerHTML = ic(dark ? 'sun' : 'moon');
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (S.profile.theme === 'system') applyTheme(); });

/* ───────────────── selectors ───────────────── */
const catById = id => S.cats.find(c => c.id === id);
const catName = id => catById(id)?.name || 'Chưa phân loại';
const countBy = fn => S.products.filter(fn).length;
function stats() {
  const p = S.products;
  return {
    total: p.length,
    PENDING: countBy(x => x.status === 'PENDING'),
    PRIORITY: countBy(x => x.status === 'PRIORITY'),
    FAVORITE: countBy(x => x.status === 'FAVORITE'),
    PURCHASED: countBy(x => x.status === 'PURCHASED'),
  };
}
function budgetFor(m, y) { return S.budgets[`${y}-${m}`] || 0; }
function projected() {
  return S.products.filter(p => p.status === 'PENDING' || p.status === 'PRIORITY')
    .reduce((s, p) => s + (Number(p.price) || 0), 0);
}

/* ───────────────── router ───────────────── */
const ROUTES = {
  dashboard: 'Tổng quan', products: 'Tất cả sản phẩm', pending: 'Dự định mua', priority: 'Ưu tiên mua',
  favorites: 'Yêu thích', purchased: 'Đã mua', categories: 'Danh mục', budget: 'Ngân sách',
  settings: 'Cài đặt', admin: 'Quản trị',
};
function route() {
  const h = (location.hash || '#/landing').replace(/^#\//, '');
  return ROUTES[h] ? h : (h === 'landing' || h === '' ? 'landing' : 'dashboard');
}
function go(r) { location.hash = '#/' + r; }

/* ───────────────── toasts / modals ───────────────── */
let toastSeq = 0;
function toast(title, msg, kind) {
  const box = $('#toasts');
  const el = document.createElement('div');
  const ico = kind === 'err' ? 'alert' : kind === 'info' ? 'info' : 'checkCircle';
  el.className = 'toast ' + (kind || 'ok');
  el.innerHTML = `<span class="t-ico">${ic(ico)}</span><div><b>${esc(title)}</b>${msg ? `<p>${esc(msg)}</p>` : ''}</div><button class="x" data-close-toast aria-label="Đóng">${ic('x')}</button>`;
  el.dataset.tid = ++toastSeq;
  box.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, 3400);
}
document.addEventListener('click', e => { if (e.target.closest('[data-close-toast]')) e.target.closest('.toast').remove(); });

function openModal(id) { $('#' + id).classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { $('#' + id).classList.add('hidden'); if (!$$('.modal-root:not(.hidden)').length) document.body.style.overflow = ''; }
document.addEventListener('click', e => {
  const c = e.target.closest('[data-close]');
  if (c) closeModal(c.dataset.close);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') $$('.modal-root:not(.hidden)').forEach(m => closeModal(m.id)); });

/* confirm dialog */
function confirmAsk({ icon = 'alert', tint = 'var(--red-soft)', title, msg, ok = 'Xóa', cancel = 'Hủy', danger = true, onOk }) {
  $('#confirmBody').innerHTML = `
    <div class="confirm-ico" style="background:${tint};color:${danger ? '#DC2626' : 'var(--teal-ink)'}">${icon.startsWith('ic:') ? ic(icon.slice(3)) : esc(icon)}</div>
    <h3>${esc(title)}</h3>${msg ? `<p>${esc(msg)}</p>` : ''}
    <div class="confirm-actions"><button class="btn btn-ghost" data-close="modalConfirm">${esc(cancel)}</button>
    <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirmOk">${esc(ok)}</button></div>`;
  openModal('modalConfirm');
  $('#confirmOk').onclick = () => { closeModal('modalConfirm'); onOk && onOk(); };
}

/* ───────────────── landing paint ───────────────── */
function paintLanding() {
  ['brandMark1', 'brandMark2', 'brandMark3', 'brandMark4'].forEach(id => { const el = $('#' + id); if (el) el.innerHTML = BRAND_SVG; });
  $('#icoSparkHero').innerHTML = ic('sparkles');
  $('#icoW1').innerHTML = ic('lock'); $('#icoW2').innerHTML = ic('link');
  $('#icoW3').innerHTML = ic('wallet'); $('#icoW4').innerHTML = ic('external');
  $('#phoneCards').innerHTML = S.products.slice(0, 3).map(p => `
    <div class="pcard-mini"><img src="${imgFor(p)}" alt="" />
      <div><div class="t">${esc(p.product_name.slice(0, 26))}</div><div class="p">${p.price_label || money(p.price)}</div></div>
      <span class="b ${STATUSES[p.status].cls}">${STATUSES[p.status].short}</span></div>`).join('');
}

/* ───────────────── sidebar / topbar / nav ───────────────── */
function sideItem(r, icon, label, count) {
  const cur = route();
  return `<button class="sb-item ${cur === r ? 'on' : ''}" data-nav="${r}">${ic(icon)}<span>${label}</span>${count != null ? `<span class="cnt">${count}</span>` : ''}</button>`;
}
function renderSidebar() {
  const st = stats();
  $('#sideNav').innerHTML = `
    ${sideItem('dashboard', 'dashboard', 'Tổng quan')}
    ${sideItem('products', 'list', 'Tất cả sản phẩm', st.total)}
    <div class="sb-label">Danh sách</div>
    ${sideItem('pending', 'bookmark', 'Dự định mua', st.PENDING)}
    ${sideItem('priority', 'star', 'Ưu tiên mua', st.PRIORITY)}
    ${sideItem('favorites', 'heart', 'Yêu thích', st.FAVORITE)}
    ${sideItem('purchased', 'checkCircle', 'Đã mua', st.PURCHASED)}
    <div class="sb-label">Tài chính & Cá nhân</div>
    ${sideItem('categories', 'tags', 'Danh mục', S.cats.length)}
    ${sideItem('budget', 'wallet', 'Ngân sách')}
    ${sideItem('settings', 'settings', 'Cài đặt')}
    ${S.profile.admin ? sideItem('admin', 'shield', 'Quản trị') : ''}`;
  const av = S.profile.avatar && S.profile.avatar.length <= 3;
  $('#sbUser').innerHTML = `
    <span class="avatar">${av ? esc(S.profile.avatar || '🌷') : `<img src="${esc(S.profile.avatar)}" alt=""/>`}</span>
    <span class="u"><span class="n">${esc(S.profile.display_name)}</span><br /><span class="e">@${esc(S.profile.username)}${S.profile.admin ? ' · ADMIN' : ''}</span></span>
    <button class="icon-btn" title="Đăng xuất" data-action="logout" style="margin-left:auto">${ic('logout')}</button>`;
  $('#demoStrip').innerHTML = `${ic('sparkles')} Chế độ Demo — dữ liệu chỉ lưu trong trình duyệt của bạn (localStorage), không có server thật. <button data-action="reset-demo">Đặt lại dữ liệu demo</button>`;
  $('#avatarMenu').innerHTML = `
    <button class="avt-btn" data-action="avt-toggle"><span class="avatar sm">${esc(S.profile.avatar || '🌷')}</span><span>${esc(S.profile.display_name)}</span><i>⌄</i></button>
    <div class="avt-pop hidden" id="avtPop">
      <div class="who"><span class="avatar">${esc(S.profile.avatar || '🌷')}</span>
        <div><div class="n">${esc(S.profile.display_name)}</div><span class="r">${S.profile.admin ? 'ADMIN' : 'USER'}</span></div></div>
      <div class="sep"></div>
      <button class="row" data-nav="settings">${ic('user')} Cài đặt tài khoản</button>
      <button class="row" data-action="toggle-theme">${ic(S.profile.theme === 'dark' ? 'sun' : 'moon')} Giao diện ${S.profile.theme === 'dark' ? 'sáng' : 'tối'}</button>
      <div class="sep"></div>
      <button class="row danger" data-action="logout">${ic('logout')} Đăng xuất</button>
    </div>`;
  const bnav = [
    ['dashboard', 'home', 'Trang chủ'], ['products', 'list', 'Danh sách'], ['favorites', 'heart', 'Yêu thích'], ['settings', 'user', 'Cá nhân'],
  ];
  $('#bottomNav').innerHTML = bnav.map(([r, i, l], idx) =>
    `${idx === 2 ? '<span class="bnav-item" style="visibility:hidden">+</span>' : ''}<button class="bnav-item ${route() === r ? 'on' : ''}" data-nav="${r}">${ic(i)}${l}</button>`).join('');
}
function renderTopbarIcons() {
  const setIco = (sel, name) => { const el = $(sel); if (el) el.innerHTML = ic(name); };
  setIco('#icoMenu', 'menu'); setIco('#icoSearch', 'search');
  setIco('#icoBell', 'bell'); setIco('#icoPlusSide', 'plus');
  setIco('#icoPlusFab', 'plus'); setIco('#icoPlusAdd', 'plus');
  setIco('#icoLink', 'link'); setIco('#icoInfo', 'info');
  ['icoX1', 'icoX2', 'icoX3'].forEach(i => setIco('#' + i, 'x'));
  applyTheme();
}

/* ───────────────── product card & grid ───────────────── */
function pcard(p, i) {
  const st = STATUSES[p.status];
  const mk = MKT[p.marketplace] || MKT.OTHER;
  const cat = catById(p.category_id);
  const cs = cat ? (CAT_STYLE[cat.name] || { e: '✨', c: 3 }) : { e: '🗂️', c: 3 };
  return `<article class="pcard" data-id="${p.id}" style="animation-delay:${Math.min(i * 35, 280)}ms">
    <div class="pcard-media">
      <img src="${imgFor(p)}" alt="${esc(p.product_name)}" loading="lazy"
        onerror="this.onerror=null;this.src='${imgFor({ art: 'generic', product_name: 'x' })}'" />
      <div class="pcard-tl"><span class="badge-status ${st.cls}">${ic(st.icon)}${st.short}</span></div>
      <div class="pcard-tr">
        <button class="heart-btn ${p.favorite ? 'on' : ''}" data-action="fav" data-id="${p.id}" aria-label="Yêu thích">${p.favorite ? ICONS.heartFill : ICONS.heart}</button>
        <button class="menu-btn" data-action="menu" data-id="${p.id}" aria-label="Khác">⋮</button>
      </div>
    </div>
    <div class="pcard-body">
      <h4 class="pcard-name">${esc(p.product_name)}</h4>
      <div class="pcard-price">${p.price_label || money(p.price)}</div>
      <div class="pcard-meta">
        <span class="mp ${mk.cls}"><i>${mk.i}</i>${mk.label}</span>
        ${cat ? `<span class="cat-chip">${cs.e} ${esc(cat.name)}</span>` : ''}
      </div>
      <div class="pcard-actions">
        <a class="btn-buy" href="${esc(p.source_url)}" target="_blank" rel="noopener noreferrer">${ic('external')} Mua ngay</a>
      </div>
    </div>
  </article>`;
}
function skeletonGrid(n) {
  return `<div class="grid-products">${Array.from({ length: n }, () => `<div class="sk-card"><div class="sk sk-img"></div><div class="sk-body"><div class="sk sk-l1"></div><div class="sk sk-l2"></div><div class="sk sk-l3"></div></div></div>`).join('')}</div>`;
}
function emptyBlock(title, msg, cta) {
  return `<div class="empty"><div class="em-ico">🛍️</div><h3>${title}</h3><p>${msg}</p>${cta ? `<button class="btn btn-primary" data-action="open-add">${ic('plus')} ${cta}</button>` : ''}</div>`;
}

function filterProducts(statusKey) {
  let list = S.products.slice();
  if (statusKey && statusKey !== 'ALL') list = list.filter(p => p.status === statusKey);
  const q = S.ui.query.trim().toLowerCase();
  if (q) list = list.filter(p => p.product_name.toLowerCase().includes(q) || catName(p.category_id).toLowerCase().includes(q));
  if (S.ui.cat !== 'ALL') list = list.filter(p => p.category_id === S.ui.cat);
  const sorters = {
    newest: (a, b) => b.created_at - a.created_at,
    oldest: (a, b) => a.created_at - b.created_at,
    priceAsc: (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
    priceDesc: (a, b) => (b.price ?? -1) - (a.price ?? -1),
    nameAz: (a, b) => a.product_name.localeCompare(b.product_name, 'vi'),
  };
  return list.sort(sorters[S.ui.sort] || sorters.newest);
}

function toolbar(statusKey, hideStatusChips) {
  const chips = [['ALL', 'Tất cả'], ['PENDING', 'Dự định mua'], ['PRIORITY', 'Ưu tiên mua'], ['FAVORITE', 'Yêu thích'], ['PURCHASED', 'Đã mua']];
  return `<div class="toolbar">
    ${hideStatusChips ? '' : `<div class="fchips">${chips.map(([k, l]) => `<button class="fchip ${S.ui.status === k ? 'on' : ''}" data-fstatus="${k}">${l}</button>`).join('')}</div>`}
    <div class="right">
      <select class="input" data-fcat aria-label="Lọc theo danh mục">
        <option value="ALL">Tất cả danh mục</option>
        ${S.cats.map(c => `<option value="${c.id}" ${S.ui.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
      </select>
      <select class="input" data-fsort aria-label="Sắp xếp">
        ${[['newest', 'Mới thêm nhất'], ['oldest', 'Cũ nhất'], ['priceAsc', 'Giá thấp → cao'], ['priceDesc', 'Giá cao → thấp'], ['nameAz', 'Tên A → Z']]
        .map(([k, l]) => `<option value="${k}" ${S.ui.sort === k ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
      <button class="btn btn-soft btn-sm" data-action="open-add">${ic('plus')} Thêm</button>
    </div>
  </div>`;
}

/* ───────────────── pages ───────────────── */
function pageDashboard() {
  const st = stats();
  const m = S.budgetMonth.m, y = S.budgetMonth.y;
  const budget = budgetFor(m, y), proj = projected();
  const pct = budget > 0 ? Math.min(100, Math.round(proj / budget * 100)) : (proj > 0 ? 100 : 0);
  const remain = budget - proj;
  const noteCls = proj > budget && budget > 0 ? 'bn-over' : (budget > 0 && proj >= budget * .8 ? 'bn-warn' : 'bn-ok');
  const noteTxt = budget <= 0 ? 'Bạn chưa đặt ngân sách cho tháng này.'
    : proj > budget ? 'Danh sách sản phẩm dự kiến đã vượt ngân sách.'
      : proj >= budget * .8 ? 'Bạn đang gần vượt ngân sách.' : 'Ngân sách vẫn còn thoải mái, cứ thích là lưu! 🎀';
  const feat = S.products.filter(p => p.status === 'PRIORITY' || p.status === 'FAVORITE').concat(S.products.filter(p => p.status === 'PENDING')).slice(0, 8);
  return `
  <div class="greet">
    <div><h2>Chào ${esc(S.profile.display_name)} 👋</h2><p>Bạn đang muốn mua gì hôm nay?</p></div>
    <button class="btn btn-primary" data-action="open-add">${ic('plus')} Thêm sản phẩm</button>
  </div>
  <div class="stats-grid">
    ${[['Tổng sản phẩm', st.total, 'bag', 'c-tint-aqua', 'products'], ['Dự định mua', st.PENDING, 'bookmark', 'c-tint-blue', 'pending'], ['Ưu tiên mua', st.PRIORITY, 'star', 'c-tint-purple', 'priority'], ['Yêu thích', st.FAVORITE, 'heart', 'c-tint-pink', 'favorites'], ['Đã mua', st.PURCHASED, 'checkCircle', 'c-tint-mint', 'purchased']]
      .map(([l, n, i, t, r]) => `<div class="stat-card" data-nav="${r}"><span class="stat-ico ${t}">${ic(i)}</span><div><div class="num">${n}</div><div class="lab">${l}</div></div></div>`).join('')}
  </div>
  <div class="dash-cols">
    <div class="budget-card">
      <div class="budget-head">${ic('wallet')} Ngân sách tháng ${m}/${y}
        <span class="edit"><button class="btn btn-soft btn-sm" data-nav="budget">Chỉnh sửa</button></span></div>
      <div class="budget-amt">${money(budget)}</div>
      <div class="budget-rows">
        <div><div class="b-lab">Dự kiến sử dụng</div><div class="b-val">${money(proj)}</div></div>
        <div><div class="b-lab">Còn lại</div><div class="b-val" style="color:${remain < 0 ? '#DC2626' : 'inherit'}">${money(remain)}</div></div>
        <div><div class="b-lab">Tỷ lệ</div><div class="b-val">${pct}%</div></div>
      </div>
      <div class="bar ${pct >= 100 ? 'over' : pct >= 80 ? 'warn' : ''}" style="margin-top:12px"><i style="width:${pct}%"></i></div>
      <div class="budget-note ${noteCls}">${ic(pct >= 100 ? 'alert' : pct >= 80 ? 'clock' : 'checkCircle')} ${noteTxt}</div>
      <div style="font-size:.72rem;color:var(--muted);margin-top:10px">Dự kiến = tổng giá các sản phẩm <b>Dự định mua</b> + <b>Ưu tiên mua</b>.</div>
    </div>
    <div class="note-card"><span class="hearts">💌</span><p>Những điều tốt đẹp đều xứng đáng được chờ đợi. Cứ lưu lại trước, khi có tiền hãy mua — đừng để lạc mất món đồ mình thích.</p></div>
  </div>
  <div class="sec-row"><h3>Sản phẩm nổi bật</h3><a href="#/products">Xem tất cả →</a></div>
  ${feat.length ? `<div class="grid-products">${feat.map(pcard).join('')}</div>` : emptyBlock('Danh sách của bạn đang trống ❤️', 'Hãy lưu sản phẩm đầu tiên bằng cách dán link từ Shopee hoặc TikTok Shop.', 'Thêm sản phẩm')}`;
}

function pageList(statusKey, title, subtitle, opts) {
  opts = opts || {};
  const key = opts.chipMode ? S.ui.status : statusKey;
  const list = filterProducts(opts.chipMode ? (S.ui.status === 'ALL' ? null : S.ui.status) : statusKey);
  return `
  <div class="page-head"><div><h2>${title}</h2><p>${subtitle}</p></div>
    <button class="btn btn-primary" data-action="open-add">${ic('plus')} Thêm sản phẩm</button></div>
  ${toolbar(statusKey, !opts.chipMode)}
  <div class="count-line"><b>${list.length}</b> sản phẩm${S.ui.query ? ` cho từ khóa “<b>${esc(S.ui.query)}</b>”` : ''}</div>
  ${list.length ? `<div class="grid-products">${list.map(pcard).join('')}</div>`
    : emptyBlock(statusKey === 'PURCHASED' ? 'Chưa có món nào được mua 😌' : 'Chưa có gì ở đây', S.ui.query ? 'Thử từ khóa hoặc bộ lọc khác nhé.' : 'Bấm “Thêm sản phẩm” và dán link từ Shopee / TikTok Shop.', 'Thêm sản phẩm')}`;
}

function pageCategories() {
  return `
  <div class="page-head"><div><h2>Danh mục</h2><p>Sắp xếp list của bạn theo cách riêng — tạo bao nhiêu danh mục tùy thích.</p></div>
    <button class="btn btn-primary" data-action="cat-add">${ic('plus')} Thêm danh mục</button></div>
  <div class="grid-cats">
    ${S.cats.map(c => {
    const n = S.products.filter(p => p.category_id === c.id).length;
    const st = CAT_STYLE[c.name] || { e: '🏷️', c: hash32(c.name) % 8 };
    return `<div class="cat-card" data-cat="${c.id}">
        <span class="cat-ico" style="background:${PALETTE[st.c][0]}">${st.e}</span>
        <div><div class="n">${esc(c.name)}</div><div class="c">${n} sản phẩm</div></div>
        <div class="ops">
          <button class="icon-btn" data-cat-rename="${c.id}" title="Đổi tên">${ic('pencil')}</button>
          <button class="icon-btn" data-cat-del="${c.id}" title="Xóa">${ic('trash')}</button>
        </div>
      </div>`;
  }).join('')}
    <button class="cat-add" data-action="cat-add">${ic('plus')} Tạo danh mục mới</button>
  </div>`;
}

function pageBudget() {
  const m = S.budgetMonth.m, y = S.budgetMonth.y;
  const budget = budgetFor(m, y), proj = projected();
  const pct = budget > 0 ? Math.min(100, Math.round(proj / budget * 100)) : (proj > 0 ? 100 : 0);
  const byStatus = { PENDING: 0, PRIORITY: 0, FAVORITE: 0, PURCHASED: 0 };
  S.products.forEach(p => byStatus[p.status] += Number(p.price) || 0);
  const byCat = {};
  S.products.filter(p => p.status === 'PENDING' || p.status === 'PRIORITY').forEach(p => {
    const k = catName(p.category_id); byCat[k] = (byCat[k] || 0) + (Number(p.price) || 0);
  });
  return `
  <div class="page-head"><div><h2>Ngân sách</h2><p>Đặt hạn mức “dự kiến chi” mỗi tháng để mua sắm có kế hoạch.</p></div></div>
  <div class="dash-cols">
    <div class="budget-card">
      <div class="budget-head">${ic('wallet')}
        <button class="icon-btn" data-budget-prev aria-label="Tháng trước">${ic('chevronL')}</button>
        <b style="font-size:.95rem;color:var(--ink)">Tháng ${m}/${y}</b>
        <button class="icon-btn" data-budget-next aria-label="Tháng sau">${ic('chevronR')}</button>
        <span class="edit"><button class="btn btn-soft btn-sm" data-budget-set>${ic('pencil')} Đặt ngân sách</button></span></div>
      <div class="budget-amt">${money(budget)}</div>
      <div class="budget-rows">
        <div><div class="b-lab">Dự kiến sử dụng</div><div class="b-val">${money(proj)}</div></div>
        <div><div class="b-lab">Còn lại</div><div class="b-val" style="color:${budget - proj < 0 ? '#DC2626' : 'inherit'}">${money(budget - proj)}</div></div>
      </div>
      <div class="bar ${pct >= 100 ? 'over' : pct >= 80 ? 'warn' : ''}" style="margin-top:12px"><i style="width:${pct}%"></i></div>
      ${budget > 0 && proj > budget ? `<div class="budget-note bn-over">${ic('alert')} Danh sách sản phẩm dự kiến đã vượt ngân sách.</div>`
      : budget > 0 && proj >= budget * .8 ? `<div class="budget-note bn-warn">${ic('clock')} Bạn đang gần vượt ngân sách.</div>` : ''}
      <div class="sec-row" style="margin:20px 0 8px"><h3>Chi tiết theo trạng thái</h3></div>
      ${Object.entries(byStatus).map(([k, v]) => `<div class="kv"><span class="k">${ic(STATUSES[k].icon)} ${STATUSES[k].label}</span><span class="v">${money(v)}</span></div>`).join('')}
      ${Object.keys(byCat).length ? `<div class="sec-row" style="margin:20px 0 8px"><h3>Chi tiết theo danh mục</h3></div>${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="kv"><span class="k">${(CAT_STYLE[k] || { e: '️' }).e} ${esc(k)}</span><span class="v">${money(v)}</span></div>`).join('')}` : ''}
    </div>
    <div class="note-card"><span class="hearts">🧺</span><p>Mẹo nhỏ: chỉ “Dự định mua” và “Ưu tiên mua” mới được tính vào ngân sách — “Yêu thích” là để ước ao, “Đã mua” là để nhớ.</p></div>
  </div>`;
}

function pageSettings() {
  const p = S.profile;
  return `
  <div class="page-head"><div><h2>Cài đặt</h2><p>Thông tin tài khoản và giao diện của bạn.</p></div></div>
  <div class="settings-grid">
    <div class="set-nav">
      <button class="on" data-set-tab="profile">${ic('user')} Hồ sơ</button>
      <button data-set-tab="theme">${ic('palette')} Giao diện</button>
      <button data-set-tab="password">${ic('lock')} Mật khẩu</button>
      <button data-set-tab="danger">${ic('trash')} Dữ liệu</button>
    </div>
    <div id="setBody">${setProfile(p)}</div>
  </div>`;
}
function setProfile(p) {
  return `<div class="set-card">
    <h3>Hồ sơ của bạn</h3><div class="sub">Dùng để cá nhân hóa lời chào trong app.</div>
    <div class="form-grid">
      <div><label class="lbl">Username</label><input class="input" id="fUser" value="${esc(p.username)}" maxlength="24" /></div>
      <div><label class="lbl">Tên hiển thị</label><input class="input" id="fName" value="${esc(p.display_name)}" maxlength="40" /></div>
      <div><label class="lbl">Avatar (emoji)</label><input class="input" id="fAvatar" value="${esc(p.avatar)}" maxlength="4" /></div>
      <div><label class="lbl">Vai trò</label><input class="input" value="${p.admin ? 'ADMIN — đang bật ở tab Dữ liệu' : 'USER — chế độ preview'}" disabled /></div>
    </div>
    <div style="margin-top:16px;display:flex;gap:10px"><button class="btn btn-primary" data-action="save-profile">Lưu thay đổi</button>
    <button class="btn btn-ghost" data-action="logout">${ic('logout')} Đăng xuất</button></div>
  </div>`;
}
function setTheme() {
  const opts = [['light', 'Light', '☀️'], ['dark', 'Dark', '🌙'], ['system', 'System', '🖥️']];
  return `<div class="set-card"><h3>Giao diện</h3><div class="sub">Sáng · Tối · Theo hệ thống</div>
    <div class="theme-row">${opts.map(([v, l, e]) => `
      <button class="theme-opt ${S.profile.theme === v ? 'on' : ''}" data-theme-set="${v}">
        <span class="swatch ${v}"></span>${e} ${l}</button>`).join('')}</div></div>`;
}
function setPassword() {
  return `<div class="set-card"><h3>Đổi mật khẩu</h3><div class="sub">Ở bản production, thao tác này đi qua Supabase Auth phía server.</div>
    <div class="form-grid"><div><label class="lbl">Mật khẩu hiện tại</label><input class="input" type="password" placeholder="••••••••" /></div>
    <div><label class="lbl">Mật khẩu mới</label><input class="input" type="password" placeholder="Tối thiểu 8 ký tự" /></div></div>
    <div style="margin-top:14px"><button class="btn btn-primary" data-action="demo-only">Cập nhật mật khẩu</button></div></div>`;
}
function setDanger() {
  return `<div class="set-card"><h3>Admin (demo)</h3><div class="sub">Bật tab “Quản trị” trong sidebar để xem trước giao diện admin.</div>
    <label class="pill ${S.profile.admin ? 'on' : ''}" style="width:max-content;cursor:pointer"><input type="checkbox" id="fAdmin" ${S.profile.admin ? 'checked' : ''} style="accent-color:var(--teal)"/> Hiển thị menu Quản trị</label></div>
  <div class="set-card" style="border-color:color-mix(in srgb,var(--red) 35%,var(--line))"><h3>Vùng dữ liệu demo</h3>
    <div class="sub">Xóa toàn bộ sản phẩm, danh mục, ngân sách đang lưu trong trình duyệt và tạo lại dữ liệu mẫu.</div>
    <button class="btn btn-danger" data-action="reset-demo">${ic('trash')} Đặt lại dữ liệu demo</button>
    <button class="btn btn-ghost" data-action="clear-demo" style="margin-left:8px">Xóa trắng dữ liệu</button></div>`;
}

function pageAdmin() {
  const st = stats();
  const rows = S.products.slice().sort((a, b) => b.created_at - a.created_at).map(p => `
    <tr><td><div class="who2"><img src="${imgFor(p)}" style="width:36px;height:36px;border-radius:9px;object-fit:cover" alt=""/><div><div class="t1">${esc(p.product_name)}</div><div class="t2">${p.price_label || money(p.price)} · ${catName(p.category_id)}</div></div></div></td>
    <td><span class="mp ${(MKT[p.marketplace] || MKT.OTHER).cls}"><i>${(MKT[p.marketplace] || MKT.OTHER).i}</i>${(MKT[p.marketplace] || MKT.OTHER).label}</span></td>
    <td><span class="badge-status ${STATUSES[p.status].cls}">${STATUSES[p.status].short}</span></td>
    <td>${fmtDate(p.created_at)}</td>
    <td style="text-align:right"><button class="icon-btn" data-adm-del="${p.id}" title="Xóa">${ic('trash')}</button></td></tr>`).join('');
  return `
  <div class="page-head"><div><h2>Admin Dashboard</h2><p>Toàn quyền quản trị — bản preview chỉ có một người dùng demo.</p></div></div>
  <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
    ${[['Tổng users', 1, 'users', 'c-tint-aqua'], ['Tổng products', S.products.length, 'package', 'c-tint-blue'], ['Tổng categories', S.cats.length, 'tags', 'c-tint-purple'], ['Sản phẩm đã mua', st.PURCHASED, 'checkCircle', 'c-tint-mint']]
      .map(([l, n, i, t]) => `<div class="stat-card" style="cursor:default"><span class="stat-ico ${t}">${ic(i)}</span><div><div class="num">${n}</div><div class="lab">${l}</div></div></div>`).join('')}
  </div>
  <div class="sec-row"><h3>Người dùng gần đây</h3></div>
  <div class="table-wrap"><table>
    <thead><tr><th>Người dùng</th><th>Vai trò</th><th>Products</th><th>Ngày tham gia</th><th></th></tr></thead>
    <tbody><tr><td><div class="who2"><span class="avatar sm">🌷</span><div><div class="t1">@${esc(S.profile.username)}</div><div class="t2">${esc(S.profile.display_name)} · preview@listcuathaovy.local</div></div></div></td>
    <td><span class="badge-status st-priority">ADMIN</span></td><td>${S.products.length}</td><td>${fmtDate(now)}</td><td></td></tr></tbody>
  </table></div>
  <div class="sec-row"><h3>Sản phẩm (${S.products.length})</h3></div>
  <div class="table-wrap"><table>
    <thead><tr><th>Sản phẩm</th><th>Sàn</th><th>Trạng thái</th><th>Ngày thêm</th><th></th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:var(--muted)">Chưa có dữ liệu</td></tr>'}</tbody>
  </table></div>`;
}

/* ───────────────── render ───────────────── */
function render() {
  const r = route();
  const landing = r === 'landing';
  $('#landing').classList.toggle('hidden', !landing);
  $('#app').classList.toggle('hidden', landing);
  if (landing) { paintLanding(); document.body.classList.remove('side-open'); return; }
  S.entered = true;
  renderSidebar(); renderTopbarIcons();
  const page = $('#page');
  const st = route();
  let html = '';
  if (st === 'dashboard') html = pageDashboard();
  else if (st === 'products') html = pageList(null, 'Tất cả sản phẩm', 'Toàn bộ list của bạn — tìm, lọc, sắp xếp tùy ý.', { chipMode: true });
  else if (st === 'pending') html = pageList('PENDING', 'Dự định mua', 'Những món đang cân nhắc, tính vào ngân sách tháng.');
  else if (st === 'priority') html = pageList('PRIORITY', 'Ưu tiên mua', 'Những món nên mua trước — cố gắng “chốt” sớm nhé!');
  else if (st === 'favorites') html = pageList('FAVORITE', 'Yêu thích', 'Ghé mắt mỗi ngày, chưa cần tiền vội.');
  else if (st === 'purchased') html = pageList('PURCHASED', 'Đã mua', 'Kỷ niệm những lần “xử lý xong list” 🎉');
  else if (st === 'categories') html = pageCategories();
  else if (st === 'budget') html = pageBudget();
  else if (st === 'settings') html = pageSettings();
  else if (st === 'admin') html = S.profile.admin ? pageAdmin() : (go('dashboard'), '');
  page.innerHTML = html;
  const si = $('#searchInput');
  if (si && document.activeElement !== si) si.value = S.ui.query;
  const bell = $('.bell'); if (bell) bell.title = `Bạn có ${S.products.filter(p => p.status === 'PRIORITY').length} món đang ưu tiên`;
  window.scrollTo({ top: 0 });
}

/* ───────────────── add-product flow ───────────────── */
let addState = { meta: null, status: 'PRIORITY', triedOnce: false };
function resetAddModal() {
  addState = { meta: null, status: 'PRIORITY', triedOnce: false };
  $('#urlInput').value = ''; $('#catSelect').value = '';
  $('#metaBox').classList.add('hidden'); $('#metaLoading').classList.add('hidden');
  $('#fetchErr').classList.add('hidden'); $('#btnSave').disabled = true;
  $$('#statusPills .pill').forEach(b => b.classList.toggle('on', b.dataset.status === 'PRIORITY'));
}
function openAdd() {
  resetAddModal();
  $('#catSelect').innerHTML = S.cats.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  openModal('modalAdd');
  setTimeout(() => $('#urlInput').focus(), 60);
}
function fetchMetaDemo(url) {
  $('#metaBox').classList.add('hidden'); $('#fetchErr').classList.add('hidden');
  if (!/^https?:\/\//i.test(url)) {
    showFetchError('Liên kết không hợp lệ. Hãy dán link bắt đầu bằng http:// hoặc https://');
    return;
  }
  $('#btnFetch').disabled = true;
  $('#metaLoading').classList.remove('hidden');
  $('#metaLoading .meta-loading-txt')?.remove();
  $('#metaLoading').insertAdjacentHTML('beforeend', '<div class="meta-loading-txt">Đang lấy thông tin sản phẩm…</div>');
  setTimeout(() => {
    $('#metaLoading').classList.add('hidden');
    $('#btnFetch').disabled = false;
    const bad = url.includes('notfound') || (url.includes('blocked'));
    if (bad && !addState.triedOnce) { addState.triedOnce = true; showFetchError('Không thể lấy thông tin sản phẩm từ liên kết này (sàn chặn truy cập tự động).'); return; }
    const pool = [
      { t: 'Giày sneaker nữ phong cách Hàn Quốc đế mềm', pr: 425000, lbl: '425.000đ – 529.000đ', a: 'sneaker', cat: 'Giày dép' },
      { t: 'Áo hoodie unisex form rộng nỉ bông chần', pr: 219000, lbl: null, a: 'tshirt', cat: 'Thời trang' },
      { t: 'Tai nghe Bluetooth TWS chống ồn ENC pin 30h', pr: 589000, lbl: null, a: 'headphones', cat: 'Công nghệ' },
      { t: 'Son kem lì lì mượt môi lâu trôi 8h', pr: 175000, lbl: null, a: 'lipstick', cat: 'Làm đẹp' },
      { t: 'Túi xách nữ da mềm quai ngắn phối quai dài', pr: 319000, lbl: null, a: 'bag', cat: 'Phụ kiện' },
      { t: 'Bàn phím cơ 87 keys hot-swap switch nâu', pr: 899000, lbl: null, a: 'keyboard', cat: 'Công nghệ' },
      { t: 'Đồng hồ nữ mặt tròn dây kim loại mắt lưới', pr: 355000, lbl: null, a: 'watch', cat: 'Phụ kiện' },
      { t: 'Đèn bàn học LED chống mờ mắt cảm ứng', pr: 159000, lbl: null, a: 'lamp', cat: 'Đồ dùng' },
    ];
    const item = pool[hash32(url) % pool.length];
    addState.meta = {
      title: item.t, price: item.pr, label: item.lbl, art: item.a,
      marketplace: marketplaceOf(url), catGuess: item.cat, url,
    };
    showPreview();
  }, 1100 + (hash32(url) % 500));
}
function showFetchError(msg) {
  const e = $('#fetchErr');
  e.classList.remove('hidden');
  e.innerHTML = `${ic('alert')} <span>${esc(msg)}</span> <button data-action="retry-fetch">Thử lại</button>`;
  $('#metaBox').classList.add('hidden'); $('#btnSave').disabled = true;
}
function showPreview() {
  const m = addState.meta;
  const mk = MKT[m.marketplace];
  $('#pvImg').innerHTML = `<img src="${art(m.art, ...pal(m.url))}" alt="" />`;
  $('#pvName').textContent = m.title;
  $('#pvPrice').textContent = m.label || money(m.price);
  $('#pvMp').innerHTML = `<span class="mp ${mk.cls}"><i>${mk.i}</i>${mk.label}</span> <span class="cat-chip">🔗 nguồn từ link</span>`;
  const guess = S.cats.find(c => c.name === m.catGuess);
  if (guess) $('#catSelect').value = guess.id;
  $('#metaBox').classList.remove('hidden');
  $('#btnSave').disabled = false;
  const dup = S.products.find(p => normUrl(p.source_url) === normUrl(m.url));
  $('#hintLine').innerHTML = dup
    ? `${ic('alert')} <span style="color:#B45309;font-weight:700">Sản phẩm này đã được lưu trong list của bạn.</span>`
    : `${ic('info')} Hỗ trợ Shopee, TikTok Shop và các sàn TMĐT khác.`;
}
const normUrl = u => String(u).trim().replace(/\/+$/, '').replace(/^https?:\/\//, '').replace(/^www\./, '').toLowerCase();

function saveProduct() {
  const m = addState.meta; if (!m) return;
  const url = m.url.trim();
  const dup = S.products.find(p => normUrl(p.source_url) === normUrl(url));
  if (dup) {
    confirmAsk({
      icon: 'ic:info', tint: 'var(--amber-soft)', danger: false, title: 'Sản phẩm này đã được lưu.',
      msg: 'Bạn đã lưu “' + dup.product_name.slice(0, 40) + '” rồi. Mở sản phẩm đã lưu thay vì tạo bản trùng nhé?',
      ok: 'Xem sản phẩm', cancel: 'Hủy',
      onOk: () => { closeModal('modalAdd'); openDetail(dup.id); },
    });
    return;
  }
  const prod = {
    id: uid(), product_name: m.title, price: m.price, price_label: m.label,
    category_id: $('#catSelect').value || S.cats[S.cats.length - 1].id,
    status: addState.status, marketplace: m.marketplace, source_url: url,
    image: art(m.art, ...pal(url)), art: m.art, pal: pal(url),
    created_at: Date.now(), favorite: addState.status === 'FAVORITE',
  };
  S.products.unshift(prod); save(); closeModal('modalAdd'); render();
  toast('Đã lưu sản phẩm', '“' + prod.product_name.slice(0, 28) + '…” đã vào list của bạn ✨', 'ok');
}

/* ───────────────── detail ───────────────── */
function openDetail(id) {
  const p = S.products.find(x => x.id === id); if (!p) return;
  const st = STATUSES[p.status], mk = MKT[p.marketplace] || MKT.OTHER;
  $('#detailBody').innerHTML = `
    <div class="detail-hero">
      <div class="detail-img"><img src="${imgFor(p)}" alt="" /></div>
      <div>
        <div class="detail-name">${esc(p.product_name)}</div>
        <div class="detail-price">${p.price_label || money(p.price)}</div>
        <div class="pcard-meta" style="margin-bottom:10px"><span class="mp ${mk.cls}"><i>${mk.i}</i>${mk.label}</span><span class="badge-status ${st.cls}">${ic(st.icon)}${st.label}</span><span class="cat-chip">${esc(catName(p.category_id))}</span></div>
        <div class="kv"><span class="k">Liên kết gốc</span><span class="v"><a href="${esc(p.source_url)}" target="_blank" rel="noopener noreferrer">${esc(p.source_url.length > 42 ? p.source_url.slice(0, 42) + '…' : p.source_url)}</a></span></div>
        <div class="kv"><span class="k">Ngày thêm</span><span class="v">${fmtDate(p.created_at)}</span></div>
        <div class="kv"><span class="k">Danh mục</span><span class="v">${esc(catName(p.category_id))} · READ ONLY metadata</span></div>
      </div>
    </div>
    <div class="fstep" style="margin-bottom:6px">Đổi trạng thái</div>
    <div class="status-switch">${Object.keys(STATUSES).map(k => `<button class="pill ${p.status === k ? 'on' : ''}" data-det-status="${k}">${ic(STATUSES[k].icon)} ${STATUSES[k].label}</button>`).join('')}</div>`;
  $('#detailFoot').innerHTML = `
    <button class="btn btn-ghost" data-action="det-delete">${ic('trash')} Xóa</button>
    ${p.status !== 'PURCHASED' ? `<button class="btn btn-soft" data-action="det-purchased">${ic('checkCircle')} Đánh dấu đã mua</button>` : ''}
    <a class="btn btn-primary" href="${esc(p.source_url)}" target="_blank" rel="noopener noreferrer">${ic('external')} Mua ngay</a>`;
  $('#detailFoot').dataset.id = id;
  $$('#detailBody [data-det-status]').forEach(b => b.onclick = () => {
    p.status = b.dataset.detStatus; p.favorite = p.status === 'FAVORITE';
    save(); closeModal('modalDetail'); render();
    toast('Đã cập nhật', `Chuyển sang “${STATUSES[p.status].label}”`, 'ok');
  });
  openModal('modalDetail');
}

/* ───────────────── global actions (delegation) ───────────────── */
let openMenuId = null;
function closeMenu() { $$('.pmenu').forEach(x => x.remove()); openMenuId = null; }
document.addEventListener('click', e => {
  /* category + admin table buttons (no data-action attribute) */
  const catRenameBtn = e.target.closest('[data-cat-rename]');
  if (catRenameBtn) { askCategory(catRenameBtn.dataset.catRename); return; }
  const catDelBtn = e.target.closest('[data-cat-del]');
  if (catDelBtn) { askDeleteCategory(catDelBtn.dataset.catDel); return; }
  const admDelBtn = e.target.closest('[data-adm-del]');
  if (admDelBtn) { askDeleteAdminProduct(admDelBtn.dataset.admDel); return; }
  const nav = e.target.closest('[data-nav]');
  if (nav) {
    const r = nav.dataset.nav;
    S.ui.status = r === 'products' ? 'ALL' : ({ pending: 'PENDING', priority: 'PRIORITY', favorites: 'FAVORITE', purchased: 'PURCHASED' }[r] || 'ALL');
    if (ROUTES[r]) { go(r); document.body.classList.remove('side-open'); }
    closeMenu(); return;
  }
  const a = e.target.closest('[data-action]');
  if (!a) { closeMenu(); if (!e.target.closest('.avt-pop, .avt-btn')) $('#avtPop')?.classList.add('hidden'); return; }
  const act = a.dataset.action, id = a.dataset.id;
  const prod = id ? S.products.find(p => p.id === id) : null;
  switch (act) {
    case 'open-add': closeMenu(); openAdd(); break;
    case 'fav':
      prod.favorite = !prod.favorite;
      if (prod.favorite && prod.status !== 'PURCHASED') prod.status = 'FAVORITE';
      else if (!prod.favorite && prod.status === 'FAVORITE') prod.status = 'PENDING';
      save(); render(); toast(prod.favorite ? 'Đã thêm vào Yêu thích ♥' : 'Đã bỏ Yêu thích', '', 'ok'); break;
    case 'menu': {
      closeMenu();
      if (openMenuId === id) return;
      openMenuId = id;
      const card = a.closest('.pcard');
      const m = document.createElement('div'); m.className = 'pmenu';
      m.innerHTML = `
        <button data-action="detail" data-id="${id}">${ic('eye')} Xem chi tiết</button>
        <button data-action="purchased" data-id="${id}">${ic('checkCircle')} Đánh dấu đã mua</button>
        <button data-action="priority" data-id="${id}">${ic('star')} Ưu tiên mua trước</button>
        <button class="danger" data-action="del" data-id="${id}">${ic('trash')} Xóa sản phẩm</button>`;
      card.appendChild(m); e.stopPropagation(); break;
    }
    case 'detail': closeMenu(); openDetail(id); break;
    case 'purchased': case 'priority': {
      prod.status = act === 'purchased' ? 'PURCHASED' : 'PRIORITY';
      save(); closeMenu(); render();
      toast(act === 'purchased' ? 'Đã đánh dấu đã mua ✅' : 'Đã ưu tiên sản phẩm', prod.product_name.slice(0, 30) + '…', 'ok'); break;
    }
    case 'del': {
      closeMenu();
      confirmAsk({
        title: 'Bạn có chắc muốn xóa sản phẩm này không?',
        msg: `“${prod.product_name.slice(0, 52)}” sẽ bị xóa vĩnh viễn khỏi danh sách.`,
        ok: 'Xóa sản phẩm',
        onOk: () => {
          S.products = S.products.filter(p => p.id !== id); save(); render();
          closeModal('modalDetail');
          toast('Đã xóa sản phẩm', 'Hành động này không thể hoàn tác.', 'ok');
        },
      });
      break;
    }
    case 'det-delete': {
      const did = $('#detailFoot').dataset.id;
      const p2 = S.products.find(x => x.id === did);
      confirmAsk({
        title: 'Bạn có chắc muốn xóa sản phẩm này không?',
        msg: `“${p2.product_name.slice(0, 52)}” sẽ bị xóa vĩnh viễn.`,
        ok: 'Xóa sản phẩm',
        onOk: () => { S.products = S.products.filter(x => x.id !== did); save(); closeModal('modalDetail'); render(); toast('Đã xóa sản phẩm', '', 'ok'); },
      });
      break;
    }
    case 'det-purchased': {
      const p2 = S.products.find(x => x.id === $('#detailFoot').dataset.id);
      p2.status = 'PURCHASED'; save(); closeModal('modalDetail'); render();
      toast('Đã đánh dấu đã mua ✅', 'Sản phẩm chuyển sang trang “Đã mua”.', 'ok'); break;
    }
    case 'logout':
      confirmAsk({ icon: '👋', tint: 'var(--aqua-2)', danger: false, title: 'Đăng xuất khỏi bản demo?', msg: 'Dữ liệu vẫn được giữ trong trình duyệt của bạn.', ok: 'Đăng xuất', onOk: () => { S.entered = false; save(); go('landing'); toast('Đã đăng xuất', 'Hẹn gặp lại! ♥', 'info'); } });
      break;
    case 'avt-toggle': $('#avtPop').classList.toggle('hidden'); break;
    case 'toggle-theme':
      S.profile.theme = S.profile.theme === 'dark' ? 'light' : 'dark'; save(); applyTheme(); render(); break;
    case 'save-profile': {
      S.profile.username = ($('#fUser').value.trim() || 'thaovy').replace(/[^a-zA-Z0-9_.]/g, '');
      S.profile.display_name = $('#fName').value.trim() || 'Bạn';
      S.profile.avatar = $('#fAvatar').value.trim() || '🌷';
      save(); render(); toast('Đã cập nhật', 'Hồ sơ của bạn đã được lưu.', 'ok'); break;
    }
    case 'demo-only': toast('Chỉ khả dụng ở bản production', 'Bản preview không có server để đổi mật khẩu.', 'info'); break;
    case 'reset-demo':
      confirmAsk({ icon: '♻️', tint: 'var(--aqua-2)', danger: false, title: 'Đặt lại dữ liệu demo?', msg: 'Toàn bộ thay đổi của bạn sẽ bị thay bằng bộ sản phẩm mẫu.', ok: 'Đặt lại', onOk: () => { localStorage.removeItem(LS_KEY); location.reload(); } });
      break;
    case 'clear-demo':
      confirmAsk({ title: 'Xóa trắng mọi dữ liệu?', msg: 'Sản phẩm, danh mục và ngân sách sẽ bị xóa khỏi trình duyệt.', ok: 'Xóa hết', onOk: () => { S.products = []; save(); render(); toast('Đã xóa', 'Danh sách trống trơn ❤️', 'ok'); } });
      break;
    case 'retry-fetch': fetchMetaDemo($('#urlInput').value.trim()); break;
    case 'cat-add': askCategory(null); break;
  }
});
function askDeleteCategory(cid2) {
  const c = catById(cid2); if (!c) return;
  const inUse = S.products.filter(p => p.category_id === c.id).length;
  confirmAsk({
    title: `Xóa danh mục “${c.name}”?`,
    msg: inUse ? `${inUse} sản phẩm sẽ được chuyển sang danh mục “Khác”.` : 'Danh mục trống — xóa an toàn.',
    ok: 'Xóa danh mục',
    onOk: () => {
      let other = S.cats.find(x => x.name === 'Khác');
      if (!other) { other = { id: uid(), name: 'Khác' }; S.cats.push(other); }
      S.products.forEach(p => { if (p.category_id === c.id) p.category_id = other.id; });
      S.cats = S.cats.filter(x => x.id !== c.id);
      save(); render(); toast('Đã xóa danh mục', `“${c.name}” đã được gỡ khỏi list.`, 'ok');
    },
  });
}
function askDeleteAdminProduct(pid) {
  const p3 = S.products.find(x => x.id === pid); if (!p3) return;
  confirmAsk({ title: 'Xóa sản phẩm này? (admin)', msg: p3.product_name.slice(0, 60), ok: 'Xóa sản phẩm',
    onOk: () => { S.products = S.products.filter(x => x.id !== pid); save(); render(); toast('Admin: đã xóa sản phẩm', '', 'ok'); } });
}

/* generic modal for category */
function askCategory(existingId) {
  const c = existingId ? catById(existingId) : null;
  $('#genericTitle').innerHTML = `${ic('tag')} ${c ? 'Đổi tên danh mục' : 'Danh mục mới'}`;
  $('#genericBody').innerHTML = `<label class="lbl">Tên danh mục</label><input class="input" id="gCatName" maxlength="32" placeholder="Ví dụ: Đồ cho phòng, Quà tặng…" value="${c ? esc(c.name) : ''}" />`;
  $('#genericFoot').innerHTML = `<button class="btn btn-ghost" data-close="modalGeneric">Hủy</button><button class="btn btn-primary" id="gCatOk">${c ? 'Lưu' : 'Tạo danh mục'}</button>`;
  openModal('modalGeneric');
  setTimeout(() => $('#gCatName').focus(), 50);
  $('#gCatOk').onclick = () => {
    const name = $('#gCatName').value.trim();
    if (!name) return toast('Tên chưa hợp lệ', 'Hãy nhập tên danh mục.', 'err');
    if (S.cats.some(x => x.name.toLowerCase() === name.toLowerCase() && x.id !== existingId)) return toast('Đã tồn tại', 'Bạn đã có danh mục trùng tên.', 'err');
    if (c) { c.name = name; toast('Đã cập nhật', `Danh mục đổi thành “${name}”.`, 'ok'); }
    else { S.cats.push({ id: uid(), name }); toast('Đã thêm danh mục', `“${name}” đã sẵn sàng 🎀`, 'ok'); }
    save(); closeModal('modalGeneric'); render();
  };
}

/* budget controls */
document.addEventListener('click', e => {
  const m = e.target.closest('[data-budget-prev],[data-budget-next]');
  if (m) {
    let d = new Date(S.budgetMonth.y, S.budgetMonth.m - 1 + (m.hasAttribute('data-budget-next') ? 1 : -1), 1);
    S.budgetMonth = { m: d.getMonth() + 1, y: d.getFullYear() }; save(); render();
  }
  const set = e.target.closest('[data-budget-set]');
  if (set) {
    const cur = budgetFor(S.budgetMonth.m, S.budgetMonth.y);
    $('#genericTitle').innerHTML = `${ic('wallet')} Ngân sách tháng ${S.budgetMonth.m}/${S.budgetMonth.y}`;
    $('#genericBody').innerHTML = `
      <label class="lbl">Số tiền dự kiến chi tối đa (VNĐ)</label>
      <input class="input" id="gBudget" type="number" min="0" step="100000" value="${cur || ''}" placeholder="Ví dụ: 5.000.000" />
      <div class="hint" style="margin-top:10px">${ic('info')} Chỉ tính “Dự định mua” và “Ưu tiên mua”.</div>`;
    $('#genericFoot').innerHTML = `<button class="btn btn-ghost" data-close="modalGeneric">Hủy</button><button class="btn btn-primary" id="gBudgetOk">Lưu ngân sách</button>`;
    openModal('modalGeneric');
    $('#gBudgetOk').onclick = () => {
      const v = Math.max(0, Number($('#gBudget').value.replace(/[^\d.]/g, '')) || 0);
      S.budgets[`${S.budgetMonth.y}-${S.budgetMonth.m}`] = v; save(); closeModal('modalGeneric'); render();
      toast('Đã cập nhật ngân sách', `Tháng ${S.budgetMonth.m}/${S.budgetMonth.y}: ${money(v)}`, 'ok');
    };
    setTimeout(() => $('#gBudget')?.focus(), 50);
  }
  const fs = e.target.closest('[data-fstatus]');
  if (fs) { S.ui.status = fs.dataset.fstatus; save(); render(); }
  const tt = e.target.closest('[data-theme-set]');
  if (tt) { S.profile.theme = tt.dataset.themeSet; save(); applyTheme(); render(); toast('Đã đổi giao diện', '', 'info'); }
  const st2 = e.target.closest('[data-set-tab]');
  if (st2) {
    $$('.set-nav button').forEach(b => b.classList.toggle('on', b === st2));
    const k = st2.dataset.setTab;
    $('#setBody').innerHTML = k === 'theme' ? setTheme() : k === 'password' ? setPassword() : k === 'danger' ? setDanger() : setProfile(S.profile);
    const fa = $('#fAdmin'); if (fa) fa.onchange = () => { S.profile.admin = fa.checked; save(); renderSidebar(); toast('Đã cập nhật', fa.checked ? 'Đã bật menu Quản trị (demo).' : 'Đã ẩn menu Quản trị.', 'ok'); };
  }
});
document.addEventListener('change', e => {
  if (e.target.matches('[data-fcat]')) { S.ui.cat = e.target.value; save(); render(); }
  if (e.target.matches('[data-fsort]')) { S.ui.sort = e.target.value; save(); render(); }
});

/* search (debounced) */
const applySearch = debounce(() => { save(); const r = route(); if (r === 'landing') return; render(); }, 250);
$('#searchInput').addEventListener('input', e => {
  S.ui.query = e.target.value;
  const r = route();
  if (!['products', 'pending', 'priority', 'favorites', 'purchased'].includes(r)) go('products');
  applySearch();
});

/* add-modal wiring */
$('#btnFetch').addEventListener('click', () => fetchMetaDemo($('#urlInput').value.trim()));
$('#urlInput').addEventListener('keydown', e => { if (e.key === 'Enter') fetchMetaDemo($('#urlInput').value.trim()); });
$('#statusPills').addEventListener('click', e => {
  const b = e.target.closest('.pill'); if (!b) return;
  addState.status = b.dataset.status;
  $$('#statusPills .pill').forEach(x => x.classList.toggle('on', x === b));
});
$('#btnSave').addEventListener('click', saveProduct);
$('#sideAdd').addEventListener('click', openAdd);
$('#fab').addEventListener('click', openAdd);
$('#landStart').addEventListener('click', () => go('dashboard'));
$('#heroStart').addEventListener('click', () => { if (!S.entered) openAuth('register'); else go('dashboard'); });
$('#btnMenu').addEventListener('click', () => document.body.classList.toggle('side-open'));
$('#btnTheme').addEventListener('click', () => { S.profile.theme = S.profile.theme === 'dark' ? 'light' : 'dark'; save(); applyTheme(); });
$('#scrim').addEventListener('click', () => document.body.classList.remove('side-open'));

/* auth (demo modal) */
function openAuth(tab) {
  $('#genericTitle').innerHTML = `<span class="brand-mark sm">${BRAND_SVG}</span> ${tab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}`;
  $('#genericBody').innerHTML = `
    <div class="fchips" style="margin-bottom:14px">
      <button class="fchip ${tab === 'login' ? 'on' : ''}" data-auth-tab="login">Đăng nhập</button>
      <button class="fchip ${tab === 'register' ? 'on' : ''}" data-auth-tab="register">Đăng ký</button>
    </div>
    ${tab === 'register' ? '<label class="lbl">Tên hiển thị</label><input class="input" id="auName" placeholder="Ví dụ: Thảo Vy" style="margin-bottom:10px" />' : ''}
    <label class="lbl">Tên đăng nhập hoặc email</label>
    <input class="input" id="auUser" placeholder="manhhung / thaovy" style="margin-bottom:10px" value="${esc(S.profile.username)}" />
    <label class="lbl">Mật khẩu</label>
    <input class="input" id="auPass" type="password" placeholder="••••••••" />
    <div class="demo-note" style="margin-top:12px">Bản preview không có backend — mọi tài khoản chỉ là demo và dữ liệu chỉ nằm trong trình duyệt của bạn. Bản production dùng Supabase Auth.</div>`;
  $('#genericFoot').innerHTML = `<button class="btn btn-ghost" data-close="modalGeneric">Để sau</button><button class="btn btn-primary" id="auOk">${tab === 'login' ? 'Đăng nhập →' : 'Tạo tài khoản →'}</button>`;
  openModal('modalGeneric');
  $$('#genericBody [data-auth-tab]').forEach(b => b.onclick = () => openAuth(b.dataset.authTab));
  $('#auOk').onclick = () => {
    const u = ($('#auUser').value || 'thaovy').split('@')[0].replace(/[^a-zA-Z0-9_.]/g, '') || 'thaovy';
    S.profile.username = u;
    const nm = $('#auName')?.value.trim();
    if (nm) S.profile.display_name = nm;
    save(); closeModal('modalGeneric'); go('dashboard'); render();
    toast(tab === 'login' ? `Chào mừng trở lại, ${esc(S.profile.display_name)}!` : 'Tạo tài khoản (demo) thành công', 'Trải nghiệm tự do — dữ liệu chỉ nằm trên máy bạn.', 'ok');
  };
}
document.addEventListener('click', e => { if (e.target.closest('[data-open="auth"]')) openAuth('login'); });

/* init */
window.addEventListener('hashchange', render);
if (S.entered && route() === 'landing' && location.hash === '') location.hash = '#/dashboard';
paintLanding(); render();
save();
