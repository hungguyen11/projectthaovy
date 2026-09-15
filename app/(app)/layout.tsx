import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Wishlist của Thảo Vy", template: "%s · Wishlist của Thảo Vy" },
  // Public — trang này sinh ra để ai cũng xem được, cho phép search index.
  robots: { index: true, follow: true },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
