"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock, CreditCard, LogOut, Mail, ShieldCheck, User as UserIcon } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { useToast } from "@/components/providers/ToastProvider";

/**
 * Trang "Tài khoản" theo mock (bottom-nav mobile trỏ về đây):
 * hồ sơ gọn — avatar, tên, @username, số liệu của chính bạn, lối tắt.
 */
export default function AccountPage() {
  const { profile, stats } = useApp();
  const toast = useToast();
  const name = profile?.display_name || profile?.username || "Bạn";
  const initial = name.slice(0, 1).toUpperCase();

  const rows = [
    { icon: UserIcon, k: "Username", v: `@${profile?.username ?? "—"}` },
    { icon: profile?.role === "ADMIN" ? ShieldCheck : CreditCard, k: "Vai trò", v: profile?.role === "ADMIN" ? "Quản trị viên" : "Thành viên" },
    { icon: CalendarDays, k: "Tham gia từ", v: profile?.created_at ? new Date(profile.created_at).toLocaleDateString("vi-VN") : "—" },
    { icon: CheckCircle2, k: "Đang mua", v: `${stats.PURCHASED} món · tổng ${stats.total} món đã lưu` },
  ];

  return (
    <div className="mx-auto max-w-[560px] space-y-5">
      <div className="rise-in pt-4">
        <h1 className="text-[1.45rem] font-extrabold tracking-tight">Tài khoản</h1>
        <p className="mt-0.5 text-sm text-muted">Thông tin của bạn — ảnh & tên đổi ở phần Cài đặt.</p>
      </div>

      <div className="rise-in flex items-center gap-4 rounded-card border border-line bg-surface p-5 shadow-card" style={{ animationDelay: "60ms" }}>
        <span className="flex h-[64px] w-[64px] flex-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-teal-300 to-teal-deep text-[1.35rem] font-extrabold text-white shadow-cta">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={name} className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold">{name}</p>
          <p className="text-[.82rem] font-semibold text-muted">@{profile?.username}</p>
          <Link href="/settings" className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-line bg-bg px-3 py-1 text-[.74rem] font-bold text-teal-ink transition hover:border-teal active:scale-95 dark:text-teal-200">
            Chỉnh sửa hồ sơ →
          </Link>
        </div>
      </div>

      {/* thống kê của tôi */}
      <div className="rise-in grid grid-cols-2 gap-3.5 md:grid-cols-4" style={{ animationDelay: "120ms" }}>
        {[
          { label: "Tổng", v: stats.total, icon: CheckCircle2, cls: "bg-teal-soft text-teal dark:text-teal-300" },
          { label: "Dự định", v: stats.PENDING, icon: Clock, cls: "bg-baby-soft text-sky-600 dark:text-sky-300" },
          { label: "Yêu thích", v: stats.FAVORITE, icon: UserIcon, cls: "bg-pinky-soft text-[#DB4D8C] dark:text-[#F9A8D4]" },
          { label: "Đã mua", v: stats.PURCHASED, icon: CreditCard, cls: "bg-mint-soft text-mint dark:text-[#6EE7B7]" },
        ].map((s) => (
          <div key={s.label} className="rounded-card border border-line bg-surface p-4 text-center shadow-card">
            <span className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full ${s.cls}`}>
              <s.icon className="h-[18px] w-[18px]" />
            </span>
            <p className="text-xl font-extrabold leading-none">{s.v}</p>
            <p className="mt-1 text-[.74rem] font-bold text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rise-in divide-y divide-line rounded-card border border-line bg-surface shadow-card" style={{ animationDelay: "180ms" }}>
        {rows.map((r) => (
          <div key={r.k} className="flex items-center gap-3 px-5 py-3.5">
            <r.icon className="h-[18px] w-[18px] flex-none text-teal dark:text-teal-300" />
            <p className="text-[.82rem] font-bold text-muted">{r.k}</p>
            <p className="ml-auto min-w-0 truncate text-right text-[.86rem] font-semibold">{r.v}</p>
          </div>
        ))}
      </div>

      <form
        action="/api/auth/signout"
        method="post"
        onSubmit={() => toast("info", "Đang đăng xuất…")}
        className="rise-in"
        style={{ animationDelay: "240ms" }}
      >
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-line bg-surface py-3 text-sm font-bold text-red-600 shadow-card transition hover:border-rose hover:bg-rose-soft active:scale-[.99] dark:text-red-300"
        >
          <LogOut className="h-4 w-4" /> Đăng xuất khỏi thiết bị này
        </button>
      </form>
    </div>
  );
}
