"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/layout/Logo";
import { ConfigNotice } from "@/components/ConfigNotice";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { toAuthEmail } from "@/lib/auth-email";

export default function RegisterPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured) return;
    setError(null);

    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      setError("Username 3–32 ký tự: chữ thường, số, . _ -");
      return;
    }
    if (password.length < 8) {
      setError("Mật khẩu cần tối thiểu 8 ký tự.");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu xác nhận chưa khớp.");
      return;
    }
    if (!agree) {
      setError("Bạn cần đồng ý với điều khoản để tiếp tục.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: toAuthEmail(username),
        password,
        options: {
          data: { username, display_name: displayName.trim() || username },
        },
      });
      if (error) {
        setError(error.message);
        return;
      }
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      setDone(true);
    } catch {
      setError("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-2.5 md:hidden">
        <Logo size={34} />
        <span className="font-extrabold tracking-tight">
          Wishlist<span className="font-medium text-muted"> của Thảo Vy</span>
        </span>
      </div>
      <h1 className="text-[1.5rem] font-extrabold tracking-tight">Tạo list của riêng bạn</h1>
      <p className="mt-1 text-sm text-muted">Chỉ mất 30 giây. Miễn phí, không cần thẻ.</p>

      {!configured ? <ConfigNotice className="mt-5" /> : null}

      {done ? (
        <div className="mt-6 rounded-2xl border border-line bg-mint-soft p-5 text-sm font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          Tài khoản đã được tạo! Hãy kiểm tra email để xác minh, sau đó{" "}
          <Link href="/login" className="underline decoration-dotted">
            đăng nhập
          </Link>
          . (Mẹo: quản trị có thể tắt bước xác minh email trong Supabase → Authentication → Sign In / Up.)
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3.5">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div>
              <label htmlFor="u" className="mb-1.5 block text-xs font-bold text-muted">Username *</label>
              <input
                id="u"
                className="input-field"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="thaovy"
                autoComplete="username"
                required
                disabled={!configured || busy}
              />
            </div>
            <div>
              <label htmlFor="dn" className="mb-1.5 block text-xs font-bold text-muted">Tên hiển thị</label>
              <input
                id="dn"
                className="input-field"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Thảo Vy"
                disabled={!configured || busy}
              />
            </div>
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div>
              <label htmlFor="p" className="mb-1.5 block text-xs font-bold text-muted">Mật khẩu (≥ 8 ký tự) *</label>
              <input
                id="p"
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                disabled={!configured || busy}
              />
            </div>
            <div>
              <label htmlFor="c" className="mb-1.5 block text-xs font-bold text-muted">Xác nhận mật khẩu *</label>
              <input
                id="c"
                type="password"
                className="input-field"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                disabled={!configured || busy}
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-muted">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-teal"
            />
            <span>
              Tôi hiểu <b>Wishlist của Thảo Vy không bán hàng</b> — đây là kho lưu wishlist cá nhân, dữ liệu chỉ mình tôi thấy
              và không bao giờ hiển thị công khai.
            </span>
          </label>

          {error ? (
            <p className="rounded-xl bg-rose-soft px-3.5 py-2.5 text-sm font-semibold text-red-600 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!configured}>
            <UserPlus className="h-[18px] w-[18px]" /> Tạo list miễn phí
          </Button>
        </form>
      )}

      <p className="mt-5 text-center text-sm text-muted">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-bold text-teal-ink underline decoration-dotted dark:text-teal-200">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
