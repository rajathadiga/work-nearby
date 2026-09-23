"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles, Minus, Plus, LocateFixed, Zap, Repeat, ShieldCheck, X, Heart, Sun, Sunrise, CalendarDays, CalendarClock, Banknote, Smartphone, Users, Hourglass,
  MapPin, Clock, IndianRupee, Wallet, Check, ChevronLeft, ChevronRight, Send, TreePalm, TriangleAlert,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { CatBadge, SkillBadge, skillIconFor } from "@/lib/icons";
import { useRequireUser, VoiceBox, SpeakButton, Loading, DURATIONS, SLOT_ICONS, money, prettyDate, durLabel, Modal } from "@/components/ui";
import MapView from "@/components/MapView";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Stepper({ value, onChange, min = 0, max = 50 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-2">
      <button className="h-10 w-10 rounded-lg border border-line bg-white grid place-items-center hover:bg-slate-50" onClick={() => onChange(Math.max(min, value - 1))} aria-label="decrease">
        <Minus size={18} />
      </button>
      <span className="text-xl font-semibold w-10 text-center">{value}</span>
      <button className="h-10 w-10 rounded-lg bg-brand-600 text-white grid place-items-center hover:bg-brand-700" onClick={() => onChange(Math.min(max, value + 1))} aria-label="increase">
        <Plus size={18} />
      </button>
    </div>
  );
}

