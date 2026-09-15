"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Moon, Plus, Search, Settings, Sun, Clock, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useApp } from "@/components/providers/AppProvider";
import { MARKETPLACE_META } from "@/lib/config";
import { timeAgo } from "@/lib/utils";

export function Topbar({ onMenu, open = false }: { onMenu: () => void; open?: boolean }) {
  const { query, setQuery, profile, products, setDetailProduct, setAddOpen } = useApp();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [local, setLocal] = useState(query);
  const [openPop, setOpenPop] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => setLocal(query), [query]);

  const recent = [...products].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 5);

  const onChange = (v: string) => {
    setLocal(v);
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => {
      setQuery(v);
      if (v.trim()) router.push("/products");
    }, 250);
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpenPop(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const dark = resolvedTheme === "dark";
  const initial = (profile?.display_name || profile?.username || "B").slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-line/60 bg-bg/85 backdrop-blur px-4 py-3 md:px-[26px]">
      <button
        type="button"
        className={`ham text-muted hover:bg-teal-soft hover:text-teal-deep md:hidden ${open ? "is-open" : ""}`}
        onClick={onMenu}
        aria-label={open ? "Đóng menu" : "Mở menu"}
        aria-expanded={open}
      >
        <span />
        <span />
      </button>

      <div className="relative max-w-[460px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={local}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tìm sản phẩm, danh mục…"
          className="w-full rounded-full border border-line bg-surface py-2.5 pl-10 pr-4 text-sm shadow-card outline-none transition placeholder:text-muted/70 focus:border-teal focus:ring-4 focus:ring-teal/10"
          aria-label="Tìm sản phẩm"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          aria-label={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
          onClick={() => setTheme(dark ? "light" : "dark")}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-aqua-mist hover:text-teal-ink active:scale-95 dark:hover:bg-teal-950 dark:hover:text-teal-200"
        >
          {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
        <div className="relative" ref={bellRef}>
          <button
            aria-label="Vừa thêm gần đây"
            aria-expanded={bellOpen}
            onClick={() => setBellOpen((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-aqua-mist hover:text-teal-ink active:scale-95 dark:hover:bg-teal-950 dark:hover:text-teal-200"
          >
            <Bell className="h-[18px] w-[18px]" />
            {products.length > 0 ? <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-pinky ring-2 ring-bg" /> : null}
          </button>
          {bellOpen ? (
            <div className="pop-in absolute right-0 top-11 z-50 w-[290px] rounded-2xl border border-line bg-surface p-2 shadow-pop">
              <p className="flex items-center gap-1.5 px-2 pb-1.5 pt-1 text-[.7rem] font-extrabold uppercase tracking-wide text-muted">
                <Clock className="h-3.5 w-3.5" /> Vừa thêm gần đây
              </p>
              {recent.length ? (
                recent.map((rp) => {
                  const mp = MARKETPLACE_META[rp.marketplace] ?? MARKETPLACE_META.OTHER;
                  return (
                    <button
                      key={rp.id}
                      onClick={() => {
                        setBellOpen(false);
                        setDetailProduct(rp);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-aqua-mist dark:hover:bg-[#1E293B]"
                    >
                      <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-[8px] text-[.66rem] font-extrabold ${mp.badge}`}>
                        <i className="not-italic">{mp.letter}</i>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[.8rem] font-bold">{rp.product_name}</span>
                        <span className="block text-[.68rem] font-semibold text-muted">{timeAgo(rp.created_at)}</span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="px-2 py-3 text-center">
                  <p className="text-[.8rem] font-semibold text-muted">Chưa có sản phẩm nào.</p>
                  <button
                    onClick={() => {
                      setBellOpen(false);
                      setAddOpen(true);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-teal-soft px-3.5 py-1.5 text-[.76rem] font-extrabold text-teal-ink transition hover:brightness-95 active:scale-95 dark:bg-teal-950 dark:text-teal-200"
                  >
                    <Plus className="h-3.5 w-3.5" /> Lưu món đầu tiên
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="relative" ref={popRef}>
          <button
            onClick={() => setOpenPop((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-2.5 text-sm font-semibold shadow-card transition hover:border-teal"
          >
            <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full btn-primary text-[.72rem] font-extrabold text-white">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </span>
            <span className="hidden sm:inline">{profile?.display_name || profile?.username}</span>
            <i className="not-italic text-muted">⌄</i>
          </button>
          {openPop ? (
            <div className="pop-in absolute right-0 top-12 z-50 min-w-[216px] rounded-2xl border border-line bg-surface p-2 shadow-pop">
              <div className="flex items-center gap-2.5 p-2">
                <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full btn-primary text-sm font-extrabold text-white">
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initial
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{profile?.display_name || profile?.username}</p>
                  <p className="text-[.7rem] font-bold text-teal-ink dark:text-teal-200">{profile?.role ?? "USER"}</p>
                </div>
              </div>
              <div className="my-1.5 h-px bg-line" />
              <button onClick={() => { setOpenPop(false); router.push("/settings"); }} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition hover:bg-aqua-mist/60 dark:hover:bg-teal-950/60">
                <Settings className="h-4 w-4" /> Cài đặt tài khoản
              </button>
              <form action="/api/auth/signout" method="post" className="w-full">
                <button type="submit" className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-rose-soft dark:text-red-300">
                  <LogOut className="h-4 w-4" /> Đăng xuất
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
