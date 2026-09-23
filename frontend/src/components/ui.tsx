"use client";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, MicOff, Volume2, Star, X, Loader2, ShieldCheck, BadgeCheck } from "lucide-react";
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
      <span
        className="grid place-items-center rounded-full text-white font-black w-full h-full"
        style={{ background: `linear-gradient(135deg, hsl(${hue} 60% 50%), hsl(${(hue + 40) % 360} 60% 38%))`, fontSize: size * 0.38 }}
      >
        {initials}
      </span>
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 rounded-full border-2 border-white ${online ? "bg-green-500" : "bg-gray-300"}`} style={{ width: size * 0.28, height: size * 0.28 }} />
      )}
    </span>
  );
}

export function Stars({ value, count, size = 16 }: { value: number; count?: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-bold">
      <Star size={size} className="fill-amber-400 text-amber-400" />
      {value ? value.toFixed(1) : "New"}
      {count !== undefined && count > 0 && <span className="text-muted font-semibold text-sm">({count})</span>}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const faces = ["😞", "😕", "😐", "🙂", "😍"];
  return (
    <div className="flex justify-center gap-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} onClick={() => onChange(i)} className={`flex flex-col items-center p-2 rounded-2xl transition ${value >= i ? "scale-110" : "opacity-50"}`}>
          <Star size={36} className={value >= i ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
          <span className="text-xl">{value === i ? faces[i - 1] : ""}</span>
        </button>
      ))}
    </div>
  );
}

export function LevelBadge({ level }: { level: string }) {
  if (level === "trusted")
    return (
      <span className="chip bg-brand-600 text-white !text-xs">
        <ShieldCheck size={14} /> Trusted
      </span>
    );
  if (level === "verified")
    return (
      <span className="chip bg-sky-100 text-sky-700 !text-xs">
        <BadgeCheck size={14} /> ID Verified
      </span>
    );
  return <span className="chip bg-gray-100 text-gray-600 !text-xs">📱 Phone verified</span>;
}

export function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? "#059669" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <span className="relative inline-grid place-items-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#eee" strokeWidth="5" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="5" fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(score, 100) / 100)} strokeLinecap="round" />
      </svg>
      <span className="absolute text-sm font-black" style={{ color }}>
        {Math.round(score)}
      </span>
    </span>
  );
}

export function Breakdown({ parts }: { parts: Record<string, number> }) {
  const labels: Record<string, [string, string]> = {
    skill: ["🛠️ Skill", "35%"],
    distance: ["📍 Distance", "20%"],
    availability: ["🟢 Available", "15%"],
    experience: ["🎓 Experience", "10%"],
    rating: ["⭐ Rating", "10%"],
    price: ["💰 Price fit", "5%"],
    reliability: ["✅ Reliability", "5%"],
  };
  if (!parts || !Object.keys(parts).length) return null;
  return (
    <div className="grid grid-cols-1 gap-1.5">
      {Object.entries(labels).map(([k, [label, w]]) =>
        parts[k] === undefined ? null : (
          <div key={k} className="flex items-center gap-2 text-sm">
            <span className="w-28 shrink-0 font-semibold">{label}</span>
            <span className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <motion.span initial={{ width: 0 }} animate={{ width: `${parts[k]}%` }} className="block h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600" />
            </span>
            <span className="w-9 text-right font-bold">{parts[k]}</span>
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
      className={`h-10 w-10 shrink-0 grid place-items-center rounded-full bg-sun-100 text-sun-600 hover:bg-sun-200 ${className}`}
      aria-label={t("read_aloud")}
      title={t("read_aloud")}
    >
      <Volume2 size={20} />
    </button>
  );
}

export function PageTitle({ title, sub, speakText, right }: { title: string; sub?: string; speakText?: string; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl sm:text-3xl font-black leading-tight">{title}</h1>
        {sub && <p className="text-muted font-semibold">{sub}</p>}
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
        className={`w-full flex items-center gap-4 rounded-3xl p-4 text-left transition border-2 ${
          v.listening ? "bg-red-50 border-red-400" : "bg-gradient-to-r from-sun-50 to-brand-50 border-transparent hover:border-sun-400"
        }`}
      >
        <span className={`h-16 w-16 rounded-full grid place-items-center text-white shrink-0 ${v.listening ? "bg-red-500 pulse-dot text-red-500" : "bg-sun-500"}`}>
          {v.listening ? <MicOff size={30} className="text-white" /> : <Mic size={30} />}
        </span>
        <span className="flex-1">
          <span className="block font-black text-lg">{v.listening ? t("listening") : t("speak_work")}</span>
          <span className="block text-sm text-muted font-semibold">
            {v.interim || (v.supported ? "ಕನ್ನಡ • हिन्दी • English" : "Voice needs Chrome / Edge browser")}
          </span>
        </span>
      </button>
      <textarea className="input !text-base" rows={rows} value={value} placeholder={placeholder || t("or_type")} onChange={(e) => onChange(e.target.value)} onBlur={() => onFinal?.(value)} />
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            initial={{ y: 60 }}
            animate={{ y: 0 }}
            exit={{ y: 60 }}
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center mb-3">
              <h3 className="text-xl font-black flex-1">{title}</h3>
              <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-full bg-gray-100" aria-label="close">
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
    <div className="flex flex-col items-center justify-center py-16 text-muted gap-3">
      <Loader2 className="animate-spin text-brand-600" size={36} />
      {label && <span className="font-bold">{label}</span>}
    </div>
  );
}

export function Empty({ icon = "🌱", text }: { icon?: string; text: string }) {
  return (
    <div className="card p-8 text-center text-muted">
      <div className="text-5xl mb-2">{icon}</div>
      <div className="font-bold">{text}</div>
    </div>
  );
}

export const money = (n: number) => "₹" + (n || 0).toLocaleString("en-IN");

export function JobStatusPill({ status }: { status: string }) {
  const { t } = useApp();
  const map: Record<string, string> = {
    open: "bg-amber-100 text-amber-800",
    assigned: "bg-sky-100 text-sky-800",
    in_progress: "bg-violet-100 text-violet-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-600",
  };
  const dot: Record<string, string> = { open: "🟡", assigned: "🔵", in_progress: "🟣", completed: "🟢", cancelled: "⚪" };
  return (
    <span className={`chip !text-xs ${map[status] || "bg-gray-100"}`}>
      {dot[status]} {t("status_" + status)}
    </span>
  );
}

export function BookingStatusPill({ status }: { status: string }) {
  const { t } = useApp();
  const map: Record<string, string> = {
    confirmed: "bg-sky-100 text-sky-800",
    on_the_way: "bg-amber-100 text-amber-800",
    arrived: "bg-violet-100 text-violet-800",
    completed: "bg-orange-100 text-orange-800",
    paid: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-600",
    no_show: "bg-red-100 text-red-700",
  };
  return <span className={`chip !text-xs ${map[status] || "bg-gray-100"}`}>{t("b_" + status)}</span>;
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

export const DURATIONS: { id: string; en: string; icon: string }[] = [
  { id: "1h", en: "1 hour", icon: "⏱️" },
  { id: "2h", en: "2 hours", icon: "⏱️" },
  { id: "3h", en: "3 hours", icon: "⏱️" },
  { id: "half_day", en: "Half day", icon: "🌤️" },
  { id: "full_day", en: "Full day", icon: "☀️" },
  { id: "multi_day", en: "Few days", icon: "📅" },
];
export const durLabel = (id: string) => DURATIONS.find((d) => d.id === id)?.en || id;
