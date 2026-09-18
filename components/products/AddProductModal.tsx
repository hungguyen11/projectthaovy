"use client";

/**
 * Bước cốt lõi của cả website:
 *   DÁN LINK → hệ thống lấy ẢNH + TÊN + GIÁ (nếu lấy được) → chọn danh mục → LƯU.
 * Không có ô nhập giá: sàn trả giá thì hiển thị, không trả thì bỏ trống — vẫn lưu bình thường.
 * Khi link không đọc được, chỉ cho phép thêm TÊN/ẢNH tùy chọn (không nhập giá).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Lock, PencilLine, Plus, Search, Sparkles, TriangleAlert } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApp } from "@/components/providers/AppProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { api, ApiError } from "@/lib/api-client";
import { extractFirstUrl } from "@/lib/metadata/link";
import { MARKETPLACE_META, FALLBACK_IMAGE } from "@/lib/config";
import { CATEGORY_GROUPS, defaultReviewFor, draftOwnerNote } from "@/lib/review-gen";
import { cn, formatVnd } from "@/lib/utils";
import type { ExtractedMeta, ProductStatus } from "@/types";

type Phase = "idle" | "loading" | "done" | "error";

export function AddProductModal() {
  const { addOpen, setAddOpen, categories, addProduct, setDetailProduct, isAdmin } = useApp();
  const confirm = useConfirm();

  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [meta, setMeta] = useState<ExtractedMeta | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<ProductStatus>("PENDING");
  const [manualTitle, setManualTitle] = useState("");
  const [manualImage, setManualImage] = useState("");
  const [note, setNote] = useState(""); // câu "chủ list mách" — soạn nháp tự động, sửa thoải mái
  const [noteVar, setNoteVar] = useState(0);
  const [noteTouched, setNoteTouched] = useState(false); // admin tự sửa rồi → không điền đè nữa
  const catNameOf = (id: string) => categories.find((c) => c.id === id)?.name ?? null;
  const [saving, setSaving] = useState(false);
  const fetchId = useRef(0);

  const reset = useCallback(() => {
    fetchId.current += 1;
    setUrl("");
    setPhase("idle");
    setErrMsg("");
    setMeta(null);
    setStatus("PENDING");
    setManualTitle("");
    setManualImage("");
    setNote("");
    setNoteVar(0);
    setNoteTouched(false);
    setSaving(false);
  }, []);

  useEffect(() => {
    if (addOpen) reset();
  }, [addOpen, reset]);

  // KHÔNG tự chọn danh mục hộ admin — ô để trống cho tới khi tự bấm chọn (spec 2026-09)

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
      const fetched = r.data;
      setMeta(fetched);
      setPhase("done");
      // tự soạn NHÁP câu mách (admin có thể sửa/xóa — chỉ lưu khi bấm Lưu).
      // Nếu danh mục đã chọn có review mặc định → ưu tiên đúng văn bản chủ list.
      setNote((n) => n || draftOwnerNote({ title: fetched.title, category: catNameOf(categoryId), priceLabel: fetched.price_label ?? null }));
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
    setErrMsg("Bạn đã dừng lấy thông tin. Vẫn lưu được bình thường — link được giữ để mở lại sau.");
  };

  const manualImgUrl = manualImage.trim().startsWith("http") ? manualImage.trim() : null;
  const manualMode = !meta && phase === "error";
  const canSave = meta ? phase === "done" : manualMode;

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    const price = meta?.price ?? null;
    const priceLabel = meta?.price_label ?? (price != null ? formatVnd(price) : null);
    const res = await addProduct({
      source_url: (meta?.source_url ?? extractFirstUrl(url) ?? url).trim(),
      category_id: categoryId || null,
      status,
      snapshot: {
        image: meta?.image || (manualImage.trim().startsWith("http") ? manualImage.trim() : null),
        title: meta?.title || manualTitle.trim(),
        price,
        price_label: priceLabel,
        marketplace: meta?.marketplace,
      },
      owner_note: note.trim() ? note.trim().slice(0, 240) : null,
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

  if (!isAdmin) return null; // khách không có luồng thêm sản phẩm — khu Admin

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
        Ảnh · tên · giá (nếu lấy được) hiển thị tự động. Không có giá thì vẫn lưu bình thường.
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
              <PencilLine className="h-4 w-4" /> Thêm tên / ảnh (không bắt buộc)
            </p>
            <p className="mt-0.5 text-[.74rem] text-muted">Không đọc được từ link — chỉ cần Lưu là đủ, link vẫn mở đúng sàn. Tên & ảnh thêm tùy thích.</p>
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
              {meta.price_label || meta.price != null ? (
                <p className="mt-1.5 text-lg font-extrabold">{meta.price_label ?? formatVnd(meta.price as number)}</p>
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
              <label className="mb-1.5 block text-xs font-semibold text-muted" htmlFor="catSel">
                Danh mục <span className="font-normal">— bạn chọn, web không đoán</span>
              </label>
              <select
                id="catSel"
                className="input-field"
                value={categoryId}
                onChange={(e) => {
                  const v = e.target.value;
                  setCategoryId(v);
                  // review mặc định của danh mục — CHỈ điền khi admin chưa tự sửa ô review
                  if (!noteTouched) {
                    const def = defaultReviewFor(catNameOf(v));
                    if (def) setNote(def);
                  }
                }}
              >
                <option value="">— Chọn danh mục —</option>
                {CATEGORY_GROUPS.map((g) => {
                  const inG = categories.filter((c) => g.names.some((n) => n.toLowerCase() === c.name.trim().toLowerCase()));
                  if (!inG.length) return null;
                  return (
                    <optgroup key={g.group} label={g.group}>
                      {inG.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                  );
                })}
                {categories
                  .filter((c) => !CATEGORY_GROUPS.some((g) => g.names.some((n) => n.toLowerCase() === c.name.trim().toLowerCase())))
                  .map((c) => (
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

          {/* BƯỚC 4 — câu mách của chủ list (tùy chọn) */}
          <p className="mb-2.5 mt-5 flex items-center gap-2 text-sm font-extrabold">
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-lg bg-teal-deep text-[.72rem] text-white">
              {meta ? 4 : 3}
            </span>
            Câu mách của bạn
            <span className="ml-auto text-[.68rem] font-semibold normal-case text-muted">không bắt buộc</span>
          </p>
          <textarea
            className="input-field min-h-[74px] resize-y"
            maxLength={240}
            value={note}
            onChange={(e) => {
              setNoteTouched(true);
              setNote(e.target.value);
            }}
            placeholder="Chọn danh mục ở trên là câu mặc định tự hiện here — xóa/viết lại tùy thích, web lưu đúng chữ bạn thấy lúc bấm Lưu."
            aria-label="Câu mách hiển thị khi người xem bấm vào tên sản phẩm"
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 text-[.72rem] leading-snug text-muted">
              Hiện trong pop-up khi người xem bấm vào tên sản phẩm — viết thật của mình nha, web không tự bịa giúp bạn được.
            </p>
            <span className="text-[.72rem] font-bold tabular-nums text-muted">{note.length}/240</span>
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => {
                setNote(
                  draftOwnerNote({
                    title: meta?.title || manualTitle,
                    category: catNameOf(categoryId),
                    priceLabel: meta?.price_label ?? null,
                    variant: noteVar + 1,
                  })
                );
                setNoteVar((v) => v + 1);
                setNoteTouched(true); // đổi tay rồi thì chọn danh mục khác không đè lên nữa
              }}
            >
              <Sparkles className="h-3.5 w-3.5" /> Viết câu khác
            </Button>
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
