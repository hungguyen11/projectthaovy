"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useConfirm } from "@/components/providers/ConfirmProvider";

export default function CategoriesPage() {
  const { categories, products, loading, createCategory, renameCategory, deleteCategory, setAddOpen } = useApp();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

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
          <p className="mt-0.5 text-sm text-muted">Sắp xếp list của bạn theo cách riêng — tạo bao nhiêu danh mục tùy thích.</p>
        </div>
        <Button onClick={() => { setEditing(null); setName(""); setCreating(true); }}>
          <Plus className="h-4 w-4" /> Thêm danh mục
        </Button>
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
              </div>
            );
          })}
          <button
            onClick={() => { setEditing(null); setName(""); setCreating(true); }}
            className="flex min-h-[76px] items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-teal/40 bg-teal-soft/50 text-sm font-bold text-teal-ink transition hover:bg-teal-soft active:scale-[.99] dark:text-teal-200"
          >
            <Plus className="h-4 w-4" /> Tạo danh mục mới
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>Danh mục là của riêng bạn — tự tạo, tự đặt tên. Gợi ý bắt đầu:</span>
        {["Đồ cho phòng", "Đồ học tập", "Quà tặng", "Công nghệ"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setEditing(null); setName(s);
              setCreating(true);
            }}
            className="rounded-full border border-line bg-surface px-2.5 py-1 font-semibold text-muted transition hover:border-teal hover:text-teal-ink active:scale-95 dark:hover:text-teal-200"
          >
            + {s}
          </button>
        ))}
      </div>

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
