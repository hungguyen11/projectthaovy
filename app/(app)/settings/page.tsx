"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Monitor, Moon, Save, Sun, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useApp } from "@/components/providers/AppProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api-client";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types";

export default function SettingsPage() {
  const { profile, refreshAll } = useApp();
  return (
    <div className="space-y-5">
      <div className="pt-3">
        <h1 className="text-[1.45rem] font-extrabold tracking-tight">Cài đặt</h1>
        <p className="mt-0.5 text-sm text-muted">Thông tin tài khoản, ảnh đại diện, giao diện và mật khẩu của bạn.</p>
      </div>
      <ProfileCard profile={profile} onSaved={() => void refreshAll()} />
      <ThemeCard />
      <PasswordCard />
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rise-in rounded-card border border-line bg-surface p-6 shadow-card">
      <h2 className="text-[1.05rem] font-extrabold">{title}</h2>
      {sub ? <p className="mb-4 mt-0.5 text-sm text-muted">{sub}</p> : <div className="mb-2" />}
      {children}
    </section>
  );
}

/* ── Resize ảnh phía trình duyệt: cắt vuông giữa, xuất WebP 256px ── */
async function resizeToSquareBlob(file: File, size = 256): Promise<Blob> {
  const source = await loadDrawable(file);
  const side = Math.min(source.width, source.height);
  const sx = (source.width - side) / 2;
  const sy = (source.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ canvas.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, sx, sy, side, side, 0, 0, size, size);
  if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) source.close();
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Không xuất được ảnh."))), "image/webp", 0.92)
  );
}

async function loadDrawable(file: File): Promise<{ width: number; height: number } & CanvasImageSource> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* rơi xuống <img> */
    }
  }
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Không đọc được file ảnh."));
    img.src = URL.createObjectURL(file);
  });
}

