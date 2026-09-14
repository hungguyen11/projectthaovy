"use client";

import { useCallback, useEffect, useState } from "react";
import { Package, ShieldAlert, Tags, Trash2, UserPlus, Users } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { cn, formatDate, formatVnd } from "@/lib/utils";

interface AdminUser {
  id: string;
  username: string;
  display_name: string | null;
  role: "USER" | "ADMIN";
  created_at: string;
  last_sign_in: string | null;
  products: number;
}
interface AdminProduct {
  id: string;
  username: string;
  source_url: string;
  product_name: string;
  price: number | null;
  status: string;
  created_at: string;
}
interface AdminCat {
  id: string;
  name: string;
  username: string;
  count: number;
}

type Tab = "users" | "products" | "categories";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [cats, setCats] = useState<AdminCat[]>([]);
  const [totals, setTotals] = useState<{ users: number; products: number; categories: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  // tạo tài khoản cho người dùng mới
  const [creating, setCreating] = useState(false);
  const [nu, setNu] = useState("");
  const [nd, setNd] = useState("");
  const [np, setNp] = useState("");
  const [nBusy, setNBusy] = useState(false);
  const [nErr, setNErr] = useState<string | null>(null);

  const createUser = async () => {
    setNBusy(true);
    setNErr(null);
    try {
      await api("/api/admin/users", {
        method: "POST",
        body: { username: nu.trim(), display_name: nd.trim() || undefined, password: np },
      });
      toast("ok", `Đã tạo tài khoản @${nu.trim().toLowerCase()}`, "Người dùng đăng nhập ngay bằng username + mật khẩu vừa đặt.");
      setCreating(false);
      setNu("");
      setNd("");
      setNp("");
      await load();
    } catch (e) {
      setNErr(e instanceof Error ? e.message : "Không tạo được tài khoản. Vui lòng thử lại.");
    } finally {
      setNBusy(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setDenied(false);
    try {
      const [u, p, c] = await Promise.all([
        api<{ users: AdminUser[]; total: number }>("/api/admin/users?per=100"),
        api<{ products: AdminProduct[]; total: number }>("/api/admin/products"),
        api<{ categories: AdminCat[]; total: number }>("/api/admin/categories"),
      ]);
      setUsers(u.users ?? []);
      setProducts(p.products ?? []);
      setCats(c.categories ?? []);
      setTotals({ users: u.total ?? (u.users?.length ?? 0), products: p.total ?? 0, categories: c.total ?? 0 });
    } catch (e) {
      if (e instanceof ApiError && (e.status === 403 || e.code === "FORBIDDEN")) setDenied(true);
      else toast("err", "Lỗi admin", e instanceof Error ? e.message : "Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (denied) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500" />
        <h1 className="text-xl font-extrabold">Khu vực dành riêng cho Admin</h1>
        <p className="max-w-[46ch] text-sm text-muted">
          Tài khoản của bạn không có quyền ADMIN (server-side check). Quản trị viên có thể cấp quyền qua
          Supabase Dashboard → Table Editor → profiles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 pt-3">
        <div>
          <h1 className="flex items-center gap-2 text-[1.45rem] font-extrabold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl btn-primary text-cta"><Users className="h-4 w-4" /></span>
            Admin Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-muted">Tổng quan hệ thống — dữ liệu nhạy cảm của user không được hiển thị ở đây.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => { setCreating(true); setNErr(null); }}>
            <UserPlus className="h-4 w-4" /> Tạo tài khoản
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void load()}>Tải lại</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {[
          { l: "Tổng users", v: totals?.users, i: Users, t: "bg-aqua-mist text-teal-ink dark:bg-teal-950 dark:text-teal-200" },
          { l: "Tổng products", v: totals?.products, i: Package, t: "bg-baby-soft text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
          { l: "Tổng categories", v: totals?.categories, i: Tags, t: "bg-lilac-soft text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
        ].map((s) => (
          <div key={s.l} className="flex items-center gap-3.5 rounded-card border border-line bg-surface p-4.5 p-5 shadow-card">
            <span className={cn("flex h-11 w-11 items-center justify-center rounded-[14px]", s.t)}>
              <s.i className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xl font-extrabold leading-none">{loading ? "·" : s.v ?? 0}</p>
              <p className="mt-1 text-[.74rem] font-semibold text-muted">{s.l}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {(["users", "products", "categories"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-[.82rem] font-semibold capitalize transition",
              tab === k ? "border-teal-deep bg-teal-deep text-white" : "border-line bg-surface text-muted hover:border-teal"
            )}
          >
            {k === "users" ? "Người dùng" : k === "products" ? "Sản phẩm" : "Danh mục"}
          </button>
        ))}
      </div>

      {loading ? (
        <ProductGridSkeleton count={4} />
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <div className="overflow-x-auto">
            {tab === "users" ? (
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-bg/60 text-left text-[.72rem] uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-bold">Người dùng</th>
                    <th className="px-4 py-3 font-bold">Vai trò</th>
                    <th className="px-4 py-3 font-bold">Products</th>
                    <th className="px-4 py-3 font-bold">Ngày tạo</th>
                    <th className="px-4 py-3 font-bold">Lần đăng nhập gần nhất</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-line/60 transition hover:bg-aqua-mist/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full btn-primary text-[.72rem] font-extrabold text-cta">
                            {(u.display_name || u.username || "?").slice(0, 1).toUpperCase()}
                          </span>
                          <span>
                            <b className="block leading-tight">@{u.username}</b>
                            <span className="text-[.74rem] text-muted">{u.display_name ?? "—"}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-2.5 py-1 text-[.7rem] font-bold", u.role === "ADMIN" ? "bg-lilac-soft text-violet-700 dark:bg-violet-950 dark:text-violet-300" : "bg-bg border border-line text-muted")}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-extrabold">{u.products}</td>
                      <td className="px-4 py-3 text-muted">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3 text-muted">{u.last_sign_in ? formatDate(u.last_sign_in) : "chưa rõ"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : tab === "products" ? (
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-bg/60 text-left text-[.72rem] uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-bold">Sản phẩm</th>
                    <th className="px-4 py-3 font-bold">Owner</th>
                    <th className="px-4 py-3 font-bold">Giá</th>
                    <th className="px-4 py-3 font-bold">Trạng thái</th>
                    <th className="px-4 py-3 font-bold">Ngày thêm</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-t border-line/60 transition hover:bg-aqua-mist/20">
                      <td className="max-w-[280px] px-4 py-3">
                        <p className="truncate font-bold">{p.product_name}</p>
                        <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="block max-w-[260px] truncate text-[.72rem] text-teal-ink underline decoration-dotted dark:text-teal-200">
                          {p.source_url}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-aqua-mist text-[.62rem] font-extrabold text-teal-ink dark:bg-teal-950 dark:text-teal-200">
                            {(p.username || "?").slice(0, 1).toUpperCase()}
                          </span>
                          <span className="text-[.78rem] text-muted">@{p.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-extrabold">{p.price != null ? formatVnd(p.price) : "—"}</td>
                      <td className="px-4 py-3"><span className="rounded-full border border-line px-2 py-0.5 text-[.7rem] font-bold text-muted">{p.status}</span></td>
                      <td className="px-4 py-3 text-muted">{formatDate(p.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          aria-label="Xóa sản phẩm (admin)"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-rose-soft hover:text-red-600"
                          onClick={async () => {
                            const ok = await confirm({
                              title: "Admin: xóa sản phẩm này?",
                              message: p.product_name.slice(0, 70),
                              okText: "Xóa sản phẩm",
                            });
                            if (!ok) return;
                            try {
                              await api(`/api/products/${p.id}`, { method: "DELETE" });
                              setProducts((ps) => ps.filter((x) => x.id !== p.id));
                              toast("ok", "Đã xóa (admin)", "");
                            } catch {
                              toast("err", "Không thể xóa", "Vui lòng thử lại.");
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="bg-bg/60 text-left text-[.72rem] uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-bold">Danh mục</th>
                    <th className="px-4 py-3 font-bold">Owner</th>
                    <th className="px-4 py-3 font-bold">Số sản phẩm</th>
                  </tr>
                </thead>
                <tbody>
                  {cats.map((c) => (
                    <tr key={c.id} className="border-t border-line/60 transition hover:bg-aqua-mist/20">
                      <td className="px-4 py-3 font-bold">{c.name}</td>
                      <td className="px-4 py-3 text-muted">@{c.username}</td>
                      <td className="px-4 py-3">{c.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={
          <span className="flex items-center gap-2">
            <UserPlus className="h-[18px] w-[18px]" /> Tạo tài khoản cho người dùng
          </span>
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>Hủy</Button>
            <Button onClick={() => void createUser()} loading={nBusy} disabled={!nu.trim() || np.length < 8}>
              Tạo tài khoản
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted" htmlFor="adm-u">Username *</label>
            <input id="adm-u" className="input-field" value={nu} onChange={(e) => setNu(e.target.value.toLowerCase())} maxLength={32} placeholder="thaovy" />
            <p className="mt-1 text-[.72rem] text-muted">3–32 ký tự: chữ thường, số, “.”, “_”, “-”. Người dùng đăng nhập bằng chính username này — không cần email.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted" htmlFor="adm-d">Tên hiển thị</label>
            <input id="adm-d" className="input-field" value={nd} onChange={(e) => setNd(e.target.value)} maxLength={64} placeholder="Thảo Vy (bỏ trống = dùng username)" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted" htmlFor="adm-p">Mật khẩu tạm thời *</label>
            <input id="adm-p" className="input-field" value={np} onChange={(e) => setNp(e.target.value)} autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" />
            <p className="mt-1 text-[.72rem] text-muted">Người dùng nên vào Cài đặt → Đổi mật khẩu sau lần đăng nhập đầu.</p>
          </div>
          {nErr ? <p className="rounded-xl bg-rose-soft px-3.5 py-2.5 text-sm font-semibold text-red-600 dark:bg-red-950 dark:text-red-300">{nErr}</p> : null}
        </div>
      </Modal>
    </div>
  );
}
