"use client";

import { Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/components/providers/AppProvider";

export function EmptyState({
  title = "Chưa có sản phẩm nào",
  message = "Thêm những sản phẩm bạn đang quan tâm để dễ theo dõi và mua sau.",
  cta = true,
}: {
  title?: string;
  message?: string;
  cta?: boolean;
}) {
  const { setAddOpen } = useApp();
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border-[1.5px] border-dashed border-line bg-surface/50 px-6 py-14 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-line grad-soft">
        <ShoppingBag className="h-7 w-7 text-teal-deep dark:text-teal" />
      </span>
      <h3 className="text-[1.05rem] font-extrabold">{title}</h3>
      <p className="max-w-[44ch] text-sm text-muted">{message}</p>
      {cta ? (
        <Button className="mt-2" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Thêm sản phẩm
        </Button>
      ) : null}
    </div>
  );
}

export function ErrorState({ message = "Không thể kết nối đến máy chủ.", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface px-6 py-14 text-center shadow-card">
      <span className="text-3xl">🫧</span>
      <h3 className="font-extrabold">Có chút trục trặc</h3>
      <p className="max-w-[40ch] text-sm text-muted">{message}</p>
      {onRetry ? (
        <Button variant="ghost" onClick={onRetry}>
          Thử lại
        </Button>
      ) : null}
    </div>
  );
}
