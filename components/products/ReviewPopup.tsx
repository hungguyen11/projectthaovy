"use client";

/**
 * Pop-up "Chủ list mách" — theo mockup desktop + mobile:
 * card nổi glow cyan · ảnh badge 🔥 + tagline viết tay có mũi tên ·
 * bong bóng review (avatar + 5sao + tim) · nút "Mua ngay" gradient với vệt sáng chạy.
 * Mobile: bản compact căn giữa theo chiều ngang màn hình, không chi tiết thừa.
 * Khách CHỈ xem / ♥ / mua — không sửa được gì. © _hngnguynn_
 */
import { useEffect, useState } from "react";
import { Check, Flame, Heart, Quote, ShoppingBag, Sparkles, Star } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/components/providers/AppProvider";
import { FALLBACK_IMAGE } from "@/lib/config";
import { draftCatchphrase } from "@/lib/review-gen";
import { cn, formatVnd, proxiedImg } from "@/lib/utils";

const BADGE_BY_STATUS: Record<string, { label: string; icon: typeof Star; cls: string }> = {
  FAVORITE: { label: "Được yêu thích", icon: Flame, cls: "bg-gradient-to-r from-cyan-400 to-sky-500" },
  PRIORITY: { label: "Đang hot", icon: Flame, cls: "bg-gradient-to-r from-cyan-400 to-sky-500" },
  PURCHASED: { label: "Đã mua", icon: Check, cls: "bg-gradient-to-r from-emerald-400 to-teal-500" },
  PENDING: { label: "Wishlist", icon: Star, cls: "bg-gradient-to-r from-sky-400 to-indigo-400" },
};

