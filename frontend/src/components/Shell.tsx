"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell, Plus, UsersRound, UserRound, Wallet, TrendingUp, Volume2, VolumeX, ShieldCheck, X, LayoutDashboard, MessageCircle, Building2, Crown, Settings,
  Route, IdCard, LogOut, Handshake, Sun, Moon, CircleCheck, CircleAlert, Info, BriefcaseBusiness, HardHat,
} from "lucide-react";
import { ReactNode } from "react";
import { useApp } from "@/lib/store";
import { LANGS } from "@/lib/i18n";
import { Avatar } from "./ui";

type NavItem = { href: string; icon: any; label: string; badge?: number; primary?: boolean };

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="kn-logo-mark grid place-items-center h-8 w-8 rounded-[10px] bg-[#f2f2f5] text-[#0b0b0e] shadow-[0_0_18px_-2px_rgba(249,122,46,.55)]">
        <Handshake size={18} strokeWidth={2.4} />
      </span>
      <span className={`font-display font-bold text-[19px] tracking-tight ${light ? "text-white" : "text-ink"}`}>kaamnear</span>
    </span>
  );
}

function LangSwitch() {
  const { lang, setLang } = useApp();
  return (
    <div className="flex rounded-full bg-surface-2 border border-line p-0.5 text-sm font-semibold">
      {LANGS.map((l) => (
        <button
          key={l.id}
          onClick={() => setLang(l.id)}
          className={`px-2.5 py-1 rounded-full transition ${lang === l.id ? "bg-surface-3 text-ink" : "text-muted hover:text-ink"}`}
          aria-label={l.label}
          title={l.label}
        >
          {l.id === "en" ? "EN" : l.id === "kn" ? "ಕ" : "हि"}
        </button>
      ))}
    </div>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const { user, loading, t, unread, toasts, dismissToast, voiceOn, setVoiceOn, say, logout, theme, setTheme } = useApp();
  const path = usePathname();
  const router = useRouter();
  if (path.startsWith("/track/")) return <>{children}</>;

  const role = user?.role;
  const workerArea = path.startsWith("/worker") || (role === "worker" && !path.startsWith("/customer") && path !== "/settings");

  const nav: NavItem[] =
    role === "admin"
      ? [
          { href: "/admin", icon: ShieldCheck, label: t("admin") },
          { href: "/notifications", icon: Bell, label: t("alerts"), badge: unread },
        ]
      : workerArea
      ? [
          { href: "/worker", icon: LayoutDashboard, label: t("home") },
          { href: "/worker/earnings", icon: Wallet, label: t("earnings") },
          { href: "/worker/insights", icon: TrendingUp, label: t("demand") },
          { href: "/notifications", icon: Bell, label: t("alerts"), badge: unread },
          { href: "/worker/profile", icon: UserRound, label: t("profile") },
          { href: "/worker/route", icon: Route, label: t("route_jobs") },
          { href: "/worker/groups", icon: UsersRound, label: t("groups") },
          ...(user ? [{ href: `/workers/${user.id}`, icon: IdCard, label: t("passport") }] : []),
          { href: "/plans", icon: Crown, label: t("plans") },
        ]
      : [
          { href: "/customer", icon: LayoutDashboard, label: t("home") },
          { href: "/customer/workers", icon: UsersRound, label: t("workers") },
          { href: "/customer/post", icon: Plus, label: t("post_job"), primary: true },
          { href: "/notifications", icon: Bell, label: t("alerts"), badge: unread },
          { href: "/settings", icon: Settings, label: t("settings") },
          { href: "/whatsapp", icon: MessageCircle, label: t("whatsapp") },
          { href: "/business", icon: Building2, label: t("business") },
          { href: "/plans", icon: Crown, label: t("plans") },
        ];
  const mobileNav = nav.slice(0, 5);
  const isActive = (href: string) => path === href || (!["/customer", "/worker", "/admin"].includes(href) && path.startsWith(href));
  const home = user ? (role === "admin" ? "/admin" : role === "worker" ? "/worker" : "/customer") : "/";

  const voiceBtn = (
    <button
      onClick={() => {
        setVoiceOn(!voiceOn);
        if (!voiceOn) say(t("app_tagline"));
      }}
      className={`h-9 w-9 grid place-items-center rounded-full border transition ${voiceOn ? "bg-brand-600 text-white border-brand-600" : "bg-surface-2 border-line text-muted hover:text-ink"}`}
      title={t("read_aloud")}
      aria-label={t("read_aloud")}
    >
      {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
  );

  const themeBtn = path !== "/" && (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-9 w-9 grid place-items-center rounded-full border bg-surface-2 border-line text-muted hover:text-ink transition"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );

  const modeSwitch = user && role !== "admin" && (
    <div className="grid grid-cols-2 rounded-lg bg-surface-3 p-0.5 text-sm font-semibold">
      <Link href="/customer" className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 px-2 ${!workerArea ? "bg-surface-3 shadow-sm text-brand-300" : "text-muted"}`}>
        <BriefcaseBusiness size={15} /> Hire
      </Link>
      <Link href="/worker" className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 px-2 ${workerArea ? "bg-surface-3 shadow-sm text-brand-300" : "text-muted"}`}>
        <HardHat size={15} /> Work
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-paper text-ink" data-theme={path === "/" ? "dark" : undefined}>
      {/* desktop sidebar */}
      {user && (
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-line bg-surface fixed inset-y-0 left-0 z-40">
          <div className="h-16 flex items-center px-5 border-b border-line">
            <Link href={home}>
              <Logo />
            </Link>
          </div>
          <div className="p-4">{modeSwitch}</div>
          <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
            {nav.map((n) => {
              const Icon = n.icon;
              const active = isActive(n.href);
              return n.primary ? (
                <Link key={n.href} href={n.href} className="btn-primary w-full !justify-start my-2">
                  <Icon size={18} /> {n.label}
                </Link>
              ) : (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] font-medium transition ${active ? "bg-brand-500/10 text-brand-300" : "text-slate-300 hover:bg-surface-2 hover:text-ink"}`}
                >
                  <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                  <span className="flex-1 truncate">{n.label}</span>
                  {!!n.badge && <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-600 text-white text-xs font-semibold grid place-items-center">{n.badge}</span>}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-line flex items-center gap-3">
            <Avatar name={user.name} size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{user.name}</div>
              <div className="text-xs text-muted truncate">+91 {user.phone}</div>
            </div>
            <button
              onClick={() => {
                logout();
                window.location.href = "/";
              }}
              className="h-8 w-8 grid place-items-center rounded-lg text-muted hover:bg-surface-3 hover:text-ink"
              title={t("logout")}
              aria-label={t("logout")}
            >
              <LogOut size={16} />
            </button>
          </div>
        </aside>
      )}

      <div className={`flex-1 min-w-0 flex flex-col ${user ? "lg:pl-64" : ""}`}>
        <header className={`sticky top-0 z-30 backdrop-blur-xl ${user ? "bg-paper/75 border-b border-line" : "bg-paper/90 border-b border-white/[.05]"}`}>
          <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center gap-3">
            <Link href={home} className={user ? "lg:hidden" : ""}>
              <Logo />
            </Link>
            {!user && !loading && (
              <nav className="hidden md:flex items-center gap-7 ml-12 text-[15px] font-medium text-ink/85">
                <Link href="/#features" className="hover:text-white">Features</Link>
                <Link href="/whatsapp" className="hover:text-white">{t("whatsapp")}</Link>
                <Link href="/business" className="hover:text-white">{t("business")}</Link>
                <Link href="/plans" className="hover:text-white">Pricing</Link>
              </nav>
            )}
            <div className="flex-1" />
            <LangSwitch />
            {themeBtn}
            {voiceBtn}
            {user ? (
              <Link href="/notifications" className="relative h-9 w-9 grid place-items-center rounded-full bg-surface-2 border border-line text-muted hover:text-ink" aria-label={t("alerts")}>
                <Bell size={18} />
                {unread > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white text-[11px] font-semibold grid place-items-center">{unread > 9 ? "9+" : unread}</span>}
              </Link>
            ) : loading ? null : (
              <>
                <Link href="/login" className="btn-outline hidden sm:inline-flex">
                  Sign in
                </Link>
                <Link href="/login?role=customer" className="btn-outline">
                  Get started
                </Link>
              </>
            )}
          </div>
          {user && role !== "admin" && <div className="lg:hidden px-4 pb-3 max-w-xs">{modeSwitch}</div>}
        </header>

        <main className={path === "/" ? "flex-1 w-full" : `flex-1 w-full px-4 sm:px-6 lg:px-8 py-5 lg:py-7 ${user ? "pb-28 lg:pb-10" : "pb-12"}`}>{children}</main>
      </div>

      {/* mobile bottom nav */}
      {user && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-line pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-stretch justify-around px-1 h-16">
            {mobileNav.map((n) => {
              const Icon = n.icon;
              const active = isActive(n.href);
              if (n.primary)
                return (
                  <Link key={n.href} href={n.href} className="flex flex-col items-center justify-center gap-0.5 flex-1" aria-label={n.label}>
                    <span className="h-10 w-10 rounded-xl bg-brand-600 text-white grid place-items-center shadow-md">
                      <Icon size={22} strokeWidth={2.4} />
                    </span>
                    <span className="text-[10.5px] font-semibold text-brand-300 truncate max-w-full px-1">{n.label}</span>
                  </Link>
                );
              return (
                <Link key={n.href} href={n.href} className={`relative flex flex-col items-center justify-center gap-1 flex-1 ${active ? "text-brand-300" : "text-muted"}`}>
                  <Icon size={21} strokeWidth={active ? 2.3 : 1.8} />
                  <span className="text-[10.5px] font-semibold truncate max-w-full px-1">{n.label}</span>
                  {!!n.badge && <span className="absolute top-1.5 right-[calc(50%-18px)] h-4 min-w-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-semibold grid place-items-center">{n.badge}</span>}
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* toasts */}
      <div className="fixed top-20 right-0 left-0 sm:left-auto sm:right-6 z-50 flex flex-col items-center sm:items-end gap-2 px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((x) => {
            const Icon = x.kind === "error" ? CircleAlert : x.kind === "success" ? CircleCheck : Info;
            const tone = x.kind === "error" ? "text-rose-400" : x.kind === "success" ? "text-brand-400" : "text-sky-400";
            return (
              <motion.div
                key={x.id}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="pointer-events-auto w-full max-w-sm card shadow-lg p-3.5 flex gap-3 items-start cursor-pointer"
                onClick={() => {
                  if (x.link) router.push(x.link);
                  dismissToast(x.id);
                }}
              >
                <Icon size={20} className={`${tone} shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[15px]">{x.title}</div>
                  {x.body && <div className="text-sm text-muted">{x.body}</div>}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissToast(x.id);
                  }}
                  className="text-muted hover:text-ink"
                  aria-label="close"
                >
                  <X size={16} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
