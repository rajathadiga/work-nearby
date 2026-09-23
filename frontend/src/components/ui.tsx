"use client";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Mic, Square, Volume2, Star, X, Loader2, ShieldCheck, BadgeCheck, Smartphone, Inbox, Wrench, MapPin, CircleCheck, GraduationCap, IndianRupee,
  ThumbsUp, Clock, Sunrise, Sun, Sunset, CalendarDays, Hourglass, Timer,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { useVoiceInput } from "@/lib/speech";

export function useRequireUser(role?: "worker" | "customer" | "admin") {
  const { user, loading } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}${role === "worker" ? "&role=worker" : ""}`);
    else if (role === "admin" && user.role !== "admin") router.replace("/");
  }, [user, loading, role, router]);
  return user;
}

export function Avatar({ name, size = 48, online }: { name: string; size?: number; online?: boolean }) {
  const initials = (name || "?")
    .replace(/^(Dr\.|Mr\.|Mrs\.)\s*/, "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const hue = [...(name || "x")].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <span className="grid place-items-center rounded-full font-semibold w-full h-full" style={{ background: `linear-gradient(145deg, hsl(${hue} 32% 24%), hsl(${hue} 30% 14%))`, color: `hsl(${hue} 70% 82%)`, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)", fontSize: size * 0.36 }}>
        {initials}
      </span>
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 rounded-full border-2 border-paper ${online ? "bg-emerald-500" : "bg-[#34343c]"}`} style={{ width: size * 0.28, height: size * 0.28 }} />
      )}
    </span>
  );
}

export function Stars({ value, count, size = 15 }: { value: number; count?: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-semibold text-ink">
      <Star size={size} className="fill-amber-400 text-amber-400" />
      {value ? value.toFixed(1) : "New"}
      {count !== undefined && count > 0 && <span className="text-muted font-normal text-sm">({count})</span>}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const words = ["Poor", "Not good", "Okay", "Good", "Excellent"];
  return (
    <div className="text-center">
      <div className="flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} onClick={() => onChange(i)} className="p-1.5 rounded-lg hover:bg-surface-2" aria-label={`${i} stars`}>
            <Star size={36} className={value >= i ? "fill-amber-400 text-amber-400" : "text-[#3a3a44]"} />
          </button>
        ))}
      </div>
      <div className="text-sm font-semibold text-muted mt-1">{words[value - 1]}</div>
    </div>
  );
}

export function LevelBadge({ level }: { level: string }) {
  if (level === "trusted")
    return (
      <span className="chip !text-xs bg-brand-600 text-white">
        <ShieldCheck size={13} /> Trusted
      </span>
    );
  if (level === "verified")
    return (
      <span className="chip !text-xs bg-sky-500/10 text-sky-300 ring-1 ring-inset ring-sky-500/25">
        <BadgeCheck size={13} /> ID verified
      </span>
    );
  return (
    <span className="chip !text-xs bg-surface-3 text-slate-300">
      <Smartphone size={13} /> Phone verified
    </span>
  );
}

export function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#fb7185";
  return (
    <span className="relative inline-grid place-items-center shrink-0" style={{ width: size, height: size }} title="Match score">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#26262d" strokeWidth="4" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="4" fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(score, 100) / 100)} strokeLinecap="round" />
      </svg>
      <span className="absolute text-[13px] font-bold" style={{ color }}>
        {Math.round(score)}
      </span>
    </span>
  );
}

const PARTS: Record<string, [LucideIcon, string, string]> = {
  skill: [Wrench, "Skill", "35%"],
  distance: [MapPin, "Distance", "20%"],
  availability: [CircleCheck, "Available", "15%"],
  experience: [GraduationCap, "Experience", "10%"],
  rating: [Star, "Rating", "10%"],
  price: [IndianRupee, "Price fit", "5%"],
  reliability: [ThumbsUp, "Reliability", "5%"],
};

export function Breakdown({ parts }: { parts: Record<string, number> }) {
  if (!parts || !Object.keys(parts).length) return null;
  return (
    <div className="grid grid-cols-1 gap-2">
      {Object.entries(PARTS).map(([k, [Icon, label, w]]) =>
        parts[k] === undefined ? null : (
          <div key={k} className="flex items-center gap-2 text-sm">
            <Icon size={15} className="text-muted shrink-0" />
            <span className="w-24 shrink-0 font-medium">{label}</span>
            <span className="flex-1 h-2 rounded-full bg-surface-3 overflow-hidden">
              <motion.span initial={{ width: 0 }} animate={{ width: `${parts[k]}%` }} className="block h-full rounded-full bg-brand-500" />
            </span>
            <span className="w-8 text-right font-semibold">{parts[k]}</span>
            <span className="w-9 text-right text-xs text-muted">{w}</span>
          </div>
        )
      )}
    </div>
  );
}

export function SpeakButton({ text, className = "" }: { text: string; className?: string }) {
  const { say, t } = useApp();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        say(text);
      }}
      className={`h-9 w-9 shrink-0 grid place-items-center rounded-lg border border-line bg-surface text-muted hover:text-brand-300 hover:border-brand-500/40 ${className}`}
      aria-label={t("read_aloud")}
      title={t("read_aloud")}
    >
      <Volume2 size={17} />
    </button>
  );
}