export function ReviewPopup() {
  const { reviewProduct: p, setReviewProduct, isAdmin, setDetailProduct, guestFavs, toggleGuestFav } = useApp();
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => setImgFailed(false), [p?.image_url]);

  const badge = (p && BADGE_BY_STATUS[p.status]) || BADGE_BY_STATUS.PENDING;
  const BadgeIcon = badge.icon;
  const tagline = p ? draftCatchphrase({ title: p.product_name, category: p.category?.name ?? null }) : null;
  const isFav = p ? (isAdmin ? p.status === "FAVORITE" : guestFavs.has(p.id)) : false;
  const price = p?.price_label || (p?.price != null ? formatVnd(p.price) : null);
  const note = p?.owner_note?.trim() || "";

  return (
    <Modal open={!!p} onClose={() => setReviewProduct(null)} size="md" glow>
      {p ? (
        <div
          key={p.id}
          className="rp-float relative w-[min(92vw,400px)] rounded-[22px] border border-cyan-200/70 bg-white p-2.5 shadow-[0_0_0_1px_rgba(186,230,253,.5),0_18px_50px_-12px_rgba(34,211,238,.4),0_0_80px_-20px_rgba(34,211,238,.55)] dark:border-cyan-400/20 dark:bg-[#0E1B2E] md:w-[420px] md:p-3.5"
        >
          <button
            onClick={() => setReviewProduct(null)}
            aria-label="Đóng"
            className="absolute right-2 top-2 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-cyan-200 bg-white text-slate-600 shadow-[0_2px_10px_rgba(8,47,73,.35)] ring-2 ring-white/70 transition hover:text-cyan-600 hover:shadow-[0_0_18px_rgba(34,211,238,.55)] active:scale-90 dark:border-cyan-400/25 dark:bg-[#152A44] dark:text-slate-200 dark:ring-cyan-950/60"
          >
            <svg viewBox="0 0 18 18" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" />
            </svg>
          </button>

          {/* ảnh + badge + tagline viết tay + tim */}
          <div className="rp-rise relative aspect-[16/10] w-full overflow-hidden rounded-[16px] bg-cyan-50 dark:bg-cyan-950/40" style={{ animationDelay: "40ms" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgFailed || !p.image_url ? FALLBACK_IMAGE : (proxiedImg(p.image_url) ?? FALLBACK_IMAGE)}
              alt=""
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
              onError={() => setImgFailed(true)}
            />
            <span className={cn("absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[.68rem] font-extrabold text-white shadow-cta", badge.cls)}>
              <BadgeIcon className="h-3 w-3 fill-current" /> {badge.label}
            </span>
            <button
              onClick={() => !isAdmin && toggleGuestFav(p.id)}
              aria-label={isFav ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
              className={cn(
                "absolute bottom-2 left-2 z-20 flex h-10 w-10 items-center justify-center rounded-full shadow-card backdrop-blur transition active:scale-90",
                isFav ? "bg-pinky text-white" : "bg-white/80 text-cyan-600 hover:bg-white dark:bg-slate-900/70 dark:text-cyan-300"
              )}
            >
              <Heart key={String(isFav)} className={cn("h-4 w-4", isFav && "fill-current fav-pop")} />
            </button>
            {tagline ? (
              <div className="pointer-events-none absolute bottom-2.5 right-3 flex items-start gap-1 text-right">
                <svg viewBox="0 0 34 26" className="mt-2.5 h-5 w-7 flex-none text-white/95 drop-shadow-[0_1px_6px_rgba(8,47,73,.9)]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M31 3C22 2 10 6 5 18" />
                  <path d="M11 15l-6 4 8 2" />
                </svg>
                <p className="font-hand rp-draw text-[.92rem] leading-tight text-white drop-shadow-[0_1px_8px_rgba(8,47,73,.9)]">{tagline}</p>
              </div>
            ) : null}
          </div>

          {/* bong bóng review */}
          <div className="rp-rise relative mt-3 rounded-[16px] border border-cyan-100 bg-cyan-50/70 p-3 dark:border-cyan-400/15 dark:bg-cyan-950/25" style={{ animationDelay: "130ms" }}>
            <span className="absolute -bottom-[6px] left-8 h-3 w-3 rotate-45 border-b border-r border-cyan-100 bg-cyan-50/90 dark:border-cyan-400/15 dark:bg-[#0b1626]" aria-hidden="true" />
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-sky-500 text-white shadow-card">
                <Quote className="h-4 w-4 fill-current" />
              </span>
              <div className="min-w-0">
                <p className="text-[.78rem] font-extrabold leading-none">Vy · chủ list</p>
                <p className="mt-1 flex items-center gap-[3px] text-cyan-500">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="rp-star h-3 w-3 fill-current" style={{ animationDelay: `${180 + i * 70}ms` }} />
                  ))}
                </p>
              </div>
              <span className="ml-auto grid h-8 w-8 flex-none place-items-center rounded-full text-cyan-500/90" aria-hidden="true">
                <Sparkles className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-[.9rem] font-bold leading-relaxed tracking-tight">
              “{note || "Chủ list chưa kịp viết gì cho món này — nhưng nhìn ảnh với giá là biết gu rồi đó."}”
            </p>
          </div>

          {/* tên + giá */}
          <div className="rp-rise mt-2.5 flex items-center gap-2 px-1 text-[.76rem] font-bold text-muted" style={{ animationDelay: "200ms" }}>
            <span className="line-clamp-1 min-w-0">{p.product_name}</span>
            {price ? <span className="ml-auto flex-none text-[.9rem] font-extrabold text-ink">{price}</span> : null}
          </div>

          {/* MUA NGAY — vệt sáng chạy + nút tròn mũi tên kiểu mockup */}
          <div className="rp-rise relative mt-2" style={{ animationDelay: "250ms" }}>
            <Sparkles className="pointer-events-none absolute -left-1 -top-2 h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
            <Sparkles className="pointer-events-none absolute -right-0.5 -bottom-2.5 h-3 w-3 text-cyan-300" aria-hidden="true" />
            <a
              href={p.source_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setReviewProduct(null)}
              className="rp-shine group flex h-[48px] w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 text-[.95rem] font-extrabold text-white shadow-[0_10px_26px_-8px_rgba(14,165,233,.6)] transition hover:brightness-105 active:scale-[.985]"
            >
              <span className="grid h-6 w-6 flex-none place-items-center rounded-md bg-white/20">
                <ShoppingBag className="h-3.5 w-3.5" />
              </span>
              Mua ngay
              <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-white text-cyan-600 transition group-hover:translate-x-0.5">
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 8h9M9 4.5 12.5 8 9 11.5" />
                </svg>
              </span>
            </a>
          </div>

          {isAdmin ? (
            <Button
              variant="soft"
              className="rp-rise mt-2.5 w-full [animation-delay:320ms]"
              onClick={() => {
                const cur = p;
                setReviewProduct(null);
                setDetailProduct(cur);
              }}
            >
              <Star className="h-4 w-4" /> Viết / sửa câu mách
            </Button>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
