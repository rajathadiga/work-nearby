"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Home, Plus, Users, User, Wallet, TrendingUp, Volume2, VolumeX, Shield, Briefcase, X } from "lucide-react";
import { ReactNode } from "react";
import { useApp } from "@/lib/store";
import { LANGS } from "@/lib/i18n";

export default function Shell({ children }: { children: ReactNode }) {
  const { user, t, lang, setLang, unread, toasts, dismissToast, voiceOn, setVoiceOn, say } = useApp();
  const path = usePathname();
  const router = useRouter();
  const bare = path.startsWith("/track/");
  const role = user?.role;
  const isWorkerArea = path.startsWith("/worker");

  const nav =
    role === "admin"
      ? [
          { href: "/admin", icon: Shield, label: t("admin") },
          { href: "/notifications", icon: Bell, label: t("alerts"), badge: unread },
        ]
      : isWorkerArea || (role === "worker" && !path.startsWith("/customer"))
      ? [
          { href: "/worker", icon: Home, label: t("home") },
          { href: "/worker/earnings", icon: Wallet, label: t("earnings") },
          { href: "/worker/insights", icon: TrendingUp, label: t("demand") },
          { href: "/notifications", icon: Bell, label: t("alerts"), badge: unread },
          { href: "/worker/profile", icon: User, label: t("profile") },
        ]
      : [
          { href: "/customer", icon: Home, label: t("home") },
          { href: "/customer/workers", icon: Users, label: t("workers") },
          { href: "/customer/post", icon: Plus, label: t("post_job"), big: true },
          { href: "/notifications", icon: Bell, label: t("alerts"), badge: unread },
          { href: "/settings", icon: User, label: t("profile") },
        ];

  if (bare) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur border-b border-black/5">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center gap-2">
          <Link href={user ? (role === "admin" ? "/admin" : role === "worker" ? "/worker" : "/customer") : "/"} className="flex items-center gap-2 mr-auto">
            <span className="grid place-items-center h-10 w-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white text-xl shadow-md">🤝</span>
            <span className="leading-tight">
              <span className="block font-black text-xl tracking-tight">
                Kaam<span className="text-sun-500">Near</span>
              </span>
              <span className="hidden sm:block text-[11px] text-muted font-semibold -mt-0.5">{t("app_tagline")}</span>
            </span>
          </Link>
          <div className="flex rounded-full bg-white border border-black/10 p-0.5 text-sm font-bold">
            {LANGS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLang(l.id)}
                className={`px-2.5 py-1.5 rounded-full transition ${lang === l.id ? "bg-brand-600 text-white" : "text-muted hover:text-ink"}`}
                aria-label={l.label}
              >
                {l.id === "en" ? "EN" : l.id === "kn" ? "ಕ" : "हि"}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setVoiceOn(!voiceOn);
              if (!voiceOn) say(t("app_tagline"));
            }}
            className={`h-10 w-10 grid place-items-center rounded-full border ${voiceOn ? "bg-sun-500 text-white border-sun-500" : "bg-white border-black/10 text-muted"}`}
            title={t("read_aloud")}
            aria-label={t("read_aloud")}
          >
            {voiceOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          {user ? (
            <Link href="/notifications" className="relative h-10 w-10 grid place-items-center rounded-full bg-white border border-black/10" aria-label={t("alerts")}>
              <Bell size={20} />
              {unread > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs font-bold grid place-items-center">{unread > 9 ? "9+" : unread}</span>}
            </Link>
          ) : (
            <Link href="/login" className="btn-primary !py-2 !px-4 text-sm">
              {t("login")}
            </Link>
          )}
        </div>
        {user && role !== "admin" && (
          <div className="mx-auto max-w-5xl px-4 pb-2 -mt-1 flex gap-2 text-sm font-bold">
            <Link href="/customer" className={`chip ${!isWorkerArea ? "bg-brand-600 text-white" : "bg-white border border-black/10 text-muted"}`}>
              <Briefcase size={14} /> {t("need_worker")}
            </Link>
            <Link href="/worker" className={`chip ${isWorkerArea ? "bg-sun-500 text-white" : "bg-white border border-black/10 text-muted"}`}>
              👷 {t("need_work")}
            </Link>
          </div>
        )}
      </header>

      <main className={`flex-1 mx-auto w-full max-w-5xl px-4 py-4 ${user ? "pb-28" : "pb-10"}`}>{children}</main>

      {user && (
        <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-black/5 pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto max-w-lg flex items-end justify-around px-2 h-[72px]">
            {nav.map((n) => {
              const active = path === n.href || (n.href !== "/customer" && n.href !== "/worker" && path.startsWith(n.href));
              const Icon = n.icon;
              if ((n as any).big)
                return (
                  <Link key={n.href} href={n.href} className="-mt-6 flex flex-col items-center gap-1" aria-label={n.label}>
                    <span className="h-16 w-16 rounded-full bg-gradient-to-br from-sun-400 to-sun-600 text-white grid place-items-center shadow-xl shadow-sun-500/40 border-4 border-white">
                      <Icon size={30} strokeWidth={3} />
                    </span>
                    <span className="text-[11px] font-extrabold text-sun-600">{n.label}</span>
                  </Link>
                );
              return (
                <Link key={n.href} href={n.href} className={`relative flex flex-col items-center gap-0.5 pb-2 w-16 ${active ? "text-brand-700" : "text-muted"}`}>
                  <span className={`h-9 w-12 grid place-items-center rounded-2xl ${active ? "bg-brand-100" : ""}`}>
                    <Icon size={22} strokeWidth={active ? 2.6 : 2} />
                  </span>
                  <span className="text-[11px] font-bold truncate max-w-full">{n.label}</span>
                  {!!(n as any).badge && <span className="absolute top-0 right-2 h-4 min-w-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold grid place-items-center">{(n as any).badge}</span>}
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      <div className="fixed top-20 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((x) => (
            <motion.div
              key={x.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="pointer-events-auto w-full max-w-md card p-4 flex gap-3 items-start border-l-4 border-l-sun-500"
              onClick={() => {
                if (x.link) router.push(x.link);
                dismissToast(x.id);
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="font-extrabold">{x.title}</div>
                {x.body && <div className="text-sm text-muted">{x.body}</div>}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissToast(x.id);
                }}
                className="text-muted"
                aria-label="close"
              >
                <X size={18} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