export function PageTitle({ title, sub, speakText, right, icon: Icon }: { title: string; sub?: string; speakText?: string; right?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {Icon && (
        <span className="h-11 w-11 rounded-xl bg-brand-500/10 text-brand-300 grid place-items-center ring-1 ring-inset ring-brand-500/20">
          <Icon size={22} />
        </span>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold leading-tight tracking-tight">{title}</h1>
        {sub && <p className="text-muted text-sm sm:text-base">{sub}</p>}
      </div>
      {right}
      <SpeakButton text={speakText || `${title}. ${sub || ""}`} />
    </div>
  );
}

export function VoiceBox({ value, onChange, onFinal, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; onFinal?: (v: string) => void; placeholder?: string; rows?: number }) {
  const { lang, t } = useApp();
  const v = useVoiceInput(lang, (txt) => {
    const nv = value ? `${value} ${txt}` : txt;
    onChange(nv);
    onFinal?.(nv);
  });
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={v.listening ? v.stop : v.start}
        className={`w-full flex items-center gap-4 rounded-xl p-3.5 text-left transition border ${v.listening ? "bg-rose-500/10 border-rose-500/30" : "bg-brand-500/10 border-brand-500/25 hover:border-brand-500/40"}`}
      >
        <span className={`h-12 w-12 rounded-full grid place-items-center text-white shrink-0 ${v.listening ? "bg-rose-500 pulse-dot text-rose-400" : "bg-brand-600"}`}>
          {v.listening ? <Square size={18} className="text-white fill-white" /> : <Mic size={22} />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold">{v.listening ? t("listening") : t("speak_work")}</span>
          <span className="block text-sm text-muted truncate">{v.interim || (v.supported ? "ಕನ್ನಡ · हिन्दी · English" : "Voice input needs Chrome or Edge")}</span>
        </span>
      </button>
      <textarea className="input" rows={rows} value={value} placeholder={placeholder || t("or_type")} onChange={(e) => onChange(e.target.value)} onBlur={() => onFinal?.(value)} />
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; wide?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className={`bg-surface w-full ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"} rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto shadow-xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center mb-4">
              <h3 className="text-lg font-semibold flex-1">{title}</h3>
              <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-surface-3" aria-label="close">
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted gap-3">
      <Loader2 className="animate-spin text-brand-400" size={30} />
      {label && <span className="font-medium">{label}</span>}
    </div>
  );
}

export function Empty({ icon: Icon = Inbox, text, action }: { icon?: LucideIcon; text: string; action?: ReactNode }) {
  return (
    <div className="card p-10 text-center text-muted flex flex-col items-center gap-3">
      <span className="h-12 w-12 rounded-full bg-surface-3 grid place-items-center">
        <Icon size={22} />
      </span>
      <div className="font-medium">{text}</div>
      {action}
    </div>
  );
}

export function Stat({ label, value, sub, icon: Icon, tone = "text-ink" }: { label: string; value: ReactNode; sub?: ReactNode; icon?: LucideIcon; tone?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted">
        {Icon && <Icon size={16} />}
        {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${tone}`}>{value}</div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

export const money = (n: number) => "₹" + (n || 0).toLocaleString("en-IN");

const JOB_TONE: Record<string, string> = {
  open: "bg-amber-500/10 text-amber-300 ring-amber-500/25",
  assigned: "bg-sky-500/10 text-sky-300 ring-sky-500/25",
  in_progress: "bg-violet-500/10 text-violet-300 ring-violet-500/25",
  completed: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25",
  cancelled: "bg-surface-3 text-slate-300 ring-white/10",
};

export function JobStatusPill({ status }: { status: string }) {
  const { t } = useApp();
  return (
    <span className={`chip !text-xs ring-1 ring-inset ${JOB_TONE[status] || "bg-surface-3"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {t("status_" + status)}
    </span>
  );
}

const BOOK_TONE: Record<string, string> = {
  confirmed: "bg-sky-500/10 text-sky-300 ring-sky-500/25",
  on_the_way: "bg-amber-500/10 text-amber-300 ring-amber-500/25",
  arrived: "bg-violet-500/10 text-violet-300 ring-violet-500/25",
  completed: "bg-orange-500/10 text-orange-300 ring-orange-500/25",
  paid: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25",
  cancelled: "bg-surface-3 text-slate-300 ring-white/10",
  no_show: "bg-rose-500/10 text-rose-300 ring-rose-500/25",
};

export function BookingStatusPill({ status }: { status: string }) {
  const { t } = useApp();
  return (
    <span className={`chip !text-xs ring-1 ring-inset ${BOOK_TONE[status] || "bg-surface-3"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {t("b_" + status)}
    </span>
  );
}

export function timeAgo(iso: string) {
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z").getTime();
  const s = Math.max(1, Math.round((Date.now() - d) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export function prettyDate(d: string, t: (k: string) => string) {
  if (!d) return "";
  const today = new Date();
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const tm = new Date(today);
  tm.setDate(today.getDate() + 1);
  if (d === iso(today)) return t("today");
  if (d === iso(tm)) return t("tomorrow");
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export const SLOT_ICONS: Record<string, LucideIcon> = { morning: Sunrise, afternoon: Sun, evening: Sunset, flexible: Clock, asap: Timer };

export const DURATIONS: { id: string; en: string; icon: LucideIcon }[] = [
  { id: "1h", en: "1 hour", icon: Timer },
  { id: "2h", en: "2 hours", icon: Timer },
  { id: "3h", en: "3 hours", icon: Timer },
  { id: "half_day", en: "Half day", icon: Hourglass },
  { id: "full_day", en: "Full day", icon: Sun },
  { id: "multi_day", en: "Few days", icon: CalendarDays },
];
export const durLabel = (id: string) => DURATIONS.find((d) => d.id === id)?.en || id;

/** strip any emoji the backend may still send (old data) */
export const clean = (s: string) => (s || "").replace(/[\p{Extended_Pictographic}️‍]/gu, "").replace(/\s{2,}/g, " ").trim();
