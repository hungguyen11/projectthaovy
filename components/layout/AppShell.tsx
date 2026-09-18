"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { AppProvider } from "@/components/providers/AppProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { AddProductModal } from "@/components/products/AddProductModal";
import { BulkImportModal } from "@/components/products/BulkImportModal";
import { ProductDetailModal } from "@/components/products/ProductDetailModal";
import { ReviewPopup } from "@/components/products/ReviewPopup";
import { ConfigNotice } from "@/components/ConfigNotice";
import { useApp } from "@/components/providers/AppProvider";
import { applyAccent, getAccent } from "@/lib/accent";

const SUPABASE_READY = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);


export function AppShell({ children }: { children: React.ReactNode }) {
  const [sideOpen, setSideOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setSideOpen(false), [pathname]);
  useEffect(() => applyAccent(getAccent()), []); // chủ đề accent lưu trong máy

  return (
    <AppProvider>
      <div className="flex min-h-dvh">
        {/* desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-[264px] flex-none border-r border-line bg-surface md:block">
          <Suspense fallback={null}>
            <Sidebar />
          </Suspense>
        </aside>

        {/* mobile drawer */}
        {sideOpen ? (
          <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true">
            <div className="fade-in absolute inset-0 bg-slate-900/50" onClick={() => setSideOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-[280px] border-r border-line bg-surface shadow-pop">
              <Suspense fallback={null}>
                <Sidebar onNavigate={() => setSideOpen(false)} />
              </Suspense>
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setSideOpen((v) => !v)} open={sideOpen} />
          {!SUPABASE_READY ? (
            <div className="mx-auto w-full max-w-[1280px] px-3.5 pt-3 md:px-[26px]">
              <ConfigNotice />
            </div>
          ) : null}
          <DbSetupBanner />
          <main className="mx-auto w-full max-w-[1280px] flex-1 px-3.5 pb-28 pt-1 md:px-[26px] md:pb-10">{children}</main>
          <footer className="mx-auto w-full max-w-[1280px] px-3.5 pb-[104px] pt-4 text-center text-[.72rem] font-medium text-muted md:px-[26px] md:pb-5">
            © {new Date().getFullYear()} Wishlist của Thảo Vy · Bản quyền <b className="font-bold text-ink">_hngnguynn_</b>
          </footer>
        </div>
      </div>
      <MobileNav />
      <AddProductModal />
      <BulkImportModal />
      <ProductDetailModal />
      <ReviewPopup />
    </AppProvider>
  );
}

/** Cảnh báo Admin khi DB production thiếu cột (nguyên nhân số 1 của "lỗi database"):
 *  1 chạm là có nguyên lệnh SQL dán thẳng vào Supabase → RUN. Tự ẩn khi đủ cột. */
const FIX_SQL = [
  "alter table public.products add column if not exists owner_note text;",
  "alter table public.products add column if not exists price numeric;",
  "alter table public.products add column if not exists price_label text;",
].join("\n");

function DbSetupBanner() {
  const { isAdmin, dbCheck, recheckDb } = useApp();
  const [copied, setCopied] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  if (!isAdmin || hidden || !dbCheck || dbCheck.dbOk) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(FIX_SQL);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = FIX_SQL;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="fade-in mx-auto mt-3 w-full max-w-[1280px] px-3.5 md:px-[26px]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-amber-900 shadow-card dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200">
        <TriangleAlert className="h-5 w-5 flex-none text-amber-500" />
        <p className="min-w-0 flex-1 text-[.82rem] font-bold leading-snug">
          {Object.keys(dbCheck.columns).length
            ? <>Database đang thiếu cột <code className="rounded bg-amber-200/60 px-1 py-0.5 font-mono text-[.78rem] dark:bg-amber-900/60">{["owner_note", "price", "price_label"].filter((c) => !dbCheck.columns[c]).join(", ")}</code> → lưu review / đồng bộ giá sẽ báo lỗi.</>
            : <>Không kiểm tra được cấu trúc database (mạng chập chờn?) — cứ chạy lệnh này cho chắc.</>}{" "}
          Mở <b>Supabase → SQL Editor → New query</b>, dán lệnh rồi bấm RUN.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void copy()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-amber-500 px-3 text-[.8rem] font-extrabold text-white transition hover:bg-amber-600 active:scale-95"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Chép lệnh SQL
          </button>
          <button
            onClick={async () => {
              setRechecking(true);
              await recheckDb();
              setRechecking(false);
            }}
            className="inline-flex h-9 items-center rounded-xl border border-amber-400/70 px-3 text-[.8rem] font-extrabold transition hover:bg-amber-100 active:scale-95 dark:hover:bg-amber-900/40"
          >
            {rechecking ? "Đang kiểm tra…" : "Chạy xong — kiểm tra lại"}
          </button>
          <button
            onClick={() => setHidden(true)}
            className="inline-flex h-9 items-center rounded-xl px-2 text-[.8rem] font-bold text-amber-700/80 underline-offset-2 hover:underline dark:text-amber-300/80"
          >
            Nhắc sau
          </button>
        </div>
      </div>
    </div>
  );
}
