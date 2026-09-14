"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Menu mobile cho Landing — hamburger morph ⇄ X mượt,
 * panel fade + slide (spec §5, §18).
 */
export function SiteMenu({
  links,
  tone = "light",
}: {
  links: Array<{ href: string; label: string }>;
  /** "dark" = đặt trên nền tối (hero đêm) — nút hamburger đổi màu theo. */
  tone?: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative md:hidden" ref={ref}>
      <button
        type="button"
        aria-label={open ? "Đóng menu" : "Mở menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`ham transition ${tone === "dark" ? "text-white hover:bg-white/10" : "text-ink hover:bg-teal-soft"} active:scale-95 ${open ? "is-open" : ""}`}
      >
        <span />
        <span />
      </button>
      {open ? (
        <div className="pop-in absolute right-0 top-12 z-50 w-[220px] rounded-[18px] border border-line bg-surface p-2 shadow-pop dark:bg-[#0F242C]">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-[10px] px-3.5 py-2.5 text-sm font-semibold text-ink transition hover:bg-teal-soft hover:text-teal-deep dark:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
