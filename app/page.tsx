import Link from "next/link";
import { ArrowRight, BookmarkPlus, Heart, Link2, Sparkles, Tags, Zap } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { SiteMenu } from "@/components/layout/SiteMenu";
import { SITE } from "@/lib/config";

export const dynamic = "force-static";

/**
 * Landing công khai — "Aqua Pastel" theo mock: mist mint, bóng hồng Candy,
 * card trắng nổi trên nền sáng. © _hngnguynn_
 */
export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/95">
        <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-4 py-3.5 md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="text-[1.06rem] font-extrabold tracking-tight">
              List<span className="font-medium text-muted">cuaThaoVy</span>
            </span>
          </Link>
          <nav className="ml-3 hidden gap-5 text-sm font-medium text-muted sm:flex">
            <a href="#how" className="transition hover:text-teal">Cách hoạt động</a>
            <a href="#why" className="transition hover:text-teal">Vì sao</a>
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            <Link
              href="/login"
              className="hidden rounded-[12px] border border-line bg-surface px-4 py-2 text-sm font-semibold shadow-card transition hover:border-teal hover:text-teal-ink sm:inline-flex"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="btn-primary inline-flex items-center gap-1.5 rounded-[12px] px-4 py-2 text-sm shadow-cta transition"
            >
              Bắt đầu <ArrowRight className="h-4 w-4" />
            </Link>
            <SiteMenu
              links={[
                { href: "#how", label: "Cách hoạt động" },
                { href: "#why", label: "Vì sao" },
                { href: "/login", label: "Đăng nhập" },
                { href: "/register", label: "Tạo list miễn phí" },
              ]}
            />
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero-mint relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 right-[12%] h-[380px] w-[380px] rounded-full bg-aqua/20 blur-[80px]" />
        <div className="pointer-events-none absolute bottom-[-120px] left-[6%] h-[320px] w-[320px] rounded-full bg-teal/15 blur-[70px]" />
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-10 px-4 pb-20 pt-14 md:grid-cols-[1.05fr_.95fr] md:px-6 md:pt-16">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[.78rem] font-semibold text-teal-ink shadow-card dark:text-teal-200">
              <Sparkles className="h-3.5 w-3.5" /> Dán link là lưu · bấm là tới sàn
            </span>
            <h1 className="mt-4 text-[clamp(2.1rem,4.6vw,3.2rem)] font-extrabold leading-[1.14] tracking-[-.03em]">
              Lưu những
              <br />
              <span className="grad-text">điều bạn muốn mua.</span>
            </h1>
            <p className="mt-4 max-w-[52ch] text-[1.02rem] leading-relaxed text-muted">{SITE.tagline}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="btn-primary inline-flex items-center gap-2 rounded-[12px] px-6 py-3 text-base shadow-cta transition"
              >
                Tạo list miễn phí <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-[12px] border border-line bg-surface px-6 py-3 text-base font-semibold text-ink shadow-card transition hover:border-teal hover:text-teal-ink"
              >
                Đăng nhập
              </Link>
            </div>
            <p className="mt-3.5 text-[.8rem] font-medium text-muted">
              Shopee · TikTok Shop — miễn phí, không cần thẻ · <i className="hand not-italic text-teal-ink dark:text-teal-200">“{SITE.motto}”</i>
            </p>
          </div>

          {/* mockup app */}
          <div className="relative mx-auto w-[min(340px,84vw)]">
            <div className="animate-floaty rounded-[26px] border border-line bg-surface p-3.5 pb-4 shadow-pop">
              <div className="mx-auto mb-3 mt-1 h-[7px] w-[86px] rounded-full bg-line" />
              <div className="flex items-center gap-2 px-1 pb-2.5 text-[.8rem] font-bold">
                <Logo size={22} /> List của Thảo Vy <b className="ml-auto font-normal text-muted">···</b>
              </div>
              <div className="mb-2.5 flex items-center gap-1.5 rounded-full border border-line bg-bg px-3 py-2 text-[.72rem] text-muted shadow-card"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg> Dán link Shopee · TikTok Shop…</div>
              <div className="mb-3 flex flex-wrap gap-1.5 text-[.66rem] font-semibold">
                <span className="rounded-[8px] bg-teal px-2.5 py-1 text-white">Tất cả</span>
                <span className="rounded-[8px] border border-line px-2.5 py-1 text-muted">Dự định</span>
                <span className="rounded-[8px] border border-line px-2.5 py-1 text-muted">Ưu tiên</span>
                <span className="rounded-[8px] border border-line px-2.5 py-1 text-muted">Yêu thích</span>
              </div>
              {[
                { n: "Giày sneaker nữ basic", p: "399.000đ – 499.000đ", img: "/products/sneaker.svg", b: "Ưu tiên", cls: "bg-honey-soft text-amber-700" },
                { n: "Tai nghe Bluetooth TWS", p: "699.000đ", img: "/products/headphones.svg", b: "Yêu thích", cls: "bg-[#FCE7F3] text-[#E11D48]" },
                { n: "Túi xách da mềm quai ngắn", p: "259.000đ", img: "/products/bag.svg", b: "Đã mua", cls: "bg-mint-soft text-[#059669]" },
              ].map((c) => (
                <div key={c.n} className="mb-2 flex items-center gap-2.5 rounded-[14px] border border-line bg-surface p-2 shadow-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.img} alt="" className="h-11 w-11 flex-none rounded-[9px] object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-[.72rem] font-bold">{c.n}</p>
                    <p className="text-[.7rem] font-extrabold text-ink">{c.p}</p>
                  </div>
                  <span className={`ml-auto rounded-[8px] px-1.5 py-0.5 text-[.6rem] font-bold ${c.cls}`}>{c.b}</span>
                </div>
              ))}
              <div className="btn-primary absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-cta">
                <PlusGlyph />
              </div>
            </div>
            <div className="animate-floaty absolute -left-[6%] top-[6%] flex items-center gap-2 rounded-[13px] border border-line bg-surface px-3 py-2 text-[.76rem] font-semibold shadow-lift" style={{ animationDelay: ".8s" }}>
              <span className="mp-shopee rounded px-1.5 py-0.5 text-[.68rem] font-extrabold">S</span> Đã lưu!
            </div>
            <div className="animate-floaty absolute -right-[7%] bottom-[16%] flex items-center gap-2 rounded-[13px] border border-line bg-surface px-3 py-2 text-[.76rem] font-semibold shadow-lift" style={{ animationDelay: "1.5s" }}>
              <span className="mp-tiktok rounded px-1.5 py-0.5 text-[.68rem] font-extrabold">♪</span> Mua khi cần →
            </div>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="mx-auto max-w-[1120px] px-4 pb-6 pt-16 md:px-6">
        <h2 className="text-center text-[clamp(1.5rem,3vw,2.1rem)] font-extrabold tracking-tight">Hoạt động như thế nào?</h2>
        <p className="mt-2 text-center text-muted">Chỉ mất vài giây cho một món đồ bạn thích.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { n: "01", icon: Link2, t: "Copy link sản phẩm", d: "Từ Shopee, TikTok Shop hoặc các sàn TMĐT khác." },
            { n: "02", icon: BookmarkPlus, t: "Dán vào list của bạn", d: "Hệ thống tự động lấy ảnh, tên và giá sản phẩm." },
            { n: "03", icon: Heart, t: "Lưu lại và mua khi cần", d: "Phân loại theo danh mục, đánh dấu ưu tiên và bấm “Mua ngay” khi sẵn sàng." },
          ].map((s) => (
            <div key={s.n} className="rounded-card border border-line bg-surface p-6 shadow-card transition hover:-translate-y-[3px] hover:border-teal/50 hover:shadow-lift">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[13px] btn-primary text-sm font-extrabold shadow-cta">
                {s.n}
              </div>
              <h3 className="flex items-center gap-2 text-[1.02rem] font-extrabold">
                <s.icon className="h-[18px] w-[18px] text-teal" /> {s.t}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-[.72rem] font-extrabold text-teal-ink dark:text-teal-200">
          {["THẤY THÍCH", "COPY LINK", "DÁN", "LƯU", "BẤM — TỚI SÀN"].map((w, i) => (
            <span key={w} className="contents">
              <span className="rounded-[10px] border border-dashed border-teal/45 bg-surface px-3.5 py-1.5">{w}</span>
              {i < 4 ? <span className="text-muted">→</span> : null}
            </span>
          ))}
        </div>
      </section>

      {/* WHY */}
      <section id="why" className="mx-auto max-w-[1120px] px-4 py-16 md:px-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Zap, t: "Nhanh gọn", d: "Một URL là đủ — không form dài, không nhập tên, không tải ảnh." },
            { icon: ShieldMini, t: "Riêng tư tuyệt đối", d: "Danh sách chỉ mình bạn thấy — Row Level Security ở tầng database." },
            { icon: Tags, t: "Danh mục linh hoạt", d: "Tự nhóm theo thói quen; lọc nhanh bằng chip một chạm có đếm số." },
            { icon: Link2, t: "Mua lại đúng link", d: "“Mua ngay” mở đúng trang sản phẩm gốc trên sàn, không lòng vòng." },
          ].map((f) => (
            <div key={f.t} className="rounded-card border border-line bg-surface p-5 shadow-card transition hover:-translate-y-[3px] hover:border-teal/50 hover:shadow-lift">
              <span className="icon-box mb-3.5 flex">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="text-[.98rem] font-extrabold">{f.t}</h3>
              <p className="mt-1 text-[.85rem] leading-relaxed text-muted">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20 md:px-6">
        <div className="hero-mint mx-auto flex max-w-[1120px] flex-col items-center gap-4 rounded-[24px] border border-line/70 px-6 py-12 text-center">
          <Logo size={44} />
          <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            Món đồ bạn thích đang chờ được <span className="grad-text">lưu lại</span>
          </h2>
          <p className="hand max-w-[40ch] text-[1rem] text-[#0E7490] dark:text-teal-200">{SITE.motto}</p>
          <Link
            href="/register"
            className="btn-primary mt-1 inline-flex items-center gap-2 rounded-[12px] px-7 py-3 text-base shadow-cta transition"
          >
            Tạo list miễn phí <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-4 px-4 py-6 md:px-6">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Logo size={30} /> <b className="text-ink">List</b>cuaThaoVy — <i>{SITE.tagline}</i>
          </div>
          <div className="ml-auto flex flex-wrap gap-2 text-[.74rem] font-semibold text-muted">
            {["Next.js", "React", "TypeScript", "Tailwind CSS", "Supabase", "PostgreSQL", "Vercel"].map((x) => (
              <span key={x} className="rounded-[10px] border border-line px-2.5 py-1">{x}</span>
            ))}
          </div>
          <p className="w-full text-[.76rem] text-muted">
            © {new Date().getFullYear()} <b className="font-bold text-ink">_hngnguynn_</b> · ProjectThaoVy — không bán hàng, chỉ lưu điều bạn muốn mua.
          </p>
        </div>
      </footer>
    </div>
  );
}

function PlusGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ShieldMini({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 22s8-3.6 8-10V5l-8-3-8 3v7c0 6.4 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
