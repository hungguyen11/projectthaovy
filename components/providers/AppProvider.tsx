"use client";

/**
 * AppProvider — nguồn dữ liệu duy nhất của khu vực đăng nhập:
 * profile, products, categories + mọi mutation qua /api.
 * Lọc/tìm kiếm/sắp xếp làm ở client (data cá nhân, đã debounce).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ApiError, api } from "@/lib/api-client";
import { useToast } from "@/components/providers/ToastProvider";
import type { Category, ExtractedMeta, Product, ProductStatus, Profile } from "@/types";

/** Bộ danh mục skincare theo chu trình ngày/đêm của chủ list.
 *  CHỈ Admin mới gieo được (khi đăng nhập, 1 lần per máy — hoặc bấm nút ở trang Danh mục).
 *  Không auto-seed cho khách, không đụng DB trigger. */
export const SKINCARE_SET = [
  "Tẩy trang",
  "Sữa rửa mặt",
  "Toner (nước cân bằng)",
  "Tẩy tế bào chết (1-2 lần/tuần)",
  "Serum (tinh chất)",
  "Đặc trị (mụn / lão hóa)",
  "Kem dưỡng ẩm",
  "Kem chống nắng",
];

export interface NewProductInput {
  source_url: string;
  category_id: string | null;
  status: ProductStatus;
  snapshot: Partial<ExtractedMeta>;
  /** câu mách của chủ list (tùy chọn) */
  owner_note?: string | null;
}

interface AppCtx {
  profile: Profile | null;
  products: Product[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  query: string;
  setQuery: (q: string) => void;

  refreshAll: () => Promise<void>;
  addProduct: (input: NewProductInput) => Promise<{ ok: boolean; duplicate?: Product; message?: string }>;
  patchProduct: (id: string, patch: { status?: ProductStatus; category_id?: string | null; owner_note?: string | null }) => Promise<Product | null>;
  deleteProduct: (id: string) => Promise<boolean>;

  createCategory: (name: string) => Promise<Category | null>;
  renameCategory: (id: string, name: string) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;

  isAdmin: boolean;
  guestFavs: Set<string>;
  toggleGuestFav: (id: string) => void;

  addOpen: boolean;
  setAddOpen: (v: boolean) => void;
  bulkOpen: boolean;
  setBulkOpen: (v: boolean) => void;
  detailProduct: Product | null;
  setDetailProduct: (p: Product | null) => void;
  /** pop-up "chủ list mách" cho NGƯỜI XEM khi bấm vào tên sản phẩm */
  reviewProduct: Product | null;
  setReviewProduct: (p: Product | null) => void;

  /** kết quả tự kiểm tra hạ tầng (chỉ Admin): cột DB + khách thấy bao nhiêu SP */
  dbCheck: { dbOk: boolean; guestVisible: number; guestOk: boolean; columns: Record<string, boolean>; err?: string } | null;
  recheckDb: () => Promise<void>;

  stats: { total: number; PENDING: number; PRIORITY: number; FAVORITE: number; PURCHASED: number };
}

const Ctx = createContext<AppCtx | null>(null);
export function useApp(): AppCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const isAdmin = profile?.role === "ADMIN";

