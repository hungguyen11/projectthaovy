"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Heart, Plus, ShoppingBag, Sparkles, Star } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { ProductCard } from "@/components/products/ProductCard";
import { Logo } from "@/components/layout/Logo";

/**
 * Trang chủ theo mock "Aqua Pastel":
 * hero chào + 5 thẻ số liệu + dải "Sản phẩm nổi bật" cuộn ngang.
 */
export default function DashboardPage() {
  const { profile, stats, loading, error, products, setAddOpen, refreshAll } = useApp();
  const name = profile?.display_name || profile?.username || "bạn";

  const featured = [
    ...products.filter((p) => p.status === "PRIORITY" || p.status === "FAVORITE"),
    ...products.filter((p) => p.status === "PENDING"),
  ].slice(0, 8);

  const cards = [
    { key: "total", label: "Tổng sản phẩm", value: stats.total, icon: ShoppingBag, href: "/products", tint: "bg-teal-soft text-teal dark:text-teal-300" },
    { key: "pending", label: "Dự định mua", value: stats.PENDING, icon: Clock, href: "/products?status=PENDING", tint: "bg-baby-soft text-sky-500 dark:text-sky-300" },
    { key: "priority", label: "Ưu tiên mua", value: stats.PRIORITY, icon: Star, href: "/products?status=PRIORITY", tint: "bg-honey-soft text-amber-500 dark:text-amber-300" },
    { key: "favorite", label: "Yêu thích", value: stats.FAVORITE, icon: Heart, href: "/products?status=FAVORITE", tint: "bg-pinky-soft text-[#FB72A8] dark:text-[#F9A8D4]" },
    { key: "purchased", label: "Đã mua", value: stats.PURCHASED, icon: CheckCircle2, href: "/products?status=PURCHASED", tint: "bg-mint-soft text-mint dark:text-[#6EE7B7]" },
  ];

  return (
    <div className="space-y-6">
      {/* ═══ HERO ═══ */}
      <section className="rise-in hero-mint relative mt-4 overflow-hidden rounded-[22px] border border-line/70 px-6 py-7 md:px-8">
        <div className="pointer-events-none absolute -bottom-8 left-6 h-24 w-40 rounded-[50%] bg-teal/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center gap-6 md:flex-nowrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-[1.65rem] font-extrabold leading-tight tracking-tight md:text-[1.85rem]">
              Chào {name}! <span className="inline-block animate-floaty">👋</span>
            </h1>
            <p className="mt-1 text-[1.05rem] font-bold leading-snug text-ink/90">Bạn đang muốn mua gì hôm nay?</p>
            <p className="mt-1.5 max-w-[46ch] text-[.85rem] leading-relaxed text-muted">
              Lưu lại những món đồ bạn thích để dễ dàng tìm lại và mua khi cần.
            </p>
            <Button className="mt-4 rounded-full px-5" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Thêm sản phẩm
            </Button>
          </div>

          {/* minh họa — túi xách + quote viết tay, đúng bố cục mock */}
          <div className="relative hidden w-[300px] flex-none items-center justify-center lg:flex">
            <div className="animate-floaty flex h-[112px] w-[112px] items-center justify-center rounded-[30px] bg-surface shadow-pop">
              <Logo size={78} />
            </div>
            <Sparkles className="absolute -left-2 top-2 h-5 w-5 text-teal opacity-70" />
            <Heart className="absolute right-3 top-6 h-4 w-4 fill-pinky text-pinky opacity-90" />
            <Star className="absolute -bottom-1 left-6 h-4 w-4 text-amber-400 opacity-80" />
            <p className="hand absolute -right-1 top-[-34px] w-[190px] text-right text-[.9rem] leading-snug text-[#2B6B66] dark:text-teal-200">
              Những điều tốt đẹp luôn bắt đầu từ những điều nhỏ bé ♡
            </p>
          </div>
        </div>
      </section>

      {/* ═══ 5 THẺ SỐ LIỆU ═══ */}
      <section className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5" aria-label="Thống kê danh sách">
        {cards.map((c, i) => (
          <Link
            key={c.key}
            href={c.href}
            className="rise-in group flex flex-col gap-2 rounded-card border border-line bg-surface p-4 shadow-card transition hover:-translate-y-[3px] hover:border-teal/45 hover:shadow-lift"
            style={{ animationDelay: `${60 + i * 40}ms` }}
          >
            <p className="text-[.74rem] font-bold text-muted">{c.label}</p>
            <div className="flex items-end justify-between gap-2">
              <p className="text-[1.55rem] font-extrabold leading-none tracking-tight">{loading ? "·" : c.value}</p>
              <span className={`flex h-10 w-10 items-center justify-center rounded-full ${c.tint} transition group-hover:scale-110`}>
                <c.icon className="h-[19px] w-[19px]" />
              </span>
            </div>
          </Link>
        ))}
      </section>

      {error ? <ErrorState message={error} onRetry={() => void refreshAll()} /> : null}

      {/* ═══ SẢN PHẨM NỔI BẬT ═══ */}
      <section className="rise-in" style={{ animationDelay: "200ms" }}>
        <div className="mb-3 flex items-baseline gap-3">
          <h2 className="text-[1.06rem] font-extrabold tracking-tight">Sản phẩm nổi bật</h2>
          <Link href="/products" className="ml-auto inline-flex items-center gap-1 text-[.82rem] font-bold text-teal-ink hover:underline dark:text-teal-200">
            Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4.1] rounded-card border border-line bg-surface p-2 shadow-card">
                <div className="shimmer h-full w-full rounded-[12px]" />
              </div>
            ))}
          </div>
        ) : featured.length ? (
          <div className="-mx-1 flex snap-x gap-3.5 overflow-x-auto px-1 pb-2">
            {featured.map((p, i) => (
              <div key={p.id} className="w-[226px] flex-none snap-start">
                <ProductCard product={p} index={i} compact />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Chưa có sản phẩm nào"
            message="Thêm những sản phẩm bạn đang quan tâm để dễ theo dõi và mua sau."
          />
        )}
      </section>
    </div>
  );
}
