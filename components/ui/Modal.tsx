"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Modal "Cyan Modern": nền fade, panel scale + rise nhẹ; khi ĐÓNG chạy
 * animation ngược (spec §17) — thuần CSS, chỉ transform/opacity.
 */
export function Modal({
  open,
  onClose,
  title,
  icon,
  size = "md",
  glow = false,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  size?: "md" | "lg";
  /** quầng sáng cyan quanh card (pop-up "chủ list mách") */
  glow?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [shown, setShown] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setShown(true);
      setClosing(false);
      return;
    }
    if (shown) {
      setClosing(true);
      const t = setTimeout(() => {
        setClosing(false);
        setShown(false);
      }, 190);
      return () => clearTimeout(t);
    }
  }, [open, shown]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (typeof document === "undefined" || !shown) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[150] flex justify-center",
        glow ? "items-center p-3" : "items-end p-0 md:items-center md:p-4"
      )}
    >
      <div
        className={cn("absolute inset-0 bg-[#0A0F1E]/50", closing ? "fade-out" : "fade-in")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col bg-surface shadow-pop",
          "rounded-t-[22px] border border-line md:rounded-[22px] md:max-h-[min(88dvh,860px)]",
          closing ? "modal-out" : "modal-in",
          glow
            ? "border-0 bg-transparent p-0 shadow-none md:max-w-[480px]"
            : size === "lg"
              ? "md:max-w-[660px]"
              : "md:max-w-[560px]"
        )}
      >
        {title != null ? (
          <div className="flex items-center gap-2.5 px-5 pb-0 pt-[18px]">
            <h3 className="flex items-center gap-2 text-[1.05rem] font-extrabold tracking-tight">
              {icon}
              {title}
            </h3>
            <button
              onClick={onClose}
              aria-label="Đóng"
              className="ml-auto flex h-10 w-10 items-center justify-center rounded-[12px] text-muted transition hover:bg-teal-soft hover:text-teal-deep"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
        ) : null}
        <div className={cn("overflow-y-auto", glow ? "p-0" : "px-5 py-4")}>{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2.5 rounded-b-[22px] border-t border-line bg-bg/60 px-5 py-3.5">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
