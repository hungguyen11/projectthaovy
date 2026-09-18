"use client";

import { useRef, useState } from "react";
import {
  Check,
  Circle,
  ClipboardPaste,
  FileSpreadsheet,
  Loader2,
  MinusCircle,
  X,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { api, ApiError } from "@/lib/api-client";
import { draftOwnerNote } from "@/lib/review-gen";
import { extractLinks, MAX_LINKS } from "@/lib/extract-links";

/**
 * Nhập hàng loạt: tải file Excel/CSV/TXT (hoặc dán danh sách link) → web nhận diện
 * mọi link, lần lượt lấy thông tin (ảnh/tên/giá) và lưu vào danh sách.
 * Mỗi link chạy qua đúng 2 API cũ: /api/metadata + /api/products — không logic mới về dữ liệu.
 * © _hngnguynn_
 */
type RowState = "wait" | "load" | "saved" | "dup" | "err";
interface Row {
  url: string;
  state: RowState;
  note?: string;
}

const short = (u: string) => {
  const m = u.replace(/^https?:\/\/(www\.)?/, "");
  return m.length > 42 ? `${m.slice(0, 42)}…` : m;
};

export function BulkImportModal() {
  const { bulkOpen, setBulkOpen, categories, refreshAll, isAdmin } = useApp();
  const [step, setStep] = useState<"pick" | "run">("pick");
  const [links, setLinks] = useState<string[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [paste, setPaste] = useState("");
  const [drag, setDrag] = useState(false);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [catId, setCatId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const cancelRef = useRef(false);
  const idxRef = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("pick");
    setLinks([]);
    setSkipped(0);
    setFileName("");
    setPaste("");
    setFileErr(null);
    setRows([]);
    setRunning(false);
    setFinished(false);
    cancelRef.current = false;
    idxRef.current = 0;
  };
  const close = () => {
    if (running) return;
    reset();
    setBulkOpen(false);
  };

  const readFile = async (f: File) => {
    setFileErr(null);
    if (f.size > 2.5 * 1024 * 1024) {
      setFileErr("File quá lớn — tối đa 2.5MB (vài trăm link là dư sức).");
      return;
    }
    setParsing(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("read"));
        r.readAsDataURL(f);
      });
      const b64 = dataUrl.split(",", 2)[1] ?? "";
      const res = await api<{ links: string[]; skipped: number }>(
        "/api/products/bulk-parse",
        { method: "POST", body: { name: f.name, data_b64: b64 } }
      );
      const found = res.links ?? [];
      setLinks(found);
      setSkipped(res.skipped ?? 0);
      setFileName(f.name);
      if (!found.length) setFileErr("Không tìm thấy link http(s) hợp lệ nào trong file.");
    } catch (e) {
      setFileErr(e instanceof Error ? e.message : "Không đọc được file.");
    } finally {
      setParsing(false);
    }
  };

  const usePaste = () => {
    const { links: found, skipped: sk } = extractLinks(paste);
    setLinks(found);
    setSkipped(sk);
    setFileName("");
    if (!found.length) setFileErr("Chưa có link hợp lệ — mỗi dòng một link, ví dụ https://s.shopee.vn/xxxx");
    else setFileErr(null);
  };

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const runQueue = async () => {
    const worker = async () => {
      while (!cancelRef.current) {
        const i = idxRef.current++;
        if (i >= links.length) break;
        const url = links[i];
        setRow(i, { state: "load" });
        let snap: Record<string, unknown> = {};
        try {
          const meta = await api<{ ok?: boolean; data?: Record<string, unknown> }>("/api/metadata", {
            method: "POST",
            body: { url },
          });
          if (meta?.ok && meta.data) snap = meta.data;
        } catch {
          /* không lấy được metadata → server sẽ lưu link với tên dự phòng */
        }
        try {
          const draftTitle = typeof snap.title === "string" ? snap.title : "";
          await api("/api/products", {
            method: "POST",
            body: {
              source_url: url,
              status: "PENDING",
              category_id: catId || null,
              snapshot: snap,
              // tự soạn câu mách nháp cho từng món (admin duyệt/sửa lại sau trong Chi tiết)
              owner_note: draftTitle
                ? draftOwnerNote({
                    title: draftTitle,
                    category: categories.find((c) => c.id === catId)?.name ?? null,
                    priceLabel: typeof snap.price_label === "string" ? snap.price_label : null,
                  })
                : null,
            },
          });
          setRow(i, {
            state: "saved",
            note: typeof snap.title === "string" && snap.title ? snap.title : "Đã lưu (chưa lấy được thông tin)",
          });
        } catch (e) {
          if (e instanceof ApiError && (e.status === 409 || e.code === "DUPLICATE")) {
            setRow(i, { state: "dup", note: "Đã có trong danh sách — bỏ qua" });
          } else {
            setRow(i, { state: "err", note: e instanceof Error ? e.message : "Lỗi không xác định" });
          }
        }
        await new Promise((r) => setTimeout(r, 120));
      }
    };
    await Promise.all([worker(), worker()]);
    setRunning(false);
    setFinished(true);
    await refreshAll();
  };

  const start = () => {
    if (!links.length) return;
    setRows(links.map((u) => ({ url: u, state: "wait" as RowState })));
    idxRef.current = 0;
    cancelRef.current = false;
    setStep("run");
    setRunning(true);
    setFinished(false);
    void runQueue();
  };

  const done = rows.filter((r) => r.state !== "wait" && r.state !== "load").length;
  const pct = rows.length ? Math.round((done / rows.length) * 100) : 0;
  const cnt = (s: RowState) => rows.filter((r) => r.state === s).length;

  if (!isAdmin) return null; // chỉ Admin dùng được luồng nhập hàng loạt

  return (
    <Modal
      open={bulkOpen}
      onClose={close}
      title={step === "pick" ? "Nhập sản phẩm hàng loạt" : `Đang lấy thông tin · ${done}/${rows.length}`}
      footer={
        step === "pick" ? (
          <>
            <Button variant="ghost" onClick={close} disabled={parsing}>
              Hủy
            </Button>
            <Button onClick={start} disabled={!links.length || parsing} loading={parsing}>
              Lấy thông tin {links.length ? `(${links.length} link)` : ""}
            </Button>
          </>
        ) : (
          <>
            {!finished ? (
              <Button
                variant="ghost"
                onClick={() => {
                  cancelRef.current = true;
                }}
              >
                Dừng
              </Button>
            ) : null}
            <Button onClick={close} disabled={running}>
              {finished ? "Hoàn tất — xem danh sách" : "Đang chạy…"}
            </Button>
          </>
        )
      }
    >
      {step === "pick" ? (
        <div className="space-y-3.5">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void readFile(f);
            }}
            className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-[1.5px] border-dashed px-4 py-7 text-center transition ${
              drag ? "border-teal bg-teal-soft/60" : "border-line bg-surface/60 hover:border-teal/50"
            }`}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void readFile(f);
                e.target.value = "";
              }}
            />
            <FileSpreadsheet className="h-7 w-7 text-teal-deep dark:text-teal" />
            <p className="text-sm font-bold">
              Kéo thả hoặc bấm chọn file <b>.xlsx · .xls · .csv · .txt</b>
            </p>
            <p className="text-[.78rem] text-muted">
              Mỗi dòng chứa một link sản phẩm (cột nào cũng được — web tự nhận diện link). Tối đa {MAX_LINKS} link/lần.
            </p>
            {parsing ? (
              <p className="mt-1 inline-flex items-center gap-1.5 text-[.8rem] font-bold text-teal-ink dark:text-teal-200">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang đọc file…
              </p>
            ) : fileName ? (
              <p className="mt-1 text-[.78rem] font-bold text-mint">✓ {fileName}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2 text-[.72rem] font-bold uppercase tracking-wide text-muted">
            <span className="h-px flex-1 bg-line" /> hoặc dán nhanh <ClipboardPaste className="h-3.5 w-3.5" />{" "}
            <span className="h-px flex-1 bg-line" />
          </div>
          <textarea
            className="input-field min-h-[88px] resize-y font-mono text-[.8rem]"
            placeholder={"https://s.shopee.vn/3B7QZ6y5BZ\nhttps://s.shopee.vn/2gB9yBzzCU\n…"}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            onBlur={() => paste.trim() && usePaste()}
          />
          {paste.trim() ? (
            <button type="button" onClick={usePaste} className="text-[.8rem] font-bold text-teal-ink hover:underline dark:text-teal-200">
              Nhận diện link từ khung dán ↵
            </button>
          ) : null}

          {fileErr ? (
            <p className="rounded-xl bg-rose-soft px-3 py-2 text-[.8rem] font-bold text-rose">{fileErr}</p>
          ) : links.length ? (
            <div className="rounded-xl bg-mint-soft px-3 py-2 text-[.82rem] font-bold text-mint">
              Nhận diện {links.length} link hợp lệ
              {skipped > 0 ? <span className="text-muted"> · bỏ qua {skipped} dòng trùng/không hợp lệ</span> : null}
              <ul className="mt-1.5 max-h-24 space-y-0.5 overflow-y-auto text-[.76rem] font-semibold text-muted">
                {links.slice(0, 6).map((u) => (
                  <li key={u} className="truncate">• {short(u)}</li>
                ))}
                {links.length > 6 ? <li>… và {links.length - 6} link nữa</li> : null}
              </ul>
            </div>
          ) : null}

          {links.length ? (
            <label className="block text-[.82rem]">
              <span className="mb-1 block font-bold text-muted">Gán vào danh mục (không bắt buộc)</span>
              <select className="input-field" value={catId} onChange={(e) => setCatId(e.target.value)}>
                <option value="">— Chưa phân loại —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full btn-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[.76rem] font-bold text-muted">
            <span className="inline-flex items-center gap-1 text-mint"><Check className="h-3.5 w-3.5" /> {cnt("saved")} đã lưu</span>
            <span className="inline-flex items-center gap-1 text-amber-600"><MinusCircle className="h-3.5 w-3.5" /> {cnt("dup")} trùng · bỏ qua</span>
            <span className="inline-flex items-center gap-1 text-rose"><X className="h-3.5 w-3.5" /> {cnt("err")} lỗi</span>
            {running ? <span className="ml-auto inline-flex items-center gap-1.5 text-teal-ink dark:text-teal-200"><Loader2 className="h-3.5 w-3.5 animate-spin" /> đang lấy…</span> : null}
          </div>
          <ul className="max-h-[46vh] space-y-1 overflow-y-auto pr-1">
            {rows.map((r, i) => (
              <li key={`${r.url}-${i}`} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-[.78rem]">
                {r.state === "wait" ? <Circle className="h-4 w-4 flex-none text-line" /> : null}
                {r.state === "load" ? <Loader2 className="h-4 w-4 flex-none animate-spin text-teal dark:text-teal-300" /> : null}
                {r.state === "saved" ? <Check className="h-4 w-4 flex-none text-mint" strokeWidth={3} /> : null}
                {r.state === "dup" ? <MinusCircle className="h-4 w-4 flex-none text-amber-500" /> : null}
                {r.state === "err" ? <X className="h-4 w-4 flex-none text-rose" strokeWidth={2.5} /> : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.note ? r.note : short(r.url)}</p>
                  {!r.note || r.state === "saved" ? <p className="truncate text-[.68rem] text-muted/80">{r.url}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
