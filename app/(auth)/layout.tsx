import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { SITE } from "@/lib/config";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grad-soft relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -top-32 right-1/4 h-[380px] w-[380px] rounded-full bg-[#99F6E4] opacity-50 blur-[70px] dark:opacity-15" />
      <div className="pointer-events-none absolute -bottom-32 left-1/4 h-[340px] w-[340px] rounded-full bg-[#F9A8D4] opacity-45 blur-[70px] dark:opacity-10" />
      <div className="relative w-full max-w-[960px] overflow-hidden rounded-[28px] border border-line bg-surface shadow-pop md:grid md:grid-cols-[.9fr_1.1fr]">
        <aside className="hidden flex-col justify-between bg-surface/60 p-8 md:flex">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={40} />
            <span className="text-lg font-extrabold tracking-tight">
              Wishlist<span className="font-medium text-muted"> của Thảo Vy</span>
            </span>
          </Link>
          <div>
            <h2 className="text-[1.7rem] font-extrabold leading-tight tracking-tight">
              Khu vực
              <br />
              <span className="grad-text">dành cho Admin.</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Trang web công khai — ai cũng xem được. Chỉ Admin đăng nhập để gắn link,
              cập nhật ảnh/tên/giá và quản lý danh mục.
            </p>
          </div>
          <p className="text-xs italic text-muted">“{SITE.motto}” ♥</p>
        </aside>
        <div className="p-6 sm:p-10">{children}</div>
      </div>
    </div>
  );
}
