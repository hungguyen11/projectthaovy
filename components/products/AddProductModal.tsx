"use client";

/**
 * Bước cốt lõi của cả website:
 *   DÁN LINK → hệ thống lấy ẢNH + TÊN + GIÁ → chọn danh mục → chọn trạng thái → LƯU.
 * Ảnh/tên lấy từ link là READ-ONLY. Nếu KHÔNG lấy được (link lỗi/sàn chặn) hoặc thiếu giá,
 * người dùng có thể DỪNG LẠI và tự nhập GIÁ để vẫn lưu được sản phẩm.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Lock, PencilLine, Plus, Search, TriangleAlert } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApp } from "@/components/providers/AppProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { api, ApiError } from "@/lib/api-client";
import { MARKETPLACE_META, FALLBACK_IMAGE } from "@/lib/config";
import { cn, formatVnd, parseVndFlexible } from "@/lib/utils";
import type { ExtractedMeta, ProductStatus } from "@/types";

type Phase = "idle" | "loading" | "done" | "error";

export function AddProductModal() {
  const { addOpen, setAddOpen, categories, addProduct, setDetailProduct } = useApp();
  const confirm = useConfirm();

  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [meta, setMeta] = useState<ExtractedMeta | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<ProductStatus>("PENDING");
  const [manualPrice, setManualPrice] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualImage, setManualImage] = useState("");
  const [saving, setSaving] = useState(false);
  const fetchId = useRef(0);

  const reset = useCallback(() => {
    fetchId.current += 1;
    setUrl("");
    setPhase("idle");
    setErrMsg("");
    setMeta(null);
    setStatus("PENDING");
    setManualPrice("");
    setManualTitle("");
    setManualImage("");
    setSaving(false);
  }, []);

  useEffect(() => {
    if (addOpen) reset();
  }, [addOpen, reset]);

  useEffect(() => {
    if (addOpen && !categoryId && categories.length) setCategoryId(categories[0].id);
  }, [addOpen, categories, categoryId]);

  const fetchMeta = async () => {
    const v = url.trim();
    if (!v) return;
    const my = ++fetchId.current;
    setPhase("loading");
    setErrMsg("");
    try {
      const r = await api<{ ok: boolean; data?: ExtractedMeta; code?: string; message?: string }>(
        "/api/metadata",
        { method: "POST", body: { url: v } }
      );
      if (my !== fetchId.current) return; // người dùng đã bấm Dừng
      if (!r.ok || !r.data) {
        setPhase("error");
        setErrMsg(r.message || "Không thể lấy thông tin sản phẩm từ liên kết này.");
        return;
      }
      setMeta(r.data);
      setPhase("done");
    } catch (e) {
      if (my !== fetchId.current) return;
      setPhase("error");
      setErrMsg(
        e instanceof ApiError && e.code === "RATE_LIMITED"
          ? e.message
          : "Không thể kết nối đến máy chủ. Vui lòng thử lại."
      );
    }
  };

  const stopFetching = () => {
    fetchId.current += 1; // vô hiệu hóa kết quả fetch đang chạy
    setPhase("error");
    setErrMsg("Bạn đã dừng lấy thông tin. Nhập giá thủ công bên dưới rồi lưu — link vẫn được giữ để mở lại sau.");
  };

  const manualParsed = parseVndFlexible(manualPrice);
  const manualImgUrl = manualImage.trim().startsWith("http") ? manualImage.trim() : null;
  const manualMode = !meta && phase === "error";
  const metaLacksPrice = !!meta && meta.price == null && !meta.price_label;
  const canSave = meta ? phase === "done" : manualMode && (manualParsed != null || manualTitle.trim().length >= 2);

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    const price = meta ? meta.price ?? manualParsed : manualParsed;
    const priceLabel = meta?.price_label ?? (price != null ? formatVnd(price) : null);
    const res = await addProduct({
      source_url: (meta?.source_url ?? url).trim(),
      category_id: categoryId || null,
      status,
      snapshot: {
        image: meta?.image || (manualImage.trim().startsWith("http") ? manualImage.trim() : null),
        title: meta?.title || manualTitle.trim(),
        price,
        price_label: priceLabel,
        marketplace: meta?.marketplace,
      },
    });
    setSaving(false);
    if (res.ok) {
      setAddOpen(false);
      return;
    }
    if (res.duplicate) {
      const dup = res.duplicate;
      const view = await confirm({
        icon: <AlertCircle className="h-6 w-6" />,
        danger: false,
        title: "Sản phẩm này đã được lưu.",
        message: "Bạn đã lưu sản phẩm này rồi. Mở bản đã lưu thay vì tạo bản trùng nhé?",
        okText: "Xem sản phẩm",
        cancelText: "Hủy",
      });
      if (view) {
        setAddOpen(false);
        setDetailProduct(dup);
      }
      return;
    }
    setErrMsg(res.message || "Không thể lưu sản phẩm. Vui lòng thử lại.");
  };

  const mp = meta ? MARKETPLACE_META[meta.marketplace] ?? MARKETPLACE_META.OTHER : null;

  return (
    <Modal
      open={addOpen}
      onClose={() => setAddOpen(false)}
      title={
        <span className="flex items-center gap-2">
          <Plus className="h-[18px] w-[18px]" /> Thêm sản phẩm
        </span>
      }
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => setAddOpen(false)}>Hủy</Button>
          <Button onClick={() => void save()} disabled={!canSave} loading={saving}>
            Lưu sản phẩm
          </Button>
        </>
      }
    >
      {/* BƯỚC 1 */}
      <p className="mb-2.5 flex items-center gap-2 text-sm font-extrabold">
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-lg bg-teal-deep text-[.72rem] text-white">1</span>
        Dán link sản phẩm
      </p>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          className="input-field flex-1"
          type="url"
          inputMode="url"
          placeholder="Dán link Shopee, TikTok Shop hoặc sàn TMĐT…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (phase !== "loading") void fetchMeta();
            }
          }}
          spellCheck={false}
          autoFocus
        />
        {phase === "loading" && !meta ? (
          <Button variant="ghost" onClick={stopFetching}>Dừng lại</Button>
        ) : (
          <Button onClick={() => void fetchMeta()} disabled={!url.trim()}>
            <Search className="h-4 w-4" /> Lấy thông tin
          </Button>
        )}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
        <TriangleAlert className="h-3.5 w-3.5 flex-none" />
        Ảnh · tên · giá lấy tự động. Link khó đọc? Bấm “Dừng lại” rồi tự nhập giá — vẫn lưu được.
      </p>

      {phase === "loading" && !meta ? (
        <div className="mt-4 flex gap-4">
          <Skeleton className="h-28 w-36 flex-none rounded-2xl" />
          <div className="flex-1 space-y-2.5 pt-1.5">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
        </div>
      ) : null}

      {phase === "error" && !meta ? (
        <div className="mt-3 rounded-xl bg-rose-soft px-3.5 py-2.5 text-sm font-semibold text-red-600 dark:bg-red-950 dark:text-red-300">
          <p className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-none" />
            <span>{errMsg}</span>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => void fetchMeta()}>Thử lại</Button>
          </p>
          <div className="mt-3 rounded-xl border border-line bg-surface p-3">
            <p className="flex items-center gap-1.5 text-[.82rem] font-extrabold text-ink">
              <PencilLine className="h-4 w-4" /> Tự nhập tên & giá
            </p>
            <p className="mt-0.5 text-[.74rem] text-muted">Chỉ cần giá là lưu được; thêm tên & link ảnh (không bắt buộc) cho đẹp — bỏ trống ảnh sẽ dùng mặc định của app.</p>
            <input
              className="input-field mt-2"
              placeholder="Tên sản phẩm (không bắt buộc) — VD: Mũ lưỡi trai Tim và friends"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
            />
            <input
              className="input-field mt-2"
              placeholder="Link ảnh (không bắt buộc) — dán URL ảnh nếu có"
              value={manualImage}
              onChange={(e) => setManualImage(e.target.value)}
            />
            <input
              className="input-field mt-2 max-w-[240px]"
              placeholder="VD: 399.000 hoặc 399k"
              value={manualPrice}
              onChange={(e) => setManualPrice(e.target.value)}
              inputMode="numeric"
            />
            {manualPrice.trim() ? (
              <p className="mt-1.5 text-[.78rem] font-bold text-teal-ink dark:text-teal-200">
                {manualParsed != null ? `Sẽ lưu: ${formatVnd(manualParsed)}` : "Không hiểu con số này — thử dạng 399.000 nhé."}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* BƯỚC 2 — thông tin đọc được (read-only) */}
      {meta ? (
        <>
          <p className="mb-2.5 mt-5 flex items-center gap-2 text-sm font-extrabold">
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-lg bg-teal-deep text-[.72rem] text-white">2</span>
            Thông tin sản phẩm
            <span className="ml-auto flex items-center gap-1 text-[.68rem] font-semibold text-muted">
              <Lock className="h-3 w-3" /> Ảnh &amp; tên đọc từ link — không chỉnh sửa được
            </span>
          </p>
          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-bg/50 p-3.5 sm:flex-row">
            <div className="relative h-28 w-full flex-none overflow-hidden rounded-xl border border-line bg-surface sm:w-36">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={meta.image || manualImgUrl || FALLBACK_IMAGE}
                alt=""
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE; }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[.95rem] font-extrabold leading-snug">{meta.title}</p>
              <p className={cn("mt-1.5 text-lg font-extrabold", metaLacksPrice ? "text-muted" : "text-rose-600 dark:text-rose-300")}>
                {meta.price_label ?? (meta.price != null ? formatVnd(meta.price) : "Chưa có giá từ link")}
              </p>
              {metaLacksPrice ? (
                <div className="mt-2 max-w-[240px]">
                  <label className="flex items-center gap-1.5 text-[.74rem] font-bold text-muted">
                    <PencilLine className="h-3.5 w-3.5" /> Nhập giá tay:
                  </label>
                  <input
                    className="input-field mt-1 !py-1.5 !text-sm"
                    placeholder="VD: 299.000"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    inputMode="numeric"
                  />
                  {manualPrice.trim() && manualParsed != null ? (
                    <p className="mt-1 text-[.74rem] font-bold text-teal-ink dark:text-teal-200">→ {formatVnd(manualParsed)}</p>
                  ) : null}
                </div>
              ) : null}
              {!meta.image ? (
                <div className="mt-2">
                  <label className="flex items-center gap-1.5 text-[.74rem] font-bold text-muted">
                    <PencilLine className="h-3.5 w-3.5" /> Ảnh (tùy chọn) — sàn chặn nên không lấy tự động được:
                  </label>
                  <input
                    className="input-field mt-1 !py-1.5 !text-sm"
                    placeholder="Dán link ảnh nếu có — để trống thì dùng ảnh mặc định của app"
                    value={manualImage}
                    onChange={(e) => setManualImage(e.target.value)}
                  />
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[.72rem] font-bold", mp?.badge)}>
                  <i className="not-italic">{mp?.letter}</i>
                  {mp?.label}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* BƯỚC 3 — hiển thị khi đã có thông tin HOẶC đang nhập tay */}
      {meta || manualMode ? (
        <>
          <p className="mb-2.5 mt-5 flex items-center gap-2 text-sm font-extrabold">
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-lg bg-teal-deep text-[.72rem] text-white">
              {meta ? 3 : 2}
            </span>
            Chọn danh mục &amp; trạng thái
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted" htmlFor="catSel">Danh mục</label>
              <select id="catSel" className="input-field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">Trạng thái</label>
              <div className="flex flex-col gap-1.5">
                <StatusRadio value={status} onChange={setStatus} />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </Modal>
  );
}

function StatusRadio({ value, onChange }: { value: ProductStatus; onChange: (v: ProductStatus) => void }) {
  const opts: Array<{ v: ProductStatus; label: string }> = [
    { v: "PENDING", label: "Dự định mua" },
    { v: "PRIORITY", label: "Ưu tiên mua trước" },
    { v: "FAVORITE", label: "Yêu thích" },
  ];
  return (
    <>
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            "flex items-center gap-2.5 rounded-xl border-[1.5px] px-3.5 py-2.5 text-left text-sm font-semibold transition",
            value === o.v
              ? "border-teal bg-aqua-mist/60 text-teal-ink dark:bg-teal-950 dark:text-teal-200"
              : "border-line text-muted hover:border-teal"
          )}
        >
          <span className={cn("flex h-4 w-4 flex-none items-center justify-center rounded-full border-[1.5px]", value === o.v ? "border-teal" : "border-line")}>
            {value === o.v ? <span className="h-2 w-2 rounded-full bg-teal" /> : null}
          </span>
          {o.label}
        </button>
      ))}
    </>
  );
}
