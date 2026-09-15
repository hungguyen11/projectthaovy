"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Heart, Home, KeyRound, LayoutGrid, Plus, Tags, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/providers/AppProvider";

/**
 * Mobile bottom-nav theo mock: 4 tab + FAB "+" nổi giữa, bo tròn nâng lên khỏi thanh.
 * Tab: Trang chủ · Sản phẩm · (+) · Yêu thích · Tài khoản.
 */
export function MobileNav() {
  const pathname = usePathname();
  const status = useSearchParams().get("status");
  const { setAddOpen, isAdmin } = useApp();

  const items = [
    { href: "/dashboard", label: "Trang chủ", icon: Home, active: pathname === "/dashboard" },
    { href: "/products", label: "Sản phẩm", icon: LayoutGrid, active: pathname === "/products" && !status },
    null, // chỗ trung tâm: FAB thêm (admin) / ADMIN (khách)
    { href: "/products?status=FAVORITE", label: "Yêu thích", icon: Heart, active: pathname === "/products" && status === "FAVORITE" },
    isAdmin
      ? { href: "/account", label: "Tài khoản", icon: User, active: pathname === "/account" || pathname === "/settings" }
      : { href: "/categories", label: "Danh mục", icon: Tags, active: pathname === "/categories" },
  ];

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-[70] border-t border-line bg-surface px-2 pb-[max(7px,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-6px_24px_-12px_rgba(15,23,42,.18)] md:hidden">
        <div className="relative mx-auto grid max-w-md grid-cols-5 items-center">
          {items.map((it, i) =>
            it ? (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl py-1 text-[.62rem] font-bold transition active:scale-95",
                  it.active ? "text-teal" : "text-muted"
                )}
              >
                <span className={cn("flex h-7 w-full items-center justify-center rounded-[10px]", it.active && "bg-teal-soft dark:bg-teal-950")}>
                  <it.icon className="h-[20px] w-[20px]" />
                </span>
                {it.label}
              </Link>
            ) : (
              <span key={`sp-${i}`} aria-hidden />
            )
          )}
          {isAdmin ? (
            <button
              onClick={() => setAddOpen(true)}
              aria-label="Thêm sản phẩm"
              className="btn-primary absolute left-1/2 top-[-26px] flex h-[58px] w-[58px] -translate-x-1/2 items-center justify-center rounded-full border-[4px] border-bg text-white shadow-cta transition active:scale-95"
            >
              <Plus className="h-6 w-6" />
            </button>
          ) : (
            <Link
              href="/login"
              aria-label="Đăng nhập Admin"
              className="btn-primary absolute left-1/2 top-[-18px] flex h-[48px] w-[48px] -translate-x-1/2 flex-col items-center justify-center gap-0.5 rounded-full border-[4px] border-bg text-white shadow-cta transition active:scale-95"
            >
              <KeyRound className="h-5 w-5" />
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
