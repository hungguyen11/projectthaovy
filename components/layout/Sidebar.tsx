"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  KeyRound,
  LayoutDashboard,
  List,
  Tags,
  Settings,
  User,
  Shield,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/providers/AppProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Logo } from "@/components/layout/Logo";

/**
 * Sidebar theo mock: một danh sách dọc liền mạch (không đếm số, không tiêu đề nhóm),
 * item active = nền mint nhạt + chữ teal; đáy là câu quote viết tay.
 */
export function NavItem({
  href,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[12px] px-3 py-[9px] text-[.875rem] font-medium text-muted transition",
        "hover:bg-aqua-mist hover:text-ink dark:hover:bg-[#1E293B]",
        active && "bg-teal-soft font-bold text-teal-ink dark:bg-teal-950 dark:text-teal-200"
      )}
    >
      <Icon className={cn("h-[18px] w-[18px]", active && "text-teal dark:text-teal-300")} />
      <span>{label}</span>
    </Link>
  );
}

function useActive() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const status = sp.get("status");
  return (href: string) => {
    if (href !== "/products" && !href.startsWith("/products?")) return pathname === href || pathname.startsWith(`${href}/`);
    const [base, q] = href.split("?");
    const want = q?.split("=")[1];
    return pathname === base && (want ? status === want : !status);
  };
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, isAdmin } = useApp();
  const isActive = useActive();
  const toast = useToast();

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-3 pt-[18px]">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onNavigate}>
          <Logo size={38} />
          <span className="text-[1.06rem] font-extrabold tracking-tight">
            Wishlist<span className="font-medium text-muted"> của Thảo Vy</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-1.5">
        <NavItem href="/dashboard" icon={LayoutDashboard} label="Tổng quan" active={isActive("/dashboard")} onClick={onNavigate} />
        <NavItem href="/products" icon={List} label="Tất cả sản phẩm" active={isActive("/products")} onClick={onNavigate} />
        <NavItem href="/categories" icon={Tags} label="Danh mục" active={isActive("/categories")} onClick={onNavigate} />
        {isAdmin ? (
          <>
            <NavItem href="/settings" icon={Settings} label="Cài đặt" active={isActive("/settings")} onClick={onNavigate} />
            <NavItem href="/account" icon={User} label="Tài khoản" active={isActive("/account")} onClick={onNavigate} />
            <NavItem href="/admin" icon={Shield} label="Quản trị" active={isActive("/admin")} onClick={onNavigate} />

            <form action="/api/auth/signout" method="post" onSubmit={() => toast("info", "Đang đăng xuất…")}>
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-[12px] px-3 py-[9px] text-[.875rem] font-medium text-muted transition hover:bg-rose-soft hover:text-red-600 dark:hover:bg-[#3F1D2B]"
              >
                <LogOut className="h-[18px] w-[18px]" />
                <span>Đăng xuất</span>
              </button>
            </form>
          </>
        ) : (
          <div className="pop-in mt-2 rounded-[16px] border border-line bg-bg/70 p-3 text-center">
            <p className="text-[.74rem] font-semibold text-muted">
              Xem thoải mái — thích thì bấm ♥ và “Mua ngay”.
            </p>
            <Link
              href="/login"
              onClick={onNavigate}
              className="btn-primary mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-[12px] px-4 py-2.5 text-[.86rem] font-extrabold text-white shadow-cta transition hover:brightness-105 active:scale-[.98]"
            >
              <KeyRound className="h-4 w-4" /> ADMIN
            </Link>
            <p className="mt-1.5 text-[.66rem] font-semibold text-muted/80">Chỉ Admin đăng nhập để quản lý trang.</p>
          </div>
        )}
      </nav>
    </div>
  );
}
