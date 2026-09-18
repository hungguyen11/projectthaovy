"use client";

import { useState } from "react";
import { Eraser, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useApp, SKINCARE_SET } from "@/components/providers/AppProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { api, ApiError } from "@/lib/api-client";

export default function CategoriesPage() {
  const { categories, products, loading, createCategory, renameCategory, deleteCategory, setAddOpen, isAdmin, refreshAll } = useApp();
  const confirm = useConfirm();
  const toast = useToast();
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const countOf = (id: string) => products.filter((p) => p.category_id === id).length;
  const empties = categories.filter((c) => countOf(c.id) === 0);

  const seedSkincare = async () => {
    setSeeding(true);
    let added = 0;
    let existed = 0;
    let failed = 0;
    for (const n of SKINCARE_SET) {
      try {
        await api("/api/categories", { method: "POST", body: { name: n } });
        added++;
      } catch (e) {
        if (e instanceof ApiError && (e.status === 409 || e.code === "DUPLICATE")) existed++;
        else failed++;
      }
    }
    await refreshAll();
    setSeeding(false);
    if (added > 0) toast("ok", "Đã thêm bộ danh mục Skincare", `${added} danh mục mới${existed ? ` · ${existed} đã có trước` : ""}. Đã gắn xong — vào sản phẩm, chọn danh mục và câu review sẽ gợi ý đúng chu trình.`);
    else toast("info", "Không có gì mới", existed === SKINCARE_SET.length ? "Cả 8 danh mục skincare đã có sẵn trong list rồi." : `Đã có ${existed}/8 · ${failed} món không thêm được, thử lại sau.`);
  };

  const cleanEmpties = async () => {
    const ok = await confirm({
      title: `Xoá ${empties.length} danh mục trống?`,
      message: "Toàn bộ danh mục chưa chứa sản phẩm nào sẽ bị xoá. Danh mục có sản phẩm được giữ nguyên.",
      okText: "Xoá tất cả",
    });
    if (!ok) return;
    setCleaning(true);
    let removed = 0;
    for (const c of empties) if (await deleteCategory(c.id)) removed++;
    setCleaning(false);
    toast("ok", "Đã dọn danh mục trống", `${removed}/${empties.length} danh mục đã xoá.`);
  };

  const submit = async () => {
    const v = name.trim();
    if (!v) return;
    setBusy(true);
    if (editing) await renameCategory(editing.id, v);
    else await createCategory(v);
    setBusy(false);
    setName("");
    setEditing(null);
    setCreating(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 pt-3">
        <div>
          <h1 className="text-[1.45rem] font-extrabold tracking-tight">Danh mục</h1>
          <p className="mt-0.5 text-sm text-muted">Cách trang được sắp xếp — do Admin tạo và quản lý.</p>
        </div>
        {isAdmin ? (
        <div className="flex items-center gap-2">
          {empties.length > 1 && !loading ? (
            <Button variant="ghost" onClick={() => void cleanEmpties()} loading={cleaning}>
              <Eraser className="h-4 w-4" /> Dọn {empties.length} danh mục trống
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => void seedSkincare()} loading={seeding}>
            <Sparkles className="h-4 w-4" /> Bộ Skincare (8)
          </Button>
          <Button onClick={() => { setEditing(null); setName(""); setCreating(true); }}>
            <Plus className="h-4 w-4" /> Thêm danh mục
          </Button>
        </div>
        ) : null}
      </div>

      {loading ? (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((c, i) => {
            const count = products.filter((p) => p.category_id === c.id).length;
            return (
              <div
                key={c.id}
                className="rise-in group flex items-center gap-3.5 rounded-card border border-line bg-surface p-4 shadow-card transition hover:-translate-y-[3px] hover:border-teal/40 hover:shadow-lift"
                style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
              >
                <span className="icon-box flex-none text-[1.05rem] font-extrabold">
                  {c.name.trim().charAt(0).toUpperCase()}
                </span>
                <button className="min-w-0 flex-1 text-left" onClick={() => { setEditing({ id: c.id, name: c.name }); setName(c.name); setCreating(true); }}>
                  <p className="truncate text-[.95rem] font-bold">{c.name}</p>
                  <p className="text-[.76rem] font-semibold text-muted">{count} sản phẩm</p>
                </button>
                {isAdmin ? (
                <div className="flex gap-1.5">
                  <button
                    aria-label={`Đổi tên ${c.name}`}
                    className="flex h-10 w-10 items-center justify-center rounded-[11px] text-muted transition hover:bg-teal-soft hover:text-teal-deep active:scale-95"
                    onClick={() => { setEditing({ id: c.id, name: c.name }); setName(c.name); setCreating(true); }}
                  >
                    <Pencil className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    aria-label={`Xóa ${c.name}`}
                    className="flex h-10 w-10 items-center justify-center rounded-[11px] text-muted transition hover:bg-rose-soft hover:text-rose active:scale-95"
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Xóa danh mục “${c.name}”?`,
                        message:
                          count > 0
                            ? `${count} sản phẩm sẽ được chuyển sang danh mục “Khác”.`
                            : "Danh mục trống — xóa an toàn.",
                        okText: "Xóa danh mục",
                      });
                      if (ok) await deleteCategory(c.id);
                    }}
                  >
                    <Trash2 className="h-[18px] w-[18px]" />
                  </button>
                </div>
                ) : null}
              </div>
            );
          })}
          {categories.length === 0 ? (
            <div className="rounded-card border-[1.5px] border-dashed border-line bg-surface/60 px-6 py-10 text-center sm:col-span-2 xl:col-span-3">
              <p className="text-sm font-bold">Chưa có danh mục nào</p>
              <p className="mt-1 text-[.82rem] text-muted">
                {isAdmin
                  ? <>Bấm <b className="text-teal-deep dark:text-teal-200">Thêm danh mục</b> ở trên để tạo danh mục đầu tiên của bạn.</>
                  : "Admin sẽ tạo danh mục để sắp xếp sản phẩm cho dễ xem ♥"}
              </p>
            </div>
          ) : null}
        </div>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={editing ? "Đổi tên danh mục" : "Danh mục mới"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>Hủy</Button>
            <Button onClick={() => void submit()} loading={busy} disabled={!name.trim()}>
              {editing ? "Lưu" : "Tạo danh mục"}
            </Button>
          </>
        }
      >
        <label className="mb-1.5 block text-xs font-bold text-muted" htmlFor="catName">Tên danh mục</label>
        <input
          id="catName"
          className="input-field"
          value={name}
          maxLength={32}
          placeholder="Ví dụ: Quà tặng, Đồ cho Vy…"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
          autoFocus
        />
      </Modal>
    </div>
  );
}
