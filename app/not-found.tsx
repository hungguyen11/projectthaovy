import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grad-soft flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-6xl">🫧</span>
      <h1 className="text-3xl font-extrabold tracking-tight">Không tìm thấy trang</h1>
      <p className="max-w-[44ch] text-muted">
        Có vẻ món đồ này… đã đi lạc. Hãy quay về list của bạn để tiếp tục săn những thứ xinh xinh.
      </p>
      <Link
        href="/dashboard"
        className="btn-primary mt-2 rounded-full px-6 py-3 font-semibold text-cta shadow-cta transition hover:brightness-105"
      >
        Về Dashboard
      </Link>
    </div>
  );
}
