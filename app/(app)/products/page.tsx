"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileSpreadsheet, Plus, SlidersHorizontal, X, RefreshCw } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { ProductCard } from "@/components/products/ProductCard";
import { RefreshPricesModal } from "@/components/products/RefreshPricesModal";
import { cn } from "@/lib/utils";
import { MARKETPLACE_META, STATUS_META } from "@/lib/config";
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

  const { products, categories, loading, error, refreshAll, query, setQuery, setAddOpen, setBulkOpen, isAdmin } = useApp();
  const [chip, setChip] = useState<(typeof STATUS_KEYS)[number]>("ALL");
  const [panel, setPanel] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panel]);
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
  const activeCount =
    (status !== "ALL" ? 1 : 0) + (cat !== "ALL" ? 1 : 0) + (mpf !== "ALL" ? 1 : 0) + (query.trim() ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 pt-4">
        <div>
          <h1 className="text-[1.45rem] font-extrabold tracking-tight">{head.t}</h1>
          <p className="mt-0.5 text-sm text-muted">{head.s}</p>
        </div>
        {isAdmin ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setPriceOpen(true)}>
              <RefreshCw className="h-4 w-4" /> Đồng bộ giá
            </Button>
            <Button size="sm" variant="soft" onClick={() => setBulkOpen(true)}>
              <FileSpreadsheet className="h-4 w-4" /> Nhập hàng loạt
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Thêm sản phẩm
            </Button>
          </div>
        ) : null}
      </div>

      {/* ── Lọc tìm — một nút gọn, bảng lọc mở trong panel (bottom-sheet trên mobile) ── */}
      <div className="relative" ref={barRef}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPanel((v) => !v)}
            aria-expanded={panel}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[.84rem] font-bold transition active:scale-[.97]",
              activeCount > 0 || panel
                ? "border-teal bg-aqua-mist text-teal-ink dark:bg-teal-950 dark:text-teal-200"
                : "border-line bg-surface text-ink hover:border-teal"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" /> Lọc tìm
            {activeCount > 0 ? (
              <span className="btn-primary flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[.66rem] font-extrabold text-white">
                {activeCount}
              </span>
            ) : null}
          </button>

          {query.trim() ? (
            <button onClick={() => setQuery("")} className="chip-active inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[.76rem] font-bold text-muted transition hover:border-rose hover:text-rose">
              “{query.trim().slice(0, 20)}” <X className="h-3 w-3" />
            </button>
          ) : null}
          {!chipMode ? (
            <button onClick={() => (window.location.href = "/products")} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[.76rem] font-bold text-muted transition hover:border-teal">
              {STATUS_META[urlStatus ?? "PENDING"]?.label ?? "Lọc"} <X className="h-3 w-3" />
            </button>
          ) : null}

          <span className="ml-auto text-[.78rem] font-semibold text-muted">
            <b className="text-ink">{list.length}</b> sản phẩm
          </span>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-field !w-auto !rounded-full !py-1.5 !text-[.78rem] font-semibold" aria-label="Sắp xếp">
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="price_asc">Giá ↑</option>
            <option value="price_desc">Giá ↓</option>
            <option value="name_az">Tên A→Z</option>
          </select>
        </div>

        {panel ? (
          <>
            <div className="fixed inset-0 z-[115] bg-slate-900/35 fade-in" onClick={() => setPanel(false)} />
            <div
              className="z-[120] rounded-t-[22px] border border-line bg-surface p-4 shadow-pop md:pop-in md:rounded-[18px] fixed inset-x-0 bottom-0 pb-[calc(14px+env(safe-area-inset-bottom))] md:absolute md:inset-x-auto md:bottom-auto md:left-0 md:top-[calc(100%+8px)] md:w-[min(660px,92vw)]"
              role="dialog"
              aria-label="Bảng lọc"
            >
              <div className="mb-3 flex items-center justify-between md:hidden">
                <p className="text-sm font-extrabold">Lọc tìm</p>
                <button onClick={() => setPanel(false)} aria-label="Đóng bảng lọc" className="flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-teal-soft"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="mb-1.5 text-[.68rem] font-extrabold uppercase tracking-wide text-muted">Trạng thái</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_KEYS.map((k) => (
                      <FChip key={k} on={status === k} onClick={() => { if (chipMode) setChip(k); else window.location.href = k === "ALL" ? "/products" : `/products?status=${k}`; }}>
                        {k === "ALL" ? "Tất cả" : STATUS_META[k].label}
                      </FChip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[.68rem] font-extrabold uppercase tracking-wide text-muted">Đến từ</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["ALL", "SHOPEE", "TIKTOK_SHOP"] as const).map((m) => (
                      <FChip key={m} on={mpf === m} onClick={() => setMpf(m)}>
                        {m === "ALL" ? "Mọi sàn" : MARKETPLACE_META[m].label} <b>{mpCounts[m]}</b>
                      </FChip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[.68rem] font-extrabold uppercase tracking-wide text-muted">Danh mục</p>
                  <div className="flex flex-wrap gap-1.5">
                    <FChip on={cat === "ALL"} onClick={() => setCat("ALL")}>Tất cả <b>{catCounts.ALL ?? 0}</b></FChip>
                    {categories.map((c) => (
                      <FChip key={c.id} on={cat === c.id} onClick={() => setCat(cat === c.id ? "ALL" : c.id)}>{c.name} <b>{catCounts[c.id] ?? 0}</b></FChip>
                    ))}
                    {(catCounts.NONE ?? 0) > 0 ? (
                      <FChip on={cat === "NONE"} onClick={() => setCat(cat === "NONE" ? "ALL" : "NONE")}>Chưa phân loại <b>{catCounts.NONE}</b></FChip>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="mt-3.5 flex items-center justify-between border-t border-line pt-2.5">
                <button
                  onClick={() => { setChip("ALL"); setCat("ALL"); setMpf("ALL"); setQuery(""); if (!chipMode) window.location.href = "/products"; }}
                  className="text-[.78rem] font-bold text-muted underline decoration-dotted transition hover:text-rose"
                >
                  Xoá hết bộ lọc
                </button>
                <Button size="sm" onClick={() => setPanel(false)}>Xem {list.length} kết quả</Button>
              </div>
            </div>
          </>
        ) : null}
      </div>


      {error ? <ErrorState message={error} onRetry={() => void refreshAll()} /> : null}

      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : list.length ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-5">
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

      <RefreshPricesModal open={priceOpen} onClose={() => setPriceOpen(false)} />
    </div>
  );
}

function FChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-[.76rem] font-semibold transition active:scale-[.97]",
        on ? "border-teal bg-aqua-mist text-teal-ink dark:bg-teal-950 dark:text-teal-200" : "border-line bg-surface text-muted hover:border-teal"
      )}
    >
      {children}
    </button>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton count={8} />}>
      <ProductsView />
    </Suspense>
  );
}
