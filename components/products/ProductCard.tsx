"use client";

import { useState } from "react";
import { Check, Star, Heart, ExternalLink, Quote } from "lucide-react";
import type { Product } from "@/types";
import { MARKETPLACE_META, STATUS_META, FALLBACK_IMAGE } from "@/lib/config";
import { cn, formatVnd } from "@/lib/utils";
import { useApp } from "@/components/providers/AppProvider";

/**
 * Card sản phẩm theo mock "Aqua Pastel":
 * ảnh 4:3 (badge trạng thái góc trái, nút tim góc phải) · pill sàn + tên ·
 * giá SAN HÔ nổi bật · danh mục nhỏ · "Mua ngay" full-width — tim nằm cạnh nút.
 * Bấm vào ảnh/tên = mở Chi tiết. compact = bản mini cho dải cuộn ngang.
 * © _hngnguynn_
 */
export function ProductCard({ product, index = 0, compact = false }: { product: Product; index?: number; compact?: boolean }) {
  const { patchProduct, setDetailProduct, setReviewProduct, isAdmin, guestFavs, toggleGuestFav } = useApp();
  const st = STATUS_META[product.status];
  const mp = MARKETPLACE_META[product.marketplace] ?? MARKETPLACE_META.OTHER;
  const isFav = isAdmin ? product.status === "FAVORITE" : guestFavs.has(product.id);
  const hasPrice = product.price != null || !!product.price_label;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <article
      role={isAdmin ? "button" : undefined}
      tabIndex={isAdmin ? 0 : undefined}
      aria-label={isAdmin ? `Xem chi tiết: ${product.product_name}` : undefined}
      style={{ animationDelay: `${Math.min(index * 45, 270)}ms` }}
      onClick={isAdmin ? () => setDetailProduct(product) : undefined}
      onKeyDown={isAdmin ? (e) => (e.key === "Enter" || e.key === " ") && setDetailProduct(product) : undefined}
      className={cn(
        "rise-in group relative flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition duration-200 hover:-translate-y-[3px] hover:border-teal/45 hover:shadow-lift",
        isAdmin ? "cursor-pointer focus-visible:outline-2 focus-visible:outline-teal" : "cursor-default"
      )}
    >
      {/* media */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-aqua-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image_url || FALLBACK_IMAGE}
          alt={product.product_name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.045]"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
          }}
        />
        <div className="absolute left-2.5 top-2.5 z-10">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[.68rem] font-bold backdrop-blur-0", st.chip)}>
            {product.status === "PRIORITY" ? <Star className="h-3 w-3 fill-current" /> : null}
            {product.status === "PURCHASED" ? <Check className="h-3 w-3" /> : null}
            {product.status === "FAVORITE" ? <Heart className="h-3 w-3 fill-current" /> : null}
            {st.short}
          </span>
        </div>
      </div>

      {/* body */}
      <div className={cn("flex flex-1 flex-col gap-1.5", compact ? "p-2.5" : "p-3.5")}>
        <div className="flex items-center gap-1.5">
          <span className={cn("inline-flex items-center gap-1 rounded-[9px] px-2 py-[3px] text-[.68rem] font-extrabold", mp.badge)}>
            <i className="not-italic">{mp.letter}</i>
            {mp.label}
          </span>
          {product.category ? (
            <span className="truncate text-[.7rem] font-semibold text-muted">{product.category.name}</span>
          ) : null}
        </div>
        <h4 className={cn("line-clamp-2 font-bold leading-snug tracking-tight", compact ? "text-[.8rem]" : "text-[.9rem] min-h-[2.6em]")}>
          {isAdmin ? (
            product.product_name
          ) : (
            <button
              type="button"
              onClick={(e) => { stop(e); setReviewProduct(product); }}
              className="cursor-pointer text-left hover:underline hover:decoration-dotted hover:underline-offset-2"
              aria-label={`Xem mách nhỏ: ${product.product_name}`}
            >
              {product.product_name}
            </button>
          )}
        </h4>
        {!isAdmin && product.owner_note ? (
          <p className="-mt-1 flex items-center gap-1 text-[.68rem] font-extrabold text-teal-ink dark:text-teal-200">
            <Quote className="h-3 w-3 flex-none" /> có mách nhỏ — bấm tên nè
          </p>
        ) : null}
        {hasPrice ? (
          <p className={cn("font-extrabold tracking-tight text-ink", compact ? "text-[.86rem]" : "text-[1rem]")}>
            {product.price_label || formatVnd(product.price)}
          </p>
        ) : (
          <p className="text-[.8rem] font-semibold text-muted">Chưa có giá</p>
        )}

        <div className="mt-auto flex items-center gap-2 pt-1.5">
          <a
            href={product.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={stop}
            className="btn-primary flex h-[38px] flex-1 items-center justify-center gap-1.5 rounded-[12px] text-[.84rem] shadow-cta transition"
          >
            <ExternalLink className="h-4 w-4" /> Mua ngay
          </a>
          <button
            aria-label={isFav ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
            onClick={async (e) => {
              stop(e);
              if (isAdmin) await patchProduct(product.id, { status: isFav ? "PENDING" : "FAVORITE" });
              else toggleGuestFav(product.id);
            }}
            className={cn(
              "flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[12px] border transition active:scale-95",
              isFav
                ? "border-pinky bg-pinky-soft text-pinky"
                : "border-line bg-surface text-muted hover:border-pinky hover:text-pinky"
            )}
          >
            <Heart key={String(isFav)} className={cn("h-[17px] w-[17px]", isFav && "fav-pop fill-current")} />
          </button>
        </div>
      </div>
    </article>
  );
}
