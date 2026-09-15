"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Heart, Star, Trash2, Bookmark } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/components/providers/AppProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { FALLBACK_IMAGE, MARKETPLACE_META, STATUS_META } from "@/lib/config";
import { cn, formatVnd } from "@/lib/utils";
import type { Product, ProductStatus } from "@/types";

/**
 * "Chi tiết sản phẩm" theo mock: ảnh lớn bên trái, thông tin bên phải
 * (tên · giá · pill trạng thái · hộp "Thông tin sản phẩm"),
 * hành động: Mua ngay / Đánh dấu đã mua / Xóa + đổi trạng thái.
 */
export function ProductDetailModal() {
  const { detailProduct, setDetailProduct, patchProduct, deleteProduct } = useApp();
  const confirm = useConfirm();
  const p = detailProduct;

  return (
    <Modal
      open={!!p}
      onClose={() => setDetailProduct(null)}
      title="Chi tiết sản phẩm"
      size="lg"
      footer={
        p ? (
          <>
            <Button
              variant="ghost"
              className="!text-red-600 hover:!bg-rose-soft dark:!text-red-300"
              onClick={async () => {
                const ok = await confirm({
                  title: "Bạn có chắc muốn xóa sản phẩm này không?",
                  message: `“${p.product_name.slice(0, 60)}” sẽ bị xóa vĩnh viễn khỏi danh sách.`,
                  okText: "Xóa sản phẩm",
                });
                if (ok) {
                  void deleteProduct(p.id);
                  setDetailProduct(null);
                }
              }}
            >
              <Trash2 className="h-4 w-4" /> Xóa
            </Button>
            {p.status !== "PURCHASED" ? (
              <Button
                variant="soft"
                onClick={() => {
                  void patchProduct(p.id, { status: "PURCHASED" });
                  setDetailProduct(null);
                }}
              >
                <CheckCircle2 className="h-4 w-4" /> Đánh dấu đã mua
              </Button>
            ) : null}
            <a
              href={p.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex h-[40px] items-center justify-center gap-2 rounded-[12px] px-5 text-sm shadow-cta transition"
            >
              <ExternalLink className="h-4 w-4" /> Mua ngay
            </a>
          </>
        ) : null
      }
    >
      {p ? (
        <DetailBody
          key={p.id}
          product={p}
          onStatus={async (s) => {
            const res = await patchProduct(p.id, { status: s });
            if (res) setDetailProduct(res);
          }}
          onCategory={async (catId) => {
            const res = await patchProduct(p.id, { category_id: catId });
            if (res) setDetailProduct(res);
          }}
        />
      ) : null}
    </Modal>
  );
}

function DetailBody({
  product: p,
  onStatus,
  onCategory,
}: {
  product: Product;
  onStatus: (s: ProductStatus) => void;
  onCategory: (id: string | null) => void | Promise<void>;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const { categories } = useApp();
  const st = STATUS_META[p.status];
  const mp = MARKETPLACE_META[p.marketplace] ?? MARKETPLACE_META.OTHER;
  const statuses: { k: ProductStatus; icon: typeof Star }[] = [
    { k: "PENDING", icon: Bookmark },
    { k: "PRIORITY", icon: Star },
    { k: "FAVORITE", icon: Heart },
    { k: "PURCHASED", icon: CheckCircle2 },
  ];
  const dateStr = new Date(p.created_at).toLocaleDateString("vi-VN");

  return (
    <div className="grid gap-5 md:grid-cols-[250px_minmax(0,1fr)]">
      {/* ảnh */}
      <div className="relative aspect-square w-full overflow-hidden rounded-[18px] border border-line bg-aqua-soft md:max-w-[250px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgFailed || !p.image_url ? FALLBACK_IMAGE : p.image_url}
          alt={p.product_name}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
        <span className={cn("absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-[9px] px-2 py-1 text-[.7rem] font-extrabold shadow-card", mp.badge)}>
          <i className="not-italic">{mp.letter}</i>
          {mp.label}
        </span>
      </div>

      {/* thông tin */}
      <div className="min-w-0">
        <h4 className="text-[1.05rem] font-extrabold leading-snug tracking-tight">{p.product_name}</h4>
        <p className="mt-1.5 text-[1.3rem] font-extrabold tracking-tight text-ink">
          {p.price_label || (p.price != null ? formatVnd(p.price) : "Chưa có giá")}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[.72rem] font-bold", st.chip)}>
            {p.status === "PRIORITY" ? <Star className="h-3 w-3 fill-current" /> : null}
            {p.status === "FAVORITE" ? <Heart className="h-3 w-3 fill-current" /> : null}
            {p.status === "PURCHASED" ? <CheckCircle2 className="h-3 w-3" /> : null}
            {st.label}
          </span>
          {p.category ? (
            <span className="inline-flex items-center rounded-full border border-line px-2.5 py-1 text-[.72rem] font-semibold text-muted">
              {p.category.name}
            </span>
          ) : null}
        </div>

        <div className="mt-4 rounded-[16px] border border-line bg-bg/70 p-4 dark:bg-[#0F1B31]">
          <p className="mb-2 text-[.7rem] font-extrabold uppercase tracking-[.07em] text-muted">Thông tin sản phẩm</p>
          <dl className="space-y-2 text-[.85rem]">
            <Row k="Danh mục">
              <label className="flex w-full items-center gap-2">
                <select
                  aria-label="Đổi danh mục của sản phẩm"
                  className="w-full max-w-[260px] cursor-pointer rounded-[10px] border border-line bg-surface px-2.5 py-1.5 text-[.82rem] font-bold transition hover:border-teal/60 focus:border-teal"
                  value={p.category_id ?? ""}
                  onChange={(e) => void onCategory(e.target.value || null)}
                >
                  <option value="">Chưa phân loại</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <span className="whitespace-nowrap text-[.7rem] font-semibold text-muted">đổi là lưu ngay</span>
              </label>
            </Row>
            <Row k="Trạng thái">{st.label}</Row>
            <Row k="Nguồn">{mp.label}</Row>
            <Row k="Ngày thêm">{dateStr}</Row>
            <Row k="Liên kết gốc">
              <a
                href={p.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-bold text-teal-ink underline decoration-dotted dark:text-teal-200"
              >
                {p.source_url.length > 52 ? `${p.source_url.slice(0, 52)}…` : p.source_url}
              </a>
            </Row>
          </dl>
          <p className="mt-3 border-t border-line pt-2.5 text-[.72rem] font-medium leading-relaxed text-muted">
            Ảnh · tên · giá được lấy tự động từ trang sản phẩm (READ-ONLY) — bấm “Mua ngay” để mở đúng link gốc trên sàn.
          </p>
        </div>

        <p className="mb-2 mt-4 text-[.7rem] font-extrabold uppercase tracking-[.07em] text-muted">Chuyển trạng thái</p>
        <div className="flex flex-wrap gap-1.5">
          {statuses.map(({ k, icon: Icon }) => (
            <button
              key={k}
              onClick={() => void onStatus(k)}
              disabled={p.status === k}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[.76rem] font-bold transition active:scale-95",
                p.status === k
                  ? "border-teal-deep bg-teal-deep text-white shadow-cta"
                  : "border-line bg-surface text-muted hover:border-teal hover:text-ink"
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {STATUS_META[k].short}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="flex-none font-bold text-muted">{k}</dt>
      <dd className="min-w-0 text-right font-semibold">{children}</dd>
    </div>
  );
}
