"use client";

/**
 * "Đồng bộ giá tất cả sản phẩm" — admin bấm một cái:
 *   từng món được gửi lên /api/products/:id/price → SERVER tự fetch lại link gốc,
 *   lấy giá hiện tại (range → lấy số CAO NHẤT) và cập nhật.
 * Nguyên tắc: KHÔNG bịa giá — món nào sàn chặn/không trả giá thì GIỮ giá cũ,
 * trên danh sách hiện rõ lý do. Có nút Dừng giữa chừng, xong việc tự làm mới trang.
 * © _hngnguynn_
 */
import { useCallback, useRef, useState } from "react";
import { Ban, Check, CircleAlert, Loader, Minus, RefreshCw } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/components/providers/AppProvider";
import { api, ApiError } from "@/lib/api-client";
import { cn, formatVnd } from "@/lib/utils";

type RowState = "wait" | "load" | "ok" | "same" | "kept" | "fail";

interface Row {
  id: string;
  name: string;
  state: RowState;
  msg?: string;
}

interface PriceRes {
  updated: boolean;
  reason?: string;
  old_price?: number | null;
  product?: { price?: number | null; price_label?: string | null };
}

export function RefreshPricesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { products, refreshAll, isAdmin } = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [phase, setPhase] = useState<"ready" | "running" | "done">("ready");
  const [stats, setStats] = useState({ updated: 0, same: 0, kept: 0, fail: 0 });
  const cancelRef = useRef(false);
  const runRef = useRef(0);

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const start = useCallback(async () => {
    const list = products.filter((p) => !!p.source_url);
    if (!list.length) {
      setPhase("done");
      return;
    }
    setRows(list.map((p) => ({ id: p.id, name: p.product_name, state: "wait" as RowState })));
    setStats({ updated: 0, same: 0, kept: 0, fail: 0 });
    setPhase("running");
    cancelRef.current = false;
    const my = ++runRef.current;
    let updated = 0;
    let same = 0;
    let kept = 0;
    let fail = 0;

    for (let i = 0; i < list.length; i++) {
      if (cancelRef.current || my !== runRef.current) break;
      setRow(i, { state: "load" });
      try {
        const r = await api<PriceRes>(`/api/products/${list[i].id}/price`, { method: "POST" });
        if (r.updated) {
          updated++;
          const old = r.old_price != null ? formatVnd(r.old_price) : "chưa có";
          const nw =
            r.product?.price_label || (r.product?.price != null ? formatVnd(r.product.price) : "");
          setRow(i, { state: "ok", msg: `${old} → ${nw}` });
        } else if (r.reason === "SAME") {
          same++;
          setRow(i, { state: "same", msg: "giá không đổi" });
        } else {
          kept++;
          setRow(i, {
            state: "kept",
            msg: r.reason === "NO_PRICE" ? "sàn không trả giá — giữ giá cũ" : "sàn chặn bot — giữ giá cũ",
          });
        }
      } catch (e) {
        fail++;
        setRow(i, { state: "fail", msg: e instanceof ApiError ? e.message : "lỗi kết nối" });
      }
      setStats({ updated, same, kept, fail });
      await new Promise((res) => setTimeout(res, 250));
    }
    setPhase("done");
    if (updated > 0) await refreshAll();
  }, [products, refreshAll]);

  if (!isAdmin) return null; // gate ngay đầu component — khách không có luồng này

  return (
    <Modal
      open={open}
      onClose={() => {
        cancelRef.current = true;
        if (phase === "running") runRef.current += 1;
        setPhase("ready");
        onClose();
      }}
      title={
        <span className="flex items-center gap-2">
          <RefreshCw className="h-[18px] w-[18px]" /> Đồng bộ giá
        </span>
      }
      size="md"
      footer={
        phase === "running" ? (
          <>
            <Button variant="ghost" onClick={() => (cancelRef.current = true)}>
              <Ban className="h-4 w-4" /> Dừng
            </Button>
            <Button disabled loading>
              Đang đồng bộ…
            </Button>
          </>
        ) : phase === "done" ? (
          <Button onClick={() => { setPhase("ready"); setRows([]); onClose(); }}>Xong</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={() => onClose()}>Hủy</Button>
            <Button onClick={() => void start()} disabled={!products.length}>
              <RefreshCw className="h-4 w-4" /> Bắt đầu ({products.length} món)
            </Button>
          </>
        )
      }
    >
      <p className="text-sm leading-relaxed text-muted">
        Web sẽ <b className="text-ink">tự mở lại từng link</b> để lấy giá hiện hành của sản phẩm
        (giá khoảng như 200.000đ – 280.000đ sẽ lấy <b className="text-ink">280.000đ</b>).
        Món nào sàn chặn hoặc không trả giá thì <b className="text-ink">giữ nguyên giá cũ</b> — không bịa số.
        Mỗi món mất khoảng 2–5 giây.
      </p>

      {rows.length > 0 ? (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[.72rem] font-bold">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Check className="h-3 w-3" /> {stats.updated} cập nhật
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Minus className="h-3 w-3" /> {stats.same} không đổi
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <CircleAlert className="h-3 w-3" /> {stats.kept} giữ giá cũ
            </span>
            {stats.fail > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-soft px-2.5 py-1 text-red-600 dark:text-red-300">
                <CircleAlert className="h-3 w-3" /> {stats.fail} lỗi
              </span>
            ) : null}
          </div>
          <ul className="mt-2.5 max-h-[46dvh] space-y-1 overflow-y-auto pr-1">
            {rows.map((r, i) => (
              <li
                key={r.id}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border border-line px-3 py-2 text-[.82rem]",
                  r.state === "load" && "bg-aqua-mist/50",
                  r.state === "fail" && "border-rose-soft"
                )}
              >
                <span className="flex h-5 w-5 flex-none items-center justify-center">
                  {r.state === "wait" ? <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" /> : null}
                  {r.state === "load" ? <Loader className="h-4 w-4 animate-spin text-teal" /> : null}
                  {r.state === "ok" ? <Check className="h-4 w-4 text-emerald-600" /> : null}
                  {r.state === "same" ? <Minus className="h-4 w-4 text-slate-400" /> : null}
                  {r.state === "kept" ? <CircleAlert className="h-4 w-4 text-amber-500" /> : null}
                  {r.state === "fail" ? <CircleAlert className="h-4 w-4 text-red-500" /> : null}
                </span>
                <span className="line-clamp-1 min-w-0 flex-1 font-bold">{i + 1}. {r.name}</span>
                {r.msg ? <span className="line-clamp-1 max-w-[45%] flex-none text-[.72rem] font-semibold text-muted">{r.msg}</span> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Modal>
  );
}