export default function PostJob() {
  const user = useRequireUser();
  const { t, meta, catName, skillName, toast, lang, say } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [ai, setAi] = useState<any>(null);
  const [category, setCategory] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [tasks, setTasks] = useState<string[]>([]);
  const [loc, setLoc] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [whenMode, setWhenMode] = useState<"asap" | "today" | "tomorrow" | "date">("today");
  const [date, setDate] = useState(iso(new Date()));
  const [slot, setSlot] = useState("morning");
  const [duration, setDuration] = useState("half_day");
  const [workers, setWorkers] = useState(1);
  const [quantity, setQuantity] = useState(0);
  const [recurring, setRecurring] = useState(false);
  const [budget, setBudget] = useState(0);
  const [price, setPrice] = useState<any>(null);
  const [payMethod, setPayMethod] = useState("cash");
  const [preferred, setPreferred] = useState(0);
  const [preferredName, setPreferredName] = useState("");
  const [posting, setPosting] = useState(false);
  const [skillPicker, setSkillPicker] = useState(false);
  const lastParsed = useRef("");

  useEffect(() => {
    if (!user) return;
    setLoc({ lat: user.lat, lng: user.lng, address: user.area });
    const q = new URLSearchParams(window.location.search);
    if (q.get("cat")) setCategory(q.get("cat")!);
    if (q.get("text")) {
      setText(q.get("text")!);
      parse(q.get("text")!);
    }
    if (q.get("rebook")) {
      const wid = Number(q.get("rebook"));
      setPreferred(wid);
      api(`/workers/${wid}`).then((w) => setPreferredName(w.name)).catch(() => {});
      if (q.get("from"))
        api(`/jobs/${q.get("from")}`).then((j) => {
          setSkills(j.skills);
          setCategory(j.category);
          setTitle(j.title);
          setTasks(j.tasks);
          setDuration(j.duration);
          setBudget(j.budget);
          setText(j.description || j.title);
          setQuantity(j.quantity);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function parse(v: string) {
    if (!v.trim() || v.trim() === lastParsed.current) return;
    lastParsed.current = v.trim();
    setParsing(true);
    try {
      const p = await api("/ai/parse", { body: { text: v, lat: user?.lat, lng: user?.lng } });
      setAi(p);
      if (p.skills.length) {
        setSkills(p.skills);
        setCategory(p.category);
      }
      setTitle(p.title);
      setTasks(p.tasks);
      setWorkers(p.workers_required || 1);
      setQuantity(p.quantity || 0);
      setDuration(p.duration);
      if (p.urgent) setWhenMode("asap");
      else if (p.date) {
        const today = iso(new Date());
        const tm = new Date();
        tm.setDate(tm.getDate() + 1);
        setWhenMode(p.date === today ? "today" : p.date === iso(tm) ? "tomorrow" : "date");
        setDate(p.date);
      }
      if (p.time_slot && p.time_slot !== "asap") setSlot(p.time_slot);
      if (p.recurring?.freq) setRecurring(true);
      if (p.budget) setBudget(p.budget);
      if (p.place && meta) {
        const pl = meta.places.find((x) => x.name === p.place);
        if (pl) setLoc({ lat: pl.lat, lng: pl.lng, address: pl.name });
      }
      if (p.warnings?.length) toast("Please check your request", p.warnings.join(", "), "error");
    } catch {
    } finally {
      setParsing(false);
    }
  }

  useEffect(() => {
    if (!loc || !skills.length) return;
    const d = whenMode === "asap" || whenMode === "today" ? iso(new Date()) : whenMode === "tomorrow" ? iso(new Date(Date.now() + 864e5)) : date;
    api("/ai/price", { body: { skills, duration, quantity, workers_required: workers, lat: loc.lat, lng: loc.lng, date: d, urgent: whenMode === "asap" } })
      .then((p) => {
        setPrice(p);
        setBudget((b) => (b ? b : p.suggested));
      })
      .catch(() => {});
  }, [skills, duration, quantity, workers, loc, whenMode, date]);

  useEffect(() => {
    if (skills.length && !ai)
      api("/ai/describe", { body: { skills, quantity, workers_required: workers } }).then((d) => {
        if (!title) setTitle(d.title);
        setTasks(d.tasks);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills]);

  if (!user || !meta) return <Loading />;

  const finalDate = whenMode === "asap" || whenMode === "today" ? iso(new Date()) : whenMode === "tomorrow" ? iso(new Date(Date.now() + 864e5)) : date;
  const weekday = DAYS[(new Date(finalDate + "T00:00:00").getDay() + 6) % 7];
  const steps = [t("describe"), t("where"), t("when"), t("budget"), t("review_post")];
  const canNext = [skills.length > 0 || text.trim().length > 3, !!loc, true, budget > 0, true][step];
  const hasTrees = skills.some((s) => meta.skills.find((x) => x.id === s)?.unit === "tree");

  async function post() {
    setPosting(true);
    try {
      const r = await api("/jobs", {
        body: {
          title, description: text, category: category || "other", skills, tasks, lat: loc!.lat, lng: loc!.lng, address: loc!.address, date: finalDate,
          time_slot: whenMode === "asap" ? "asap" : slot, urgent: whenMode === "asap", budget, duration, quantity, workers_required: workers,
          payment_method: payMethod, escrow: payMethod === "online", recurring: recurring ? { freq: "weekly", day: weekday } : {},
          source: ai ? "voice" : "web", preferred_worker_id: preferred,
        },
      });
      toast("Job posted", `${r.matches} workers matched and alerted`, "success");
      say("Job posted. We are finding workers.");
      router.replace(`/customer/jobs/${r.job.id}?new=1`);
    } catch (e: any) {
      toast("Could not post the job", e.message, "error");
    } finally {
      setPosting(false);
    }
  }

  async function next() {
    if (step === 0 && !skills.length) await parse(text);
    setStep((s) => Math.min(4, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const catSkills = meta.skills.filter((s) => !category || s.cat === category);
  const heading = (txt: string, speak?: string) => (
    <div className="flex items-center gap-3 mb-1">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex-1">{txt}</h1>
      <SpeakButton text={speak || txt} />
    </div>
  );

  const summaryRows: [any, string, string][] = [
    [MapPin, t("where"), loc?.address || "—"],
    [CalendarDays, t("when"), `${prettyDate(finalDate, t)} · ${whenMode === "asap" ? t("asap") : t(slot)}`],
    [Hourglass, t("how_long"), durLabel(duration)],
    [Users, t("how_many"), String(workers)],
    [Wallet, t("budget"), budget ? `${money(budget)}${workers > 1 ? " × " + workers : ""}` : "—"],
  ];

  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
      <div className="min-w-0">
        {/* progress */}
        <div className="card p-3 mb-5">
          <div className="grid grid-cols-5 gap-2">
            {steps.map((s, i) => (
              <button key={s} onClick={() => i < step && setStep(i)} className="text-left">
                <div className={`h-1.5 rounded-full ${i <= step ? "bg-brand-600" : "bg-slate-200"}`} />
                <div className={`text-xs mt-1.5 font-medium truncate ${i === step ? "text-brand-700" : "text-muted"}`}>
                  <span className="hidden sm:inline">{i + 1}. </span>
                  {s}
                </div>
              </button>
            ))}
          </div>
        </div>
        {preferred > 0 && (
          <div className="card p-3 mb-4 bg-sun-50 border-sun-200 flex items-center gap-2 text-sm font-medium">
            <Heart size={16} className="text-sun-600" /> Booking again: {preferredName || "your saved worker"} will be invited first
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="card p-5 sm:p-6 space-y-5">
            {step === 0 && (
              <>
                {heading(t("describe"), `${t("describe")}. ${t("speak_work")}`)}
                <VoiceBox value={text} onChange={setText} onFinal={parse} placeholder="Example: Need someone to clean my garden and pluck coconuts from 3 trees tomorrow morning" />
                {parsing && (
                  <div className="rounded-lg border border-brand-100 bg-brand-50/60 p-3 flex items-center gap-2 text-brand-700 text-sm font-medium">
                    <Sparkles size={16} className="animate-pulse" /> Understanding your request…
                  </div>
                )}
                {ai && !parsing && (
                  <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
                    <div className="flex items-center gap-2 mb-2 text-sm">
                      <Sparkles className="text-brand-600" size={16} />
                      <span className="font-semibold text-brand-800 flex-1">Understood by AI ({ai.engine === "claude" ? "Claude" : "smart rules"})</span>
                      <span className="text-xs text-muted">{Math.round(ai.confidence * 100)}% confidence</span>
                    </div>
                    <div className="font-semibold text-lg">{title}</div>
                    <div className="flex flex-wrap gap-2 mt-2 text-sm">
                      <span className="chip bg-white border border-line"><Users size={13} /> {workers}</span>
                      <span className="chip bg-white border border-line"><Hourglass size={13} /> {durLabel(duration)}</span>
                      {ai.date && <span className="chip bg-white border border-line"><CalendarDays size={13} /> {prettyDate(ai.date, t)}</span>}
                      {ai.time_slot !== "flexible" && <span className="chip bg-white border border-line"><Clock size={13} /> {t(ai.time_slot)}</span>}
                      {quantity > 0 && <span className="chip bg-white border border-line"><TreePalm size={13} /> {quantity}</span>}
                      {ai.urgent && <span className="chip bg-rose-600 text-white"><Zap size={13} /> {t("urgent")}</span>}
                      {ai.recurring?.freq && <span className="chip bg-violet-50 text-violet-700"><Repeat size={13} /> {ai.recurring.day || "daily"}</span>}
                      {ai.place && <span className="chip bg-white border border-line"><MapPin size={13} /> {ai.place}</span>}
                    </div>
                  </div>
                )}
                <div>
                  <div className="label">{t("choose_type")}</div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                    {meta.categories.map((c) => (
                      <button key={c.id} onClick={() => setCategory(c.id === category ? "" : c.id)} className={`tile py-3 ${category === c.id ? "tile-on" : ""}`}>
                        <CatBadge cat={c.id} size={38} />
                        <span className="text-xs leading-tight">{catName(c)}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="label">Skills needed</div>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => {
                      const I = skillIconFor(s);
                      return (
                        <button key={s} onClick={() => setSkills(skills.filter((x) => x !== s))} className="chip bg-brand-600 text-white hover:bg-brand-700">
                          <I size={14} /> {skillName(s)} <X size={14} />
                        </button>
                      );
                    })}
                    <button onClick={() => setSkillPicker(true)} className="chip bg-white border border-dashed border-brand-400 text-brand-700 hover:bg-brand-50">
                      <Plus size={14} /> {t("add_skill")}
                    </button>
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                {heading(t("where"))}
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn-primary"
                    onClick={() =>
                      navigator.geolocation?.getCurrentPosition(
                        (p) => {
                          const { latitude: lat, longitude: lng } = p.coords;
                          if (Math.abs(lat - 13.34) > 0.6 || Math.abs(lng - 74.74) > 0.6) {
                            toast("You seem outside our service area", "Using your saved location in the Udupi region for this demo");
                            return;
                          }
                          setLoc({ lat, lng, address: "My location" });
                        },
                        () => toast("Location permission denied", "Tap on the map or choose a place", "error")
                      )
                    }
                  >
                    <LocateFixed size={18} /> {t("use_my_location")}
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {meta.places.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => setLoc({ lat: p.lat, lng: p.lng, address: p.name })}
                      className={`chip shrink-0 border ${loc?.address === p.name ? "bg-brand-600 text-white border-brand-600" : "bg-white border-line hover:border-brand-300"}`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                <div className="text-sm text-muted">{t("tap_map")}</div>
                {loc && (
                  <MapView
                    center={[loc.lat, loc.lng]}
                    zoom={14}
                    height={380}
                    markers={[{ lat: loc.lat, lng: loc.lng, kind: "home", size: 36 }]}
                    onPick={(lat, lng) => setLoc({ lat, lng, address: loc.address === "My location" || meta.places.some((p) => p.name === loc.address) ? `Near ${loc.address}` : loc.address })}
                  />
                )}
                <div>
                  <div className="label">Address / landmark (optional)</div>
                  <input className="input" value={loc?.address || ""} onChange={(e) => loc && setLoc({ ...loc, address: e.target.value })} />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                {heading(t("when"))}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(
                    [
                      ["asap", Zap, t("asap")],
                      ["today", Sun, t("today")],
                      ["tomorrow", Sunrise, t("tomorrow")],
                      ["date", CalendarClock, t("pick_date")],
                    ] as const
                  ).map(([id, Icon, label]) => (
                    <button key={id} onClick={() => setWhenMode(id)} className={`tile py-4 ${whenMode === id ? (id === "asap" ? "!border-rose-500 !bg-rose-50 ring-2 ring-rose-500" : "tile-on") : ""}`}>
                      <Icon size={24} className={id === "asap" ? "text-rose-600" : "text-brand-600"} />
                      <span className="text-sm">{label}</span>
                    </button>
                  ))}
                </div>
                {whenMode === "asap" && (
                  <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800 flex gap-2 items-center">
                    <Zap size={16} /> Only workers who are available right now and nearby get the urgent alert.
                  </div>
                )}
                {whenMode === "date" && <input type="date" className="input max-w-xs" value={date} min={iso(new Date())} onChange={(e) => setDate(e.target.value)} />}
                {whenMode !== "asap" && (
                  <div>
                    <div className="label">Preferred time</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {["morning", "afternoon", "evening", "flexible"].map((id) => {
                        const Icon = SLOT_ICONS[id];
                        return (
                          <button key={id} onClick={() => setSlot(id)} className={`tile py-3 !flex-row ${slot === id ? "tile-on" : ""}`}>
                            <Icon size={18} className="text-brand-600" />
                            <span className="text-sm">{t(id)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <div className="label">{t("how_long")}</div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                    {DURATIONS.map((d) => (
                      <button key={d.id} onClick={() => setDuration(d.id)} className={`tile py-3 ${duration === d.id ? "tile-on" : ""}`}>
                        <d.icon size={18} className="text-brand-600" />
                        <span className="text-sm">{d.en}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-line p-4 flex items-center gap-3">
                    <Users size={22} className="text-brand-600" />
                    <span className="flex-1 font-medium">{t("how_many")}</span>
                    <Stepper value={workers} onChange={setWorkers} min={1} />
                  </div>
                  {hasTrees && (
                    <div className="rounded-xl border border-line p-4 flex items-center gap-3">
                      <TreePalm size={22} className="text-brand-600" />
                      <span className="flex-1 font-medium">How many trees?</span>
                      <Stepper value={quantity} onChange={setQuantity} max={500} />
                    </div>
                  )}
                </div>
                <button onClick={() => setRecurring(!recurring)} className={`w-full rounded-xl border p-4 flex items-center gap-3 text-left transition ${recurring ? "border-violet-400 bg-violet-50" : "border-line hover:border-violet-300"}`}>
                  <Repeat className="text-violet-600" size={22} />
                  <span className="flex-1">
                    <span className="block font-medium">{t("repeat_weekly")}</span>
                    <span className="text-sm text-muted">Every {weekday} — the same worker is invited automatically</span>
                  </span>
                  <span className={`h-6 w-11 rounded-full p-0.5 transition ${recurring ? "bg-violet-600" : "bg-slate-300"}`}>
                    <span className={`block h-5 w-5 rounded-full bg-white shadow transition ${recurring ? "translate-x-5" : ""}`} />
                  </span>
                </button>
              </>
            )}

            {step === 3 && (
              <>
                {heading(t("budget"), price ? `${t("suggested_price")} ${price.low} to ${price.high} rupees` : t("budget"))}
                {price && (
                  <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
                    <div className="text-sm font-medium text-brand-700 flex items-center gap-1.5">
                      <Sparkles size={15} /> {t("suggested_price")}
                    </div>
                    <div className="text-3xl font-bold mt-1">
                      {money(price.low)} – {money(price.high)}
                      {workers > 1 && <span className="text-base text-muted font-normal"> {t("per_worker")}</span>}
                    </div>
                    <ul className="mt-3 text-sm text-muted space-y-1">
                      {price.reasons.map((r: string) => (
                        <li key={r} className="flex gap-2">
                          <Check size={15} className="text-brand-600 mt-0.5 shrink-0" /> {r}
                        </li>
                      ))}
                    </ul>
                    <button className="btn-ghost !py-2 mt-3 text-sm" onClick={() => setBudget(price.suggested)}>
                      Use {money(price.suggested)}
                    </button>
                  </div>
                )}
                <div>
                  <div className="label">Your offer {workers > 1 && `(${t("per_worker")})`}</div>
                  <div className="flex items-center gap-3 max-w-md">
                    <button className="h-12 w-12 rounded-lg border border-line bg-white grid place-items-center hover:bg-slate-50" onClick={() => setBudget(Math.max(50, budget - 50))} aria-label="minus 50">
                      <Minus />
                    </button>
                    <div className="flex-1 relative">
                      <IndianRupee size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                      <input type="number" inputMode="numeric" className="input !text-2xl font-semibold text-center !pl-10 h-12" value={budget || ""} onChange={(e) => setBudget(Number(e.target.value))} />
                    </div>
                    <button className="h-12 w-12 rounded-lg bg-brand-600 text-white grid place-items-center hover:bg-brand-700" onClick={() => setBudget(budget + 50)} aria-label="plus 50">
                      <Plus />
                    </button>
                  </div>
                  {price && budget < price.low * 0.8 && (
                    <div className="mt-2 text-sm text-amber-700 flex items-center gap-1.5">
                      <TriangleAlert size={15} /> Lower than usual — fewer workers may accept.
                    </div>
                  )}
                  {workers > 1 && <div className="mt-2 text-sm text-muted">Total: {money(budget * workers)}</div>}
                </div>
                <div>
                  <div className="label">{t("pay_method")}</div>
                  <div className="grid grid-cols-3 gap-2.5 max-w-xl">
                    {[
                      ["cash", Banknote, t("cash")],
                      ["upi", Smartphone, t("upi")],
                      ["online", ShieldCheck, t("online")],
                    ].map(([id, Icon, label]: any) => (
                      <button key={id} onClick={() => setPayMethod(id)} className={`tile py-4 ${payMethod === id ? "tile-on" : ""}`}>
                        <Icon size={24} className="text-brand-600" />
                        <span className="text-sm">{label}</span>
                      </button>
                    ))}
                  </div>
                  {payMethod === "online" && (
                    <div className="text-sm text-muted mt-2 flex gap-2">
                      <ShieldCheck className="text-brand-600 shrink-0" size={17} /> Money is held safely and released to the worker only after you confirm the work is done.
                    </div>
                  )}
                </div>
              </>
            )}

            {step === 4 && (
              <>
                {heading(t("review_post"), `${title}. ${loc?.address}. ${prettyDate(finalDate, t)}. ${workers} workers. ${budget} rupees.`)}
                <div>
                  <div className="label">Job title</div>
                  <input className="input !text-lg font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <div className="label flex items-center gap-1.5">
                    <Sparkles size={14} /> Job checklist (generated — click a line to remove it)
                  </div>
                  <ul className="rounded-xl border border-line divide-y divide-line">
                    {tasks.map((tk) => (
                      <li key={tk}>
                        <button onClick={() => setTasks(tasks.filter((x) => x !== tk))} className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 hover:bg-slate-50">
                          <Check size={16} className="text-brand-600" /> {tk}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                {text && <p className="text-sm text-muted italic">“{text}”</p>}
                <button className="btn-primary btn-lg w-full sm:w-auto" disabled={posting} onClick={post}>
                  <Send size={18} /> {posting ? "Posting…" : t("post_now")}
                </button>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {step < 4 && (
          <div className="flex gap-3 mt-5">
            {step > 0 && (
              <button className="btn-ghost btn-lg" onClick={() => setStep(step - 1)}>
                <ChevronLeft size={18} /> {t("back")}
              </button>
            )}
            <button className="btn-primary btn-lg flex-1 sm:flex-none sm:min-w-48 ml-auto" disabled={!canNext || parsing} onClick={next}>
              {t("next")} <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* live summary */}
      <aside className="card p-5 xl:sticky xl:top-24 space-y-4">
        <div className="flex items-center gap-3">
          {skills.length ? <SkillBadge skill={skills[0]} size={44} /> : <CatBadge cat={category || "other"} size={44} />}
          <div className="min-w-0">
            <div className="text-xs text-muted font-medium uppercase tracking-wider">Summary</div>
            <div className="font-semibold truncate">{title || "New job"}</div>
          </div>
        </div>
        <div className="divide-y divide-line text-sm">
          {summaryRows.map(([Icon, label, val]) => (
            <div key={label} className="flex items-center gap-3 py-2.5">
              <Icon size={16} className="text-muted" />
              <span className="text-muted flex-1">{label}</span>
              <span className="font-medium text-right truncate max-w-[55%]">{val}</span>
            </div>
          ))}
        </div>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <span key={s} className="chip !text-xs bg-slate-100 text-slate-700">
                {skillName(s)}
              </span>
            ))}
          </div>
        )}
        {recurring && (
          <div className="chip bg-violet-50 text-violet-700">
            <Repeat size={13} /> Every {weekday}
          </div>
        )}
        {price && (
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <span className="text-muted">Usual price here: </span>
            <span className="font-semibold">
              {money(price.low)} – {money(price.high)}
            </span>
          </div>
        )}
      </aside>

      <Modal open={skillPicker} onClose={() => setSkillPicker(false)} title={t("add_skill")} wide>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {catSkills.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                if (!skills.includes(s.id)) setSkills([...skills, s.id]);
                if (!category) setCategory(s.cat);
                setSkillPicker(false);
              }}
              className={`tile py-3 !flex-row !justify-start text-left ${skills.includes(s.id) ? "tile-on" : ""}`}
            >
              <SkillBadge skill={s.id} size={34} />
              <span className="text-sm">{s[lang] || s.en}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
