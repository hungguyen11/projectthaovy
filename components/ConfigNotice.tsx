import { TriangleAlert } from "lucide-react";
import Link from "next/link";

/** Hiện khi thiếu env Supabase — người mới biết ngay phải làm gì (README). */
export function ConfigNotice({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-start gap-3 rounded-card border border-amber-300/60 bg-honey-soft p-5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200 ${className}`}>
      <p className="flex items-center gap-2 font-extrabold">
        <TriangleAlert className="h-4 w-4" /> Chưa cấu hình Supabase
      </p>
      <p>
        Website đang chạy ở chế độ “vỏ giao diện”. Để dùng dữ liệu thật (tài khoản, danh sách, RLS), hãy tạo file{" "}
        <code className="rounded bg-black/10 px-1.5 py-0.5 font-bold dark:bg-white/10">.env.local</code> theo{" "}
        <code className="rounded bg-black/10 px-1.5 py-0.5 font-bold dark:bg-white/10">.env.example</code>,
        chạy <code className="rounded bg-black/10 px-1.5 py-0.5 font-bold dark:bg-white/10">database/schema.sql</code> trong Supabase SQL Editor, rồi khởi động lại{" "}
        <code className="rounded bg-black/10 px-1.5 py-0.5 font-bold dark:bg-white/10">npm run dev</code>.
      </p>
      <Link href="/#how" className="font-bold underline decoration-dotted">
        Xem hướng dẫn đầy đủ trong README.md →
      </Link>
    </div>
  );
}
