"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, ShieldCheck, Mic, MapPin, MessageCircle, Building2, BriefcaseBusiness, HardHat, Brain, Bike, Star, Siren, IndianRupee, Smartphone, Banknote, Lock,
  Check, Search, Bell, LayoutDashboard, UsersRound, Wallet, Settings, Zap, Languages, Volume2, ChevronRight, Sparkles, Clock,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { CatBadge } from "@/lib/icons";
import { ScoreRing, Avatar } from "@/components/ui";
import MapView from "@/components/MapView";
import { Logo } from "@/components/Shell";

const fade = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" }, transition: { duration: 0.6 } };

function BentoCard({ title, body, className = "", glow = "orange", children }: { title: string; body: string; className?: string; glow?: "orange" | "blue" | "red"; children: React.ReactNode }) {
  const g =
    glow === "blue"
      ? "radial-gradient(70% 60% at 50% 0%, rgba(113,126,242,.45), transparent 70%)"
      : glow === "red"
      ? "radial-gradient(70% 60% at 50% 0%, rgba(244,63,94,.40), transparent 70%)"
      : "radial-gradient(70% 60% at 50% 0%, rgba(249,122,46,.45), transparent 70%)";
  return (
    <motion.div {...fade} className={`relative overflow-hidden rounded-[20px] bg-[#0b0b0e] text-white flex flex-col min-h-[340px] ${className}`}>
      <div className="absolute inset-0 dot-grid opacity-60 [mask-image:radial-gradient(80%_60%_at_50%_0%,#000,transparent)]" />
      <div className="absolute inset-0" style={{ background: g }} />
      <div className="relative flex-1 grid place-items-center p-6">{children}</div>
      <div className="relative p-6 pt-0 text-[15px] leading-relaxed text-white/60">
        <span className="text-white font-semibold">{title}.</span> {body}
      </div>
    </motion.div>
  );
}

