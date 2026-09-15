"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, FileSpreadsheet, Heart, Plus, ShoppingBag, Star } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { ProductCard } from "@/components/products/ProductCard";

/**
 * Tổng quan — bản "Cyan Minimal": header chào gọn · một hàng chip số liệu
 * (bấm để lọc đúng trạng thái, giữ nguyên chức năng cũ) · dải sản phẩm nổi bật.
 * Toàn bộ logic dữ liệu dùng qua useApp, không đổi.
 */
export default function DashboardPage() {
  const { profile, stats, loading, error, products, setAddOpen, setBulkOpen, refreshAll, isAdmin } = useApp();
  const name = profile?.display_name || profile?.username || "bạn";

  const chips = [
    { key: "total", label: "Tổng", value: stats.total, icon: ShoppingBag, href: "/products", tint: "bg-teal-soft text-teal dark:text-teal-300" },
    { key: "pending", label: "Dự định", value: stats.PENDING, icon: Clock, href: "/products?status=PENDING", tint: "bg-baby-soft text-sky-500 dark:text-sky-300" },
    { key: "priority", label: "Ưu tiên", value: stats.PRIORITY, icon: Star, href: "/products?status=PRIORITY", tint: "bg-honey-soft text-amber-500 dark:text-amber-300" },
    { key: "favorite", label: "Yêu thích", value: stats.FAVORITE, icon: Heart, href: "/products?status=FAVORITE", tint: "bg-pinky-soft text-[#EC4899] dark:text-[#F9A8D4]" },
    { key: "purchased", label: "Đã mua", value: stats.PURCHASED, icon: CheckCircle2, href: "/products?status=PURCHASED", tint: "bg-mint-soft text-mint dark:text-[#6EE7B7]" },
  ];

  return (
    <div className="space-y-5">
      {/* ── header chào — gọn, không trang trí ── */}
      <section className="rise-in mt-1 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[1.5rem] font-extrabold leading-tight tracking-tight">
            Chào {name}! <span className="align-middle">👋</span>
          </h1>
          <p className="mt-0.5 text-[.95rem] font-semibold text-muted">Bạn đang muốn mua gì hôm nay?</p>
        </div>
        {isAdmin ? (
          <div className="flex items-center gap-2">
            <Button className="rounded-full px-4" variant="soft" onClick={() => setBulkOpen(true)}>
              <FileSpreadsheet className="h-4 w-4" /> Nhập hàng loạt
            </Button>
            <Button className="rounded-full px-5" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Thêm sản phẩm
            </Button>
          </div>
        ) : null}
      </section>

      {/* ── thống kê nhỏ — một hàng chip, bấm là lọc ── */}
      <section className="no-scrollbar rise-in -mx-3.5 flex gap-2.5 overflow-x-auto px-3.5 pb-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" aria-label="Thống kê danh sách" style={{ animationDelay: "60ms" }}>
        {chips.map((c) => (
          <Link
            key={c.key}
            href={c.href}
            className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-2 pr-3.5 text-[.82rem] font-bold shadow-card transition hover:-translate-y-[2px] hover:border-teal/45"
          >
            <span className={`chip-tilt flex h-6 w-6 items-center justify-center rounded-full ${c.tint}`}>
              <c.icon className="h-3.5 w-3.5" />
            </span>
            <span className="text-muted">{c.label}</span>
            <b className="font-extrabold tracking-tight">{loading ? "·" : c.value}</b>
          </Link>
        ))}
      </section>

      {error ? <ErrorState message={error} onRetry={() => void refreshAll()} /> : null}

      {/* ── toàn bộ sản phẩm — xếp hàng · cột, 5 ô mỗi hàng trên desktop ── */}
      {products.length > 0 ? (
        <section className="rise-in" style={{ animationDelay: "120ms" }}>
          <div className="mb-3 flex items-baseline gap-3">
            <h2 className="text-[1.02rem] font-extrabold tracking-tight">Toàn bộ sản phẩm</h2>
            <span className="text-[.78rem] font-bold text-muted">{products.length}</span>
            <Link
              href="/products"
              className="ml-auto inline-flex items-center gap-1 text-[.82rem] font-bold text-teal-ink hover:underline dark:text-teal-200"
            >
              Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-5">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      ) : error ? null : loading ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-[3/4.1] rounded-card border border-line bg-surface p-2 shadow-card">
              <div className="shimmer h-full w-full rounded-[12px]" />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Chưa có sản phẩm nào"
          message={
            isAdmin
              ? "Thêm từng link hoặc dùng “Nhập hàng loạt” từ file Excel — mỗi dòng một link, web tự lấy thông tin."
              : "Admin sẽ sớm cập nhật những món đồ đáng yêu tại đây ♥"
          }
          cta={isAdmin}
        />
      )}
    </div>
  );
}
