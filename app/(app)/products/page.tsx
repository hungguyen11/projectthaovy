"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { ProductCard } from "@/components/products/ProductCard";
import { cn } from "@/lib/utils";
import { STATUS_META } from "@/lib/config";
import type { ProductStatus } from "@/types";

const TITLE: Record<string, { t: string; s: string }> = {
  ALL: { t: "Tất cả sản phẩm", s: "Toàn bộ list của bạn — tìm, lọc, sắp xếp tùy ý." },
  PENDING: { t: "Dự định mua", s: "Những món đang cân nhắc — lưu lại trước, mua sau." },
  PRIORITY: { t: "Ưu tiên mua", s: "Những món nên “chốt” sớm nhất." },
  FAVORITE: { t: "Yêu thích", s: "Ghé mắt mỗi ngày, chưa cần tiền vội ♥" },
  PURCHASED: { t: "Đã mua", s: "Kỷ niệm những lần xử lý xong list 🎉" },
};

const STATUS_KEYS = ["ALL", "PENDING", "PRIORITY", "FAVORITE", "PURCHASED"] as const;

function ProductsView() {
  const sp = useSearchParams();
  const urlStatus = (sp.get("status") as ProductStatus | null) ?? null;
  const chipMode = !urlStatus; // trang /products cho phép đổi status bằng chip

  const { products, categories, loading, error, refreshAll, query, setQuery, setAddOpen } = useApp();
  const [chip, setChip] = useState<(typeof STATUS_KEYS)[number]>("ALL");
  const [cat, setCat] = useState<string>("ALL");
  const [mpf, setMpf] = useState<"ALL" | "SHOPEE" | "TIKTOK_SHOP">("ALL");
  const [sort, setSort] = useState("newest");

  const status = chipMode ? chip : urlStatus;

  const list = useMemo(() => {
    let l = products.filter((p) => (status === "ALL" ? true : p.status === status));
    const q = query.trim().toLowerCase();
    if (q) l = l.filter((p) => p.product_name.toLowerCase().includes(q) || (p.category?.name ?? "").toLowerCase().includes(q));
    if (cat !== "ALL") l = l.filter((p) => (cat === "NONE" ? !p.category_id : p.category_id === cat));
    if (mpf !== "ALL") l = l.filter((p) => p.marketplace === mpf);
    const s = [...l];
    switch (sort) {
      case "oldest": s.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)); break;
      case "price_asc": s.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)); break;
      case "price_desc": s.sort((a, b) => (b.price ?? -1) - (a.price ?? -1)); break;
      case "name_az": s.sort((a, b) => a.product_name.localeCompare(b.product_name, "vi")); break;
      default: s.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }
    return s;
  }, [products, status, query, cat, mpf, sort]);

  /** Đếm theo sàn — chip Shopee/TikTok hiện số, bấm là lọc đúng "sàn nhà mình". */
  const mpCounts = useMemo(() => {
    const base = products.filter((p) => (status === "ALL" ? true : p.status === status));
    return {
      ALL: base.length,
      SHOPEE: base.filter((p) => p.marketplace === "SHOPEE").length,
      TIKTOK_SHOP: base.filter((p) => p.marketplace === "TIKTOK_SHOP").length,
    };
  }, [products, status]);

  /** Đếm theo danh mục ngay trong trạng thái đang xem — chip hiện số, bấm là lọc. */
  const catCounts = useMemo(() => {
    const base = products.filter((p) => (status === "ALL" ? true : p.status === status));
    const map: Record<string, number> = { ALL: base.length, NONE: 0 };
    for (const p of base) {
      if (p.category_id) map[p.category_id] = (map[p.category_id] ?? 0) + 1;
      else map.NONE += 1;
    }
    return map;
  }, [products, status]);

  const head = TITLE[status ?? "ALL"] ?? TITLE.ALL!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 pt-4">
        <div>
          <h1 className="text-[1.45rem] font-extrabold tracking-tight">{head.t}</h1>
          <p className="mt-0.5 text-sm text-muted">{head.s}</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Thêm sản phẩm
        </Button>
      </div>

      {/* lọc theo trạng thái */}
      <div className="flex flex-wrap items-center gap-2">
        {chipMode
          ? STATUS_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => setChip(k)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-[.82rem] font-semibold transition active:scale-[.97]",
                  chip === k
                    ? "border-teal-deep bg-teal-deep text-white shadow-cta"
                    : "border-line bg-surface text-muted hover:border-teal hover:text-teal-ink dark:hover:text-teal-200"
                )}
              >
                {k === "ALL" ? "Tất cả" : STATUS_META[k].label}
              </button>
            ))
          : (
            <button
              onClick={() => (window.location.href = "/products")}
              className="rounded-full border border-line bg-surface px-4 py-1.5 text-[.82rem] font-semibold text-muted transition hover:border-teal"
            >
              ← Xem tất cả
            </button>
          )}
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-field ml-auto !w-auto !rounded-full !py-1.5 !text-[.82rem] font-semibold" aria-label="Sắp xếp">
          <option value="newest">Mới thêm nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="price_asc">Giá thấp → cao</option>
          <option value="price_desc">Giá cao → thấp</option>
          <option value="name_az">Tên A → Z</option>
        </select>
      </div>

      {/* lọc theo sàn — 2 sàn chính được ưu tiên thành chip riêng */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[.72rem] font-bold uppercase tracking-wide text-muted">Đến từ:</span>
        {(
          [
            { k: "ALL", label: "Tất cả sàn", cls: mpf === "ALL" ? "border-teal bg-aqua-mist text-teal-ink dark:bg-teal-950 dark:text-teal-200" : "" },
            { k: "SHOPEE", label: "Shopee", cls: "border-[#EE4D2D] bg-[#EE4D2D] text-white" },
            { k: "TIKTOK_SHOP", label: "TikTok Shop", cls: "border-[#0B0B0B] bg-[#0B0B0B] text-white dark:border-[#E9E5F5] dark:bg-[#E9E5F5] dark:text-[#14121A]" },
          ] as const
        ).map((m) => (
          <button
            key={m.k}
            onClick={() => setMpf(m.k)}
            className={cn(
              "rounded-full border px-3.5 py-1 text-[.78rem] font-bold transition active:scale-[.97]",
              mpf === m.k
                ? m.cls || "border-teal bg-aqua-mist text-teal-ink dark:bg-teal-950 dark:text-teal-200"
                : "border-line bg-surface text-muted hover:border-teal hover:text-ink"
            )}
          >
            {m.label} <b>{mpCounts[m.k] ?? 0}</b>
          </button>
        ))}
        {mpf !== "ALL" ? (
          <button onClick={() => setMpf("ALL")} className="text-[.74rem] font-bold text-teal-ink underline decoration-dotted underline-offset-2 dark:text-teal-200">
            bỏ lọc sàn
          </button>
        ) : null}
      </div>

      {/* lọc nhanh theo danh mục */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[.72rem] font-bold uppercase tracking-wide text-muted">Danh mục:</span>
        <button
          onClick={() => setCat("ALL")}
          className={cn(
            "rounded-full border px-3 py-1 text-[.78rem] font-semibold transition active:scale-[.97]",
            cat === "ALL" ? "border-teal bg-aqua-mist text-teal-ink dark:bg-teal-950 dark:text-teal-200" : "border-line bg-surface text-muted hover:border-teal"
          )}
        >
          Tất cả <b>{catCounts.ALL ?? 0}</b>
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(cat === c.id ? "ALL" : c.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-[.78rem] font-semibold transition active:scale-[.97]",
              cat === c.id ? "border-teal bg-aqua-mist text-teal-ink dark:bg-teal-950 dark:text-teal-200" : "border-line bg-surface text-muted hover:border-teal"
            )}
          >
            {c.name} <b>{catCounts[c.id] ?? 0}</b>
          </button>
        ))}
        {(catCounts.NONE ?? 0) > 0 ? (
          <button
            onClick={() => setCat(cat === "NONE" ? "ALL" : "NONE")}
            className={cn(
              "rounded-full border border-dashed px-3 py-1 text-[.78rem] font-semibold transition active:scale-[.97]",
              cat === "NONE" ? "border-teal bg-aqua-mist text-teal-ink dark:bg-teal-950 dark:text-teal-200" : "border-line text-muted hover:border-teal"
            )}
          >
            Chưa phân loại <b>{catCounts.NONE}</b>
          </button>
        ) : null}
      </div>

      <p className="text-[.8rem] font-semibold text-muted">
        <b className="text-ink">{list.length}</b> sản phẩm
        {query.trim() ? <> cho từ khóa “<b className="text-ink">{query.trim()}</b>”</> : null}
        {query.trim() ? (
          <button onClick={() => setQuery("")} className="ml-2 font-bold text-teal-ink underline decoration-dotted dark:text-teal-200">
            Xóa tìm kiếm
          </button>
        ) : null}
      </p>

      {error ? <ErrorState message={error} onRetry={() => void refreshAll()} /> : null}

      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : list.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 xl:grid-cols-4">
          {list.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={status === "PURCHASED" ? "Chưa có món nào được mua 😌" : query.trim() ? "Không tìm thấy sản phẩm nào" : "Chưa có sản phẩm nào"}
          message={
            query.trim()
              ? "Thử từ khóa khác hoặc đổi bộ lọc nhé."
              : "Hãy lưu sản phẩm đầu tiên bằng cách dán link từ Shopee hoặc TikTok Shop."
          }
        />
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton count={8} />}>
      <ProductsView />
    </Suspense>
  );
}
