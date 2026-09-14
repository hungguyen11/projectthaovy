"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/layout/Logo";
import { ConfigNotice } from "@/components/ConfigNotice";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { toAuthEmail } from "@/lib/auth-email";
import { SITE } from "@/lib/config";

export default function LoginPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: toAuthEmail(login),
        password,
      });
      if (error) {
        setError(
          /invalid login/i.test(error.message)
            ? "Sai tên đăng nhập hoặc mật khẩu. Vui lòng thử lại."
            : error.message
        );
        return;
      }
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError("Vui lòng xác minh email để đăng nhập (quản trị có thể tắt bước này).");
      }
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
          List<span className="font-medium text-muted">cuaThaoVy</span>
        </span>
      </div>
      <h1 className="text-[1.5rem] font-extrabold tracking-tight">Chào mừng bạn quay lại</h1>
      <p className="mt-1 text-sm text-muted">Đăng nhập để xem “những món đồ bạn muốn mua”.</p>

      {!configured ? <ConfigNotice className="mt-5" /> : null}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="login" className="mb-1.5 block text-xs font-bold text-muted">
            Tên đăng nhập hoặc email
          </label>
          <input
            id="login"
            className="input-field"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="manhhung / thaovy"
            autoComplete="username"
            required
            disabled={!configured || busy}
          />
        </div>
        <div>
          <label htmlFor="pw" className="mb-1.5 block text-xs font-bold text-muted">
            Mật khẩu
          </label>
          <div className="relative">
            <input
              id="pw"
              type={show ? "text" : "password"}
              className="input-field pr-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={!configured || busy}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:text-ink"
              aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error ? (
          <p className="rounded-xl bg-rose-soft px-3.5 py-2.5 text-sm font-semibold text-red-600 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" size="lg" loading={busy} disabled={!configured || !login || !password}>
          <LogIn className="h-[18px] w-[18px]" /> Đăng nhập
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-bold text-teal-ink underline decoration-dotted dark:text-teal-200">
          Tạo list miễn phí
        </Link>
      </p>
      <p className="mt-1 text-center text-[.72rem] text-muted/80">{SITE.brand} — không bán hàng, chỉ lưu điều bạn muốn mua.</p>
    </div>
  );
}