export default function Landing() {
  const { t, meta, catName, user, login, toast } = useApp();
  const router = useRouter();
  const [heat, setHeat] = useState<any>(null);

  useEffect(() => {
    api("/insights/heatmap").then(setHeat).catch(() => {});
  }, []);

  async function demo(persona: string) {
    try {
      const r = await api(`/demo/login/${persona}`, { body: {} });
      login(r.token, r.user);
      router.push(persona === "admin" ? "/admin" : persona === "worker" ? "/worker" : "/customer");
    } catch (e: any) {
      toast("Server not reachable", e.message, "error");
    }
  }

  const go = (role: string) => router.push(user ? (role === "worker" ? "/worker" : "/customer/post") : `/login?role=${role}`);
  const openJobs = heat?.jobs.filter((j: any) => j.open) || [];
  const freeWorkers = heat?.workers.filter((w: any) => w.available) || [];

  return (
    <div className="overflow-x-hidden">
      {/* ─────────────── HERO ─────────────── */}
      <section className="relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 right-[-10%] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,rgba(249,122,46,.28),transparent_65%)] blur-2xl" />
          <div className="absolute top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(113,126,242,.20),transparent_65%)] blur-2xl" />
          <div className="absolute inset-0 dot-grid opacity-40 [mask-image:radial-gradient(60%_50%_at_30%_30%,#000,transparent)]" />
        </div>
        <div className="relative mx-auto max-w-[1280px] px-5 sm:px-8 pt-16 sm:pt-24 pb-16">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.03] px-3.5 py-1.5 text-sm text-white/75">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,.7)]" />
            {freeWorkers.length || 27} workers available now in Udupi & Manipal
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="mt-7 font-display font-bold text-gradient leading-[0.95] tracking-[-0.04em] text-[clamp(46px,8vw,112px)] max-w-5xl"
          >
            Local work,
            <br />
            done today.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }} className="mt-7 max-w-xl text-lg sm:text-xl text-white/65 leading-relaxed">
            KaamNear connects people who need a hand with trusted workers nearby — gardening, repairs, farm work, cleaning, moving. Speak in ಕನ್ನಡ, हिन्दी or English.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }} className="mt-10 flex flex-wrap items-center gap-4">
            <button onClick={() => go("customer")} className="btn-glow">
              Find a worker <ArrowRight size={17} />
            </button>
            <button onClick={() => go("worker")} className="btn-outline !py-3.5 !px-7 !text-sm">
              <HardHat size={16} /> I need work
            </button>
          </motion.div>
        </div>

        {/* app preview */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3 }} className="relative mx-auto max-w-[1280px] px-5 sm:px-8 pb-24">
          <div className="frame-glow overflow-hidden">
            <div className="grid grid-cols-[56px_minmax(0,1fr)] lg:grid-cols-[56px_220px_minmax(0,1fr)_minmax(0,1fr)] min-h-[520px]">
              {/* rail */}
              <div className="border-r border-white/[.06] flex flex-col items-center gap-4 py-4 text-white/40">
                <span className="h-8 w-8 rounded-[10px] bg-[#f2f2f5] text-[#0b0b0e] grid place-items-center shadow-[0_0_18px_-2px_rgba(249,122,46,.6)]">
                  <BriefcaseBusiness size={16} />
                </span>
                {[LayoutDashboard, UsersRound, Bell, Wallet, Settings].map((I, i) => (
                  <I key={i} size={18} className={i === 0 ? "text-white" : ""} />
                ))}
              </div>
              {/* nav */}
              <div className="hidden lg:block border-r border-white/[.06] p-4 text-sm">
                <div className="font-semibold text-white mb-3">My jobs</div>
                <div className="flex items-center gap-2 rounded-lg bg-white/[.04] border border-white/[.06] px-2.5 py-1.5 text-white/40 mb-4">
                  <Search size={14} /> Search…
                </div>
                {[
                  ["Garden cleaning", "Finding", true],
                  ["Coconut harvesting", "On the way", false],
                  ["Bathroom cleaning", "Pay now", false],
                  ["Fan repair", "Done", false],
                ].map(([n, s, a]: any) => (
                  <div key={n} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${a ? "bg-white/[.06] text-white" : "text-white/55"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s === "Finding" ? "bg-amber-400" : s === "On the way" ? "bg-sun-500" : s === "Pay now" ? "bg-brand-500" : "bg-emerald-400"}`} />
                    <span className="flex-1 truncate">{n}</span>
                    <span className="text-[11px] text-white/35">{s}</span>
                  </div>
                ))}
              </div>
              {/* matches */}
              <div className="p-5 border-r border-white/[.06] min-w-0">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] uppercase tracking-wider text-white/40">Kadiyali · Today · Morning</div>
                    <div className="text-lg font-semibold text-white truncate">Garden cleaning + 3 coconut trees</div>
                  </div>
                  <div className="text-lg font-semibold text-white">₹900</div>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 text-brand-300 text-xs px-2.5 py-1">
                  <Sparkles size={12} /> 8 workers matched · 5 alerted
                </div>
                <div className="mt-5 space-y-2.5">
                  {[
                    ["Ramesh Kumar", 96, "Expert coconut climber · 1.3 km", true],
                    ["Sathish Mendon", 87, "Garden cleaning · 3.4 km", true],
                    ["Yogesh Kunder", 83, "Coconut harvesting · 6.9 km", false],
                  ].map(([n, sc, sub, av]: any) => (
                    <div key={n} className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3">
                      <Avatar name={n} size={38} online={av} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">{n}</div>
                        <div className="text-xs text-white/45 truncate">{sub}</div>
                      </div>
                      <ScoreRing score={sc} size={40} />
                      <span className="hidden sm:inline-flex rounded-full bg-brand-600 text-white text-xs font-semibold px-3 py-1.5">Hire</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* map */}
              <div className="hidden lg:flex flex-col p-4 gap-3">
                <div className="flex-1 min-h-[300px]">
                  <MapView
                    center={[13.345, 74.765]}
                    zoom={12}
                    height="100%"
                    markers={[
                      ...freeWorkers.slice(0, 40).map((w: any) => ({ lat: w.lat, lng: w.lng, kind: "dot" as const, color: "#10b981", size: 9 })),
                      ...openJobs.map((j: any) => ({ lat: j.lat, lng: j.lng, kind: "job" as const, size: 24, popup: j.title })),
                    ]}
                  />
                </div>
                <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-3 flex items-center gap-3">
                  <span className="h-9 w-9 rounded-full bg-amber-400/15 text-amber-300 grid place-items-center">
                    <Bike size={17} />
                  </span>
                  <div className="flex-1 text-sm">
                    <div className="text-white font-medium">Ramesh is on the way</div>
                    <div className="text-white/45 text-xs">Arriving in 8 min · 2.6 km</div>
                  </div>
                  <span className="text-xs text-emerald-300 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─────────────── LIGHT BENTO ─────────────── */}
      <section id="features" className="bg-[#f1f1f3] text-[#0b0b0e]">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 py-24 sm:py-32">
          <motion.h2 {...fade} className="font-display font-bold tracking-[-0.045em] leading-[0.95] text-[clamp(40px,6.4vw,92px)]">
            Everything local
            <br />
            work needs.
          </motion.h2>
          <motion.p {...fade} className="mt-6 max-w-2xl text-lg text-[#45454d]">
            From the first spoken request to the final payment and review — one simple flow that works for a homeowner in Manipal and a farm worker in Brahmavar alike.
          </motion.p>

          <div className="mt-14 grid md:grid-cols-3 gap-4">
            <BentoCard title="Speak your work" body="Say it in Kannada, Hindi or English. AI turns it into a clear job with skills, time and a checklist.">
              <div className="w-full max-w-xs">
                <div className="mx-auto h-20 w-20 rounded-full bg-brand-600 grid place-items-center shadow-[0_0_0_10px_rgba(249,122,46,.12),0_0_60px_10px_rgba(249,122,46,.45)]">
                  <Mic size={32} />
                </div>
                <div className="mt-6 flex items-end justify-center gap-1 h-10">
                  {[10, 22, 34, 18, 40, 26, 14, 30, 38, 20, 12, 28, 16].map((h, i) => (
                    <span key={i} className="w-1.5 rounded-full bg-white/70" style={{ height: h }} />
                  ))}
                </div>
                <div className="mt-4 text-center text-sm text-white/70">“ನಾಳೆ ಬೆಳಗ್ಗೆ ತೋಟ ಸ್ವಚ್ಛ ಮಾಡೋಕೆ ಒಬ್ಬರು ಬೇಕು”</div>
              </div>
            </BentoCard>

            <BentoCard className="md:col-span-2" glow="blue" title="AI matching" body="Skill, distance, availability, rating, price and reliability — plus a learned model of who’s likely to accept — pick the right people to alert.">
              <div className="w-full max-w-2xl grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/[.04] border border-white/10 p-4 backdrop-blur">
                  {[
                    ["Skill", 96],
                    ["Distance", 91],
                    ["Available", 100],
                    ["Rating", 98],
                    ["Reliability", 94],
                  ].map(([k, v]: any) => (
                    <div key={k} className="flex items-center gap-3 text-sm py-1.5">
                      <span className="w-20 text-white/60">{k}</span>
                      <span className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <span className="block h-full rounded-full bg-gradient-to-r from-sun-500 to-brand-400" style={{ width: `${v}%` }} />
                      </span>
                      <span className="w-8 text-right text-white/80">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl bg-[#f2f2f5] text-[#0b0b0e] p-4 shadow-2xl">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#6b6b75]">Best match</div>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="h-11 w-11 rounded-full bg-[#1f1f25] text-white grid place-items-center font-semibold">RK</div>
                    <div className="flex-1">
                      <div className="font-semibold">Ramesh Kumar</div>
                      <div className="text-xs text-[#6b6b75] flex items-center gap-1">
                        <Star size={12} className="fill-amber-400 text-amber-400" /> 4.9 · 31 jobs · Trusted
                      </div>
                    </div>
                    <div className="text-2xl font-bold">96</div>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-[#3d3d45]">
                    {["Expert coconut climber (verified)", "1.3 km away · available now", "Rate fits your budget"].map((x) => (
                      <div key={x} className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-600" /> {x}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </BentoCard>

            <BentoCard className="md:col-span-2" title="Live tracking" body="Follow your worker on the map with a live ETA, check-in on arrival and before/after photos when the work is done.">
              <svg viewBox="0 0 560 200" className="w-full max-w-2xl">
                <defs>
                  <linearGradient id="rt" x1="0" x2="1">
                    <stop offset="0" stopColor="#8c98ff" />
                    <stop offset="1" stopColor="#ff914d" />
                  </linearGradient>
                </defs>
                <path d="M40 160 C 140 150, 160 60, 260 80 S 420 150, 520 40" stroke="url(#rt)" strokeWidth="3" fill="none" strokeDasharray="8 8" />
                <circle cx="40" cy="160" r="9" fill="#10b981" stroke="#0b0b0e" strokeWidth="3" />
                <circle cx="300" cy="96" r="16" fill="#f5a524" stroke="#0b0b0e" strokeWidth="3" />
                <circle cx="520" cy="40" r="14" fill="#717ef2" stroke="#0b0b0e" strokeWidth="3" />
                <rect x="318" y="112" width="170" height="44" rx="12" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.12)" />
                <text x="334" y="131" fill="#fff" fontSize="13" fontWeight="600">
                  On the way · 8 min
                </text>
                <text x="334" y="148" fill="rgba(255,255,255,.5)" fontSize="11">
                  2.6 km · Eshwar Nagar
                </text>
              </svg>
            </BentoCard>

            <BentoCard glow="red" title="Safety built in" body="ID-verified workers, two-way ratings, one-tap SOS and a live trip link for family.">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-rose-600 grid place-items-center shadow-[0_0_0_12px_rgba(244,63,94,.12),0_0_70px_12px_rgba(244,63,94,.45)]">
                  <Siren size={36} />
                </div>
                <div className="absolute -right-24 top-2 rounded-full bg-white/[.06] border border-white/10 px-3 py-1.5 text-xs flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-300" /> ID verified
                </div>
              </div>
            </BentoCard>

            <BentoCard glow="blue" title="Fair prices" body="Suggested local rates with clear reasons — urgency, weekends and live demand.">
              <div className="rounded-2xl bg-white/[.04] border border-white/10 p-5 w-full max-w-xs">
                <div className="text-xs text-white/50 flex items-center gap-1.5">
                  <Sparkles size={12} /> Usual price here
                </div>
                <div className="text-3xl font-bold mt-1">₹600 – ₹900</div>
                <div className="mt-3 space-y-1.5 text-sm text-white/60">
                  <div className="flex items-center gap-2"><Check size={14} className="text-emerald-300" /> Typical local rate ₹700</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-emerald-300" /> High demand nearby +12%</div>
                </div>
              </div>
            </BentoCard>

            <BentoCard title="Pay your way" body="Cash, UPI or secure online payment held until you confirm the work is done.">
              <div className="flex flex-col gap-2.5 w-full max-w-[240px]">
                {[
                  [Smartphone, "UPI", "Instant"],
                  [Lock, "Secure hold", "Released on completion"],
                  [Banknote, "Cash", "Pay the worker directly"],
                ].map(([I, a, b]: any, i) => (
                  <div key={a} className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${i === 1 ? "bg-white text-[#0b0b0e] border-white" : "bg-white/[.04] border-white/10"}`}>
                    <I size={17} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{a}</div>
                      <div className={`text-[11px] ${i === 1 ? "text-[#6b6b75]" : "text-white/45"}`}>{b}</div>
                    </div>
                  </div>
                ))}
              </div>
            </BentoCard>

            <BentoCard glow="blue" title="Grows with every job" body="Ratings, verified skills and a digital work passport help workers earn more over time.">
              <div className="flex items-end gap-2 h-32">
                {[30, 42, 38, 56, 64, 60, 82, 96].map((h, i) => (
                  <span key={i} className="w-6 rounded-t-md bg-gradient-to-t from-sun-600/40 to-brand-400" style={{ height: `${h}%` }} />
                ))}
              </div>
            </BentoCard>
          </div>
        </div>
      </section>

      {/* ─────────────── LANGUAGES / STATS ─────────────── */}
      <section className="relative">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(50%_40%_at_50%_0%,rgba(113,126,242,.18),transparent_70%)]" />
        <div className="relative mx-auto max-w-[1280px] px-5 sm:px-8 py-24 sm:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-end">
            <motion.h2 {...fade} className="font-display font-bold text-gradient tracking-[-0.045em] leading-[0.95] text-[clamp(40px,6vw,84px)]">
              ಕೆಲಸ. काम.
              <br />
              Work.
            </motion.h2>
            <motion.p {...fade} className="text-lg text-white/60 max-w-lg">
              Built for people who’d rather talk than type. Every screen speaks in your language, every card can be read aloud, and big simple buttons guide each step.
            </motion.p>
          </div>
          <div className="mt-14 grid sm:grid-cols-3 gap-4">
            {[
              [Languages, "3 languages", "Kannada, Hindi and English — including mixed Kanglish."],
              [Volume2, "Read aloud", "Tap the speaker on any screen to hear it."],
              [MessageCircle, "WhatsApp ready", "Post or find work by simply sending a message."],
            ].map(([I, a, b]: any) => (
              <motion.div key={a} {...fade} className="card p-6">
                <I size={22} className="text-brand-400" />
                <div className="mt-4 font-semibold text-lg">{a}</div>
                <div className="text-white/55 mt-1">{b}</div>
              </motion.div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              [freeWorkers.length || 27, "Workers online now"],
              [openJobs.length || 18, "Open jobs nearby"],
              ["< 5 min", "Typical time to first match"],
              ["100%", "Agreed pay goes to the worker"],
            ].map(([v, l]: any) => (
              <motion.div key={l} {...fade} className="card p-6">
                <div className="font-display text-4xl font-bold text-gradient">{v}</div>
                <div className="text-white/50 mt-1 text-sm">{l}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── CATEGORIES ─────────────── */}
      <section className="mx-auto max-w-[1280px] px-5 sm:px-8 pb-24">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">What do you need done?</h2>
          <button onClick={() => go("customer")} className="hidden sm:inline-flex btn-outline">
            Post a job <ChevronRight size={15} />
          </button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
          {meta?.categories
            .filter((c) => c.id !== "other")
            .map((c) => (
              <Link key={c.id} href={user ? `/customer/post?cat=${c.id}` : `/login?role=customer`} className="tile py-6 group">
                <CatBadge cat={c.id} size={46} />
                <span className="text-sm text-white/80 group-hover:text-white">{catName(c)}</span>
              </Link>
            ))}
        </div>
      </section>

      {/* ─────────────── HOW IT WORKS ─────────────── */}
      <section className="mx-auto max-w-[1280px] px-5 sm:px-8 pb-24">
        <div className="grid md:grid-cols-4 gap-px bg-line rounded-2xl overflow-hidden border border-line">
          {[
            [Mic, "step1"],
            [Brain, "step2"],
            [Bike, "step3"],
            [Star, "step4"],
          ].map(([I, k]: any, i) => (
            <div key={k} className="bg-paper p-7">
              <div className="flex items-center justify-between">
                <I size={22} className="text-brand-400" />
                <span className="font-display text-5xl font-bold text-white/[.07]">0{i + 1}</span>
              </div>
              <div className="mt-6 font-semibold text-lg">{t(k)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────── CTA ─────────────── */}
      <section className="mx-auto max-w-[1280px] px-5 sm:px-8 pb-20">
        <div className="relative overflow-hidden rounded-[28px] glow-panel px-6 sm:px-12 py-16 sm:py-20">
          <div className="absolute inset-0 dot-grid opacity-40 [mask-image:radial-gradient(70%_70%_at_20%_0%,#000,transparent)]" />
          <div className="relative grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
            <div>
              <h2 className="font-display font-bold text-gradient tracking-[-0.04em] leading-[0.95] text-[clamp(36px,5vw,68px)]">Get it done today.</h2>
              <p className="mt-5 text-lg text-white/60 max-w-lg">Post your first job in 30 seconds, or switch on “available” and start earning nearby.</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <button onClick={() => go("customer")} className="btn-glow">
                  Find a worker <ArrowRight size={17} />
                </button>
                <button onClick={() => go("worker")} className="btn-outline !py-3.5 !px-7">
                  Find work
                </button>
              </div>
            </div>
            <div className="rounded-2xl bg-black/30 border border-white/10 p-5 backdrop-blur">
              <div className="text-xs uppercase tracking-wider text-white/45 flex items-center gap-1.5">
                <Zap size={12} /> {t("try_demo")} — no OTP
              </div>
              <div className="mt-3 space-y-2">
                {[
                  ["customer", BriefcaseBusiness, "Priya", "Customer in Manipal"],
                  ["worker", HardHat, "Ramesh", "Coconut & garden worker"],
                  ["admin", ShieldCheck, "Admin", "Operations dashboard"],
                ].map(([p, I, n, s]: any) => (
                  <button key={p} onClick={() => demo(p)} className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-left hover:bg-white/[.07] hover:border-white/20 transition">
                    <I size={18} className="text-brand-300" />
                    <span className="flex-1">
                      <span className="block font-semibold text-white">{n}</span>
                      <span className="block text-xs text-white/45">{s}</span>
                    </span>
                    <ArrowRight size={16} className="text-white/40" />
                  </button>
                ))}
              </div>
              <div className="mt-3 text-xs text-white/40 flex items-center gap-1.5">
                <Clock size={12} /> Phone login OTP for the demo is 1234
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 py-10 grid sm:grid-cols-[1.5fr_1fr_1fr_1fr] gap-8 text-sm">
          <div>
            <Logo />
            <p className="mt-3 text-white/45 max-w-xs">Work nearby. Earn daily. Starting in Udupi, Manipal, Malpe and Brahmavar.</p>
          </div>
          {[
            ["Product", [["Find a worker", "/login?role=customer"], ["Find work", "/login?role=worker"], ["Pricing", "/plans"]]],
            ["Channels", [["WhatsApp bot", "/whatsapp"], ["For business", "/business"]]],
            ["Areas", [["Udupi", "#"], ["Manipal", "#"], ["Malpe", "#"], ["Brahmavar", "#"]]],
          ].map(([h, links]: any) => (
            <div key={h}>
              <div className="font-semibold text-white/85 mb-3">{h}</div>
              <div className="space-y-2">
                {links.map(([l, href]: any) => (
                  <Link key={l} href={href} className="block text-white/45 hover:text-white">
                    {l}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-line">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-8 py-5 text-xs text-white/35 flex flex-wrap gap-4 justify-between">
            <span>© {new Date().getFullYear()} KaamNear</span>
            <span className="flex items-center gap-1.5">
              <MapPin size={12} /> Made for coastal Karnataka
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
