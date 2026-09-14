import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "List của tôi",
  robots: { index: false, follow: false }, // vùng đăng nhập: không index
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