function ProfileCard({ profile, onSaved }: { profile: Profile | null; onSaved: () => void }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState(profile?.username ?? "");
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // đồng bộ khi profile tải xong
  const [synced, setSynced] = useState<string | null>(null);
  if (profile && synced !== profile.user_id) {
    setSynced(profile.user_id);
    setUsername(profile.username ?? "");
    setDisplayName(profile.display_name ?? "");
  }

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api("/api/profile", {
        method: "PATCH",
        body: { username: username.trim(), display_name: displayName.trim() },
      });
      onSaved();
      toast("ok", "Đã cập nhật hồ sơ", "Thay đổi đã được lưu.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Không thể cập nhật hồ sơ. Vui lòng thử lại.";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleAvatarFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("err", "File không hợp lệ", "Hãy chọn ảnh JPG / PNG / WebP.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast("err", "Ảnh quá lớn", "Ảnh tối đa 6 MB — chọn ảnh nhỏ hơn nhé.");
      return;
    }
    if (!isSupabaseConfigured()) {
      toast("err", "Chưa cấu hình Supabase", "Không thể tải ảnh lên Storage.");
      return;
    }
    setUploading(true);
    try {
      const blob = await resizeToSquareBlob(file);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Phiên đăng nhập hết hạn — tải lại trang rồi thử lại.");
      const path = `${user.id}/avatar.webp`;
      const { error: up } = await supabase.storage.from("avatars").upload(path, blob, {
        contentType: "image/webp",
        upsert: true,
      });
      if (up) {
        throw new Error(
          /bucket|not found|invalid/i.test(up.message)
            ? "Thiếu bucket 'avatars' — chạy file database/avatar-storage.sql trong Supabase → SQL Editor rồi thử lại."
            : up.message
        );
      }
      const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      await api("/api/profile", { method: "PATCH", body: { avatar_url: url } });
      onSaved();
      toast("ok", "Đã cập nhật ảnh đại diện", "Ảnh mới hiện ngay lập tức.");
    } catch (e) {
      toast("err", "Không tải được ảnh", e instanceof Error ? e.message : "Vui lòng thử lại.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeAvatar = async () => {
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try { await supabase.storage.from("avatars").remove([`${user.id}/avatar.webp`]); } catch { /* ảnh ngoài bucket không quan trọng */ }
      }
      await api("/api/profile", { method: "PATCH", body: { avatar_url: "" } });
      onSaved();
      toast("info", "Đã xóa ảnh đại diện", "App quay về chữ cái đầu tiên.");
    } catch {
      toast("err", "Không xóa được ảnh", "Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Section title="Hồ sơ của bạn" sub="Username dùng để đăng nhập — được map tự động tới email nội bộ của Supabase Auth.">
      {/* avatar */}
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-bg/50 p-4">
        <span className="relative flex h-[72px] w-[72px] flex-none items-center justify-center overflow-hidden rounded-full btn-primary text-[1.6rem] font-extrabold text-cta">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="Ảnh đại diện" className="h-full w-full object-cover" />
          ) : (
            (displayName || username || profile?.username || "B").slice(0, 1).toUpperCase()
          )}
          {uploading ? (
            <span className="absolute inset-0 flex items-center justify-center bg-slate-900/45">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </span>
          ) : null}
        </span>
        <div className="min-w-[180px] flex-1">
          <p className="text-sm font-extrabold">Ảnh đại diện</p>
          <p className="mt-0.5 text-[.78rem] leading-snug text-muted">
            Tải 1 ảnh từ điện thoại/máy tính (JPG · PNG · WebP, tối đa 6 MB). Ảnh tự cắt vuông 256px và nén — không lo nặng trang.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer select-none items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-[.85rem] font-semibold shadow-card transition hover:border-teal hover:text-teal-ink active:scale-[.98] dark:hover:text-teal-200">
              <Camera className="h-4 w-4" /> {uploading ? "Đang tải lên…" : "Chọn ảnh từ máy"}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => void handleAvatarFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {profile?.avatar_url ? (
              <button
                type="button"
                onClick={() => void removeAvatar()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-2 text-[.85rem] font-semibold text-red-500 transition hover:bg-rose-soft disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> Xóa ảnh
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-muted" htmlFor="su">Username</label>
          <input id="su" className="input-field" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} maxLength={32} placeholder="thaovy" />
          <p className="mt-1 text-[.7rem] text-muted">3–32 ký tự: a-z, 0-9, “.”, “_”, “-”</p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-muted" htmlFor="sdn">Tên hiển thị</label>
          <input id="sdn" className="input-field" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={64} placeholder="Thảo Vy" />
        </div>
      </div>
      {err ? <p className="mt-3 rounded-xl bg-rose-soft px-3.5 py-2.5 text-sm font-semibold text-red-600 dark:bg-red-950 dark:text-red-300">{err}</p> : null}
      <div className="mt-4 flex gap-2.5">
        <Button onClick={() => void save()} loading={busy}>
          <Save className="h-4 w-4" /> Lưu thay đổi
        </Button>
        <form action="/api/auth/signout" method="post">
          <Button type="submit" variant="ghost">Đăng xuất</Button>
        </form>
      </div>
    </Section>
  );
}

function ThemeCard() {
  const { theme, setTheme } = useTheme();
  const opts = [
    { v: "light", label: "Light", icon: Sun, sw: "bg-[#EFF8F7]" },
    { v: "dark", label: "Dark", icon: Moon, sw: "bg-[#0E1526]" },
    { v: "system", label: "System", icon: Monitor, sw: "bg-gradient-to-r from-[#EFF8F7] from-50% to-[#0A1A20] to-50%" },
  ];
  return (
    <Section title="Giao diện" sub="Sáng · Tối · Theo hệ thống — lưu ngay trong trình duyệt.">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        {opts.map((o) => (
          <button
            key={o.v}
            onClick={() => setTheme(o.v)}
            className={cn(
              "flex flex-1 flex-col items-center gap-2 rounded-2xl border-[1.5px] p-3.5 text-sm font-bold transition active:scale-[.98]",
              theme === o.v ? "border-teal bg-aqua-mist/50 text-teal-ink dark:bg-teal-950 dark:text-teal-200" : "border-line text-muted hover:border-teal"
            )}
          >
            <span className={cn("h-10 w-full rounded-[10px] border border-line", o.sw)} />
            <o.icon className="h-4 w-4" /> {o.label}
          </button>
        ))}
      </div>
    </Section>
  );
}

function PasswordCard() {
  const toast = useToast();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (pw.length < 8) return setErr("Mật khẩu mới cần tối thiểu 8 ký tự.");
    if (pw !== pw2) return setErr("Mật khẩu xác nhận chưa khớp.");
    if (!isSupabaseConfigured()) return setErr("Chưa cấu hình Supabase — không thể đổi mật khẩu.");
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) {
        setErr(/denied|recent/i.test(error.message) ? "Vì lý do bảo mật, hãy đăng xuất rồi đăng nhập lại trước khi đổi mật khẩu." : error.message);
      } else {
        setPw("");
        setPw2("");
        toast("ok", "Đã đổi mật khẩu", "Mật khẩu mới có hiệu lực ngay.");
      }
    } catch {
      setErr("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Đổi mật khẩu" sub="Xử lý qua Supabase Auth (bcrypt) phía server — mật khẩu không bao giờ nằm trong frontend.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-muted" htmlFor="np">Mật khẩu mới</label>
          <input id="np" type="password" className="input-field" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-muted" htmlFor="np2">Xác nhận mật khẩu mới</label>
          <input id="np2" type="password" className="input-field" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
        </div>
      </div>
      {err ? <p className="mt-3 rounded-xl bg-rose-soft px-3.5 py-2.5 text-sm font-semibold text-red-600 dark:bg-red-950 dark:text-red-300">{err}</p> : null}
      <div className="mt-4">
        <Button onClick={() => void submit()} loading={busy} disabled={!pw || !pw2}>Cập nhật mật khẩu</Button>
      </div>
    </Section>
  );
}