  // khách không tài khoản → tim ♥ lưu ngay trên máy người xem (localStorage), không đụng DB
  const [guestFavs, setGuestFavs] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      return new Set(JSON.parse(window.localStorage.getItem("tv-guest-favs") ?? "[]") as string[]);
    } catch {
      return new Set();
    }
  });
  const toggleGuestFav = useCallback((id: string) => {
    setGuestFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem("tv-guest-favs", JSON.stringify([...next]));
      } catch { /* private mode */ }
      return next;
    });
  }, []);

  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [reviewProduct, setReviewProduct] = useState<Product | null>(null);

  const refreshAll = useCallback(async () => {
    setError(null);
    try {
      const [p, c, prof] = await Promise.all([
        api<{ products: Product[] }>("/api/products"),
        api<{ categories: Category[] }>("/api/categories"),
        api<{ profile: Profile | null }>("/api/profile"),
      ]);
      setProducts(p.products ?? []);
      setCategories(c.categories ?? []);
      setProfile(prof.profile ?? null);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Không thể kết nối đến máy chủ. Vui lòng thử lại.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  /* ── Admin: tự kiểm tra hạ tầng + gieo sẵn bộ danh mục Skincare ── */
  const [dbCheck, setDbCheck] = useState<AppCtx["dbCheck"]>(null);
  const checkedRef = useRef(false);
  const seededRef = useRef(false);

  const recheckDb = useCallback(async () => {
    try {
      const r = await api<{ dbOk: boolean; guestVisible: number; columns?: Record<string, boolean> }>("/api/admin/public-check");
      setDbCheck({
        dbOk: !!r.dbOk,
        guestVisible: r.guestVisible ?? 0,
        guestOk: (r.guestVisible ?? 0) > 0,
        columns: r.columns ?? {},
      });
    } catch (e) {
      setDbCheck((d) => ({ ...(d ?? { dbOk: false, guestVisible: 0, guestOk: false, columns: {} }), err: e instanceof ApiError ? e.message : "Không kiểm tra được hạ tầng." }));
    }
  }, []);

  useEffect(() => {
    if (!isAdmin || loading || checkedRef.current) return;
    checkedRef.current = true;
    void recheckDb();

    // gieo 8 danh mục skincare ĐÚNG 1 LẦN per trình duyệt — server tự bỏ món trùng tên
    let seen = true;
    try {
      seen = !!window.localStorage.getItem("tv-skincare-seed-v1");
      if (!seen) window.localStorage.setItem("tv-skincare-seed-v1", "1");
    } catch { /* private mode: vẫn gieo, chỉ là lần sau gieo lại (server chặn trùng, không hại gì) */ }
    if (seen || seededRef.current) return;
    seededRef.current = true;
    void (async () => {
      const names = categories.length ? SKINCARE_SET.filter((n) => !categories.some((c) => c.name.trim().toLowerCase() === n.toLowerCase())) : SKINCARE_SET;
      if (!names.length) return;
      let added = 0;
      for (const n of names) {
        try {
          await api("/api/categories", { method: "POST", body: { name: n } });
          added++;
        } catch { /* trùng tên / lỗi lẻ → bỏ qua, lần đăng nhập sau thử tiếp */ }
      }
      if (added > 0) {
        await refreshAll();
        toast("ok", `Đã thêm sẵn ${added} danh mục Skincare`, "Giờ thêm sản phẩm nhớ chọn danh mục — câu review sẽ tự gợi ý đúng chu trình dưỡng da.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, loading, refreshAll, recheckDb, toast]);

  /* ── mutations ── */

  const addProduct = useCallback(
    async (input: NewProductInput) => {
      try {
        const r = await api<{ review_saved?: boolean }>("/api/products", { method: "POST", body: input });
        await refreshAll();
        toast(
          "ok",
          "Đã lưu sản phẩm",
          r?.review_saved === false
            ? "Lưu ý: chưa lưu được câu mách — chạy database/OWNER-NOTE.sql (Supabase → SQL Editor) 1 lần rồi dán lại nhé."
            : "Món đồ đã nằm gọn trong list của bạn."
        );
        return { ok: true };
      } catch (e) {
        if (e instanceof ApiError && e.code === "DUPLICATE") {
          const dup = (e.data as { product?: Product })?.product;
          return { ok: false, duplicate: dup, message: e.message };
        }
        toast("err", "Không thể lưu sản phẩm", e instanceof ApiError ? e.message : "Vui lòng thử lại.");
        return { ok: false, message: e instanceof ApiError ? e.message : "Vui lòng thử lại." };
      }
    },
    [refreshAll, toast]
  );

  const patchProduct = useCallback(
    async (id: string, patch: { status?: ProductStatus; category_id?: string | null; owner_note?: string | null }) => {
      // optimistic update cho mượt
      const snapshot = products;
      setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      try {
        const r = await api<{ product: Product }>(`/api/products/${id}`, { method: "PATCH", body: patch });
        if (r.product) setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, ...r.product } : p)));
        return r.product ?? snapshot.find((p) => p.id === id) ?? null;
      } catch (e) {
        setProducts(snapshot);
        toast("err", "Không thể cập nhật", e instanceof ApiError ? e.message : "Vui lòng thử lại.");
        return null;
      }
    },
    [products, toast]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      try {
        await api(`/api/products/${id}`, { method: "DELETE" });
        setProducts((ps) => ps.filter((p) => p.id !== id));
        setDetailProduct((d) => (d?.id === id ? null : d));
        toast("ok", "Đã xóa sản phẩm", "Hành động này không thể hoàn tác.");
        return true;
      } catch (e) {
        toast("err", "Không thể xóa", e instanceof ApiError ? e.message : "Vui lòng thử lại.");
        return false;
      }
    },
    [toast]
  );

  const createCategory = useCallback(
    async (name: string) => {
      try {
        const r = await api<{ category: Category }>("/api/categories", { method: "POST", body: { name } });
        setCategories((c) => [...c, r.category]);
        toast("ok", "Đã thêm danh mục", `“${name}” đã sẵn sàng.`);
        return r.category;
      } catch (e) {
        toast("err", "Không thể tạo danh mục", e instanceof ApiError ? e.message : "Vui lòng thử lại.");
        return null;
      }
    },
    [toast]
  );

  const renameCategory = useCallback(
    async (id: string, name: string) => {
      try {
        const r = await api<{ category: Category }>(`/api/categories/${id}`, { method: "PATCH", body: { name } });
        setCategories((c) => c.map((x) => (x.id === id ? r.category : x)));
        setProducts((ps) => ps.map((p) => (p.category_id === id && p.category ? { ...p, category: { id, name } } : p)));
        toast("ok", "Đã cập nhật", `Danh mục đổi thành “${name}”.`);
        return true;
      } catch (e) {
        toast("err", "Không thể đổi tên", e instanceof ApiError ? e.message : "Vui lòng thử lại.");
        return false;
      }
    },
    [toast]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      try {
        await api(`/api/categories/${id}`, { method: "DELETE" });
        setCategories((c) => c.filter((x) => x.id !== id));
        await refreshAll();
        toast("ok", "Đã xóa danh mục", "Sản phẩm bên trong đã chuyển sang “Khác”.");
        return true;
      } catch (e) {
        toast("err", "Không thể xóa danh mục", e instanceof ApiError ? e.message : "Vui lòng thử lại.");
        return false;
      }
    },
    [refreshAll, toast]
  );

  const stats = useMemo(() => {
    const s = { total: products.length, PENDING: 0, PRIORITY: 0, FAVORITE: 0, PURCHASED: 0 } as AppCtx["stats"];
    for (const p of products) s[p.status] += 1;
    return s;
  }, [products]);

  const value = useMemo<AppCtx>(
    () => ({
      profile, products, categories, loading, error,
      query, setQuery,
      refreshAll, addProduct, patchProduct, deleteProduct,
      createCategory, renameCategory, deleteCategory,
      isAdmin, guestFavs, toggleGuestFav,
      addOpen, setAddOpen, bulkOpen, setBulkOpen, detailProduct, setDetailProduct,
      reviewProduct, setReviewProduct, stats,
      dbCheck, recheckDb,
    }),
    [
      profile, products, categories, loading, error,
      query,
      refreshAll, addProduct, patchProduct, deleteProduct,
      createCategory, renameCategory, deleteCategory,
      isAdmin, guestFavs,
      addOpen, bulkOpen, detailProduct, reviewProduct, stats,
      dbCheck, recheckDb,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
