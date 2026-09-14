"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface ConfirmOptions {
  title: string;
  message?: string;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
  icon?: React.ReactNode;
}

const ConfirmContext = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false);
export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ opts: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ opts, resolve })),
    []
  );

  const done = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state ? (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
          <div className="fade-in absolute inset-0 bg-slate-900/50" onClick={() => done(false)} />
          <div
            role="alertdialog"
            aria-modal="true"
            className="modal-in relative w-full max-w-[430px] rounded-[22px] border border-line bg-surface p-6 text-center shadow-pop"
          >
            <span
              className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[20px] text-2xl ${
                state.opts.danger === false
                  ? "bg-aqua-mist text-teal-ink dark:bg-teal-950 dark:text-teal-200"
                  : "bg-rose-soft text-red-600 dark:bg-red-950"
              }`}
            >
              {state.opts.icon ?? <TriangleAlert className="h-6 w-6" />}
            </span>
            <h3 className="text-[1.02rem] font-extrabold tracking-tight">{state.opts.title}</h3>
            {state.opts.message ? (
              <p className="mx-auto mt-1.5 max-w-[34ch] text-sm text-muted">{state.opts.message}</p>
            ) : null}
            <div className="mt-5 flex gap-2.5">
              <Button variant="ghost" className="flex-1" onClick={() => done(false)}>
                {state.opts.cancelText ?? "Hủy"}
              </Button>
              <Button
                variant={state.opts.danger === false ? "primary" : "danger"}
                className="flex-1"
                autoFocus
                onClick={() => done(true)}
              >
                {state.opts.okText ?? "Xóa sản phẩm"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}
