"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppProvider } from "@/components/providers/AppProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { AddProductModal } from "@/components/products/AddProductModal";
import { BulkImportModal } from "@/components/products/BulkImportModal";
import { ProductDetailModal } from "@/components/products/ProductDetailModal";
import { ConfigNotice } from "@/components/ConfigNotice";
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
    </AppProvider>
  );
}
