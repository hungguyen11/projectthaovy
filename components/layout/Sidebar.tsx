"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  List,
  Heart,
  Star,
  Bookmark,
  CheckCircle2,
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
        "hover:bg-aqua-mist hover:text-ink dark:hover:bg-[#122C33]",
        active && "bg-teal-soft font-bold text-teal-ink dark:bg-[#0E3A3D] dark:text-teal-200"
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
  const { profile } = useApp();
  const isActive = useActive();
  const toast = useToast();

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-3 pt-[18px]">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onNavigate}>
          <Logo size={38} />
          <span className="text-[1.06rem] font-extrabold tracking-tight">
            List<span className="font-medium text-muted">cuaThaoVy</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-1.5">
        <NavItem href="/dashboard" icon={LayoutDashboard} label="Tổng quan" active={isActive("/dashboard")} onClick={onNavigate} />
        <NavItem href="/products" icon={List} label="Tất cả sản phẩm" active={isActive("/products")} onClick={onNavigate} />
        <NavItem href="/products?status=FAVORITE" icon={Heart} label="Yêu thích" active={isActive("/products?status=FAVORITE")} onClick={onNavigate} />
        <NavItem href="/products?status=PRIORITY" icon={Star} label="Ưu tiên mua" active={isActive("/products?status=PRIORITY")} onClick={onNavigate} />
        <NavItem href="/products?status=PENDING" icon={Bookmark} label="Dự định mua" active={isActive("/products?status=PENDING")} onClick={onNavigate} />
        <NavItem href="/products?status=PURCHASED" icon={CheckCircle2} label="Đã mua" active={isActive("/products?status=PURCHASED")} onClick={onNavigate} />
        <NavItem href="/categories" icon={Tags} label="Danh mục" active={isActive("/categories")} onClick={onNavigate} />
        <NavItem href="/settings" icon={Settings} label="Cài đặt" active={isActive("/settings")} onClick={onNavigate} />
        <NavItem href="/account" icon={User} label="Tài khoản" active={isActive("/account")} onClick={onNavigate} />
        {profile?.role === "ADMIN" ? (
          <NavItem href="/admin" icon={Shield} label="Quản trị" active={isActive("/admin")} onClick={onNavigate} />
        ) : null}

        <form action="/api/auth/signout" method="post" onSubmit={() => toast("info", "Đang đăng xuất…")}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-[12px] px-3 py-[9px] text-[.875rem] font-medium text-muted transition hover:bg-rose-soft hover:text-red-600 dark:hover:bg-[#381722]"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span>Đăng xuất</span>
          </button>
        </form>
      </nav>

      {/* quote viết tay — đúng chất mock */}
      <div className="m-3 mt-1 rounded-[16px] bg-aqua-soft/80 px-4 py-3.5 text-center dark:bg-[#0D222A]">
        <p className="hand text-[.86rem] leading-relaxed text-[#2B6B66] dark:text-teal-200">
          Thấy thích
          <br />
          thì lưu lại,
          <br />
          cần thì mua! <span className="text-pinky">🤍</span>
        </p>
      </div>
    </div>
  );
}
