"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

type ToastKind = "ok" | "err" | "info";
interface ToastRow {
  id: number;
  kind: ToastKind;
  title: string;
  msg?: string;
}

const ToastContext = createContext<(kind: ToastKind, title: string, msg?: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

let seq = 0;

const STYLES: Record<ToastKind, { icon: typeof Info; edge: string; chip: string }> = {
  ok: { icon: CheckCircle2, edge: "border-l-mint", chip: "bg-mint-soft text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  err: { icon: TriangleAlert, edge: "border-l-rose", chip: "bg-rose-soft text-red-600 dark:bg-red-950 dark:text-red-300" },
  info: { icon: Info, edge: "border-l-baby", chip: "bg-baby-soft text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [rows, setRows] = useState<ToastRow[]>([]);

  const push = useCallback((kind: ToastKind, title: string, msg?: string) => {
    const id = ++seq;
    setRows((r) => [...r.slice(-3), { id, kind, title, msg }]);
    setTimeout(() => setRows((r) => r.filter((t) => t.id !== id)), 3800);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-24 right-4 z-[200] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2.5 md:bottom-6">
        {rows.map((t) => {
          const S = STYLES[t.kind];
          const Icon = S.icon;
          return (
            <div
              key={t.id}
              className={`toast-in pointer-events-auto flex items-start gap-3 rounded-2xl border border-line ${S.edge} border-l-4 bg-surface p-3.5 shadow-pop`}
            >
              <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-[10px] ${S.chip}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[.86rem] font-extrabold leading-tight">{t.title}</p>
                {t.msg ? <p className="mt-0.5 truncate text-[.78rem] text-muted">{t.msg}</p> : null}
              </div>
              <button
                className="ml-auto flex-none text-muted transition hover:text-ink"
                onClick={() => setRows((r) => r.filter((x) => x.id !== t.id))}
                aria-label="Đóng thông báo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
