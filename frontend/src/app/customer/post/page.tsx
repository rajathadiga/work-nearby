"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Minus, Plus, LocateFixed, Zap, Repeat, ShieldCheck, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { useRequireUser, VoiceBox, SpeakButton, Loading, DURATIONS, money, prettyDate, durLabel, Modal } from "@/components/ui";
import MapView from "@/components/MapView";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function PostJob() {
  const user = useRequireUser();
  const { t, meta, catName, skillName, skillIcon, toast, lang, say } = useApp();
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

  // prefill from URL (?text= / ?cat= / ?rebook=worker&from=job)
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
      if (p.warnings?.length) toast("⚠️ Please check", p.warnings.join(", "));
    } catch {
    } finally {
      setParsing(false);
    }
  }

  // live price suggestion
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

  async function post() {
    setPosting(true);
    try {
      const r = await api("/jobs", {
        body: {
          title,
          description: text,
          category: category || "other",
          skills,
          tasks,
          lat: loc!.lat,
          lng: loc!.lng,
          address: loc!.address,
          date: finalDate,
          time_slot: whenMode === "asap" ? "asap" : slot,
          urgent: whenMode === "asap",
          budget,
          duration,
          quantity,
          workers_required: workers,
          payment_method: payMethod,
          escrow: payMethod === "online",
          recurring: recurring ? { freq: "weekly", day: weekday } : {},
          source: ai ? "voice" : "web",
          preferred_worker_id: preferred,
        },
      });
      toast("🎉 Job posted!", `${r.matches} workers matched – alerts sent`);
      say("Job posted. We are finding workers.");
      router.replace(`/customer/jobs/${r.job.id}?new=1`);
    } catch (e: any) {
      toast("❌ Could not post", e.message);
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

  return (
    <div className="max-w-2xl mx-auto">
      {/* progress */}
      <div className="flex items-center gap-1 mb-4">
        {steps.map((s, i) => (
          <button key={s} onClick={() => i < step && setStep(i)} className="flex-1">
            <div className={`h-2 rounded-full ${i <= step ? "bg-brand-500" : "bg-black/10"}`} />
            <div className={`text-[11px] mt-1 font-bold truncate ${i === step ? "text-brand-700" : "text-muted"}`}>{s}</div>
          </button>
        ))}
      </div>
      {preferred > 0 && (
        <div className="card p-3 mb-3 bg-sun-50 font-bold flex items-center gap-2">
          ❤️ Booking again: {preferredName || "your saved worker"} will be invited first
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
          {step === 0 && (
            <>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black flex-1">{t("describe")}</h1>
                <SpeakButton text={`${t("describe")}. ${t("speak_work")}`} />
              </div>
              <VoiceBox value={text} onChange={setText} onFinal={parse} placeholder="Example: Need someone to clean my garden and pluck coconuts from 3 trees tomorrow morning" />
              {parsing && (
                <div className="card p-4 flex items-center gap-3 text-brand-700 font-bold">
                  <Sparkles className="animate-spin" /> Understanding your work…
                </div>
              )}
              {ai && !parsing && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4 border-2 border-brand-200 bg-brand-50/40">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="text-brand-600" size={20} />
                    <span className="font-black text-brand-800 flex-1">AI understood ({ai.engine === "claude" ? "Claude" : "smart rules"})</span>
                    <span className="text-xs font-bold text-muted">{Math.round(ai.confidence * 100)}% sure</span>
                  </div>
                  <div className="text-lg font-extrabold">{title}</div>
                  <div className="flex flex-wrap gap-2 mt-2 text-sm font-bold">
                    <span className="chip bg-white">👷 {workers}</span>
                    <span className="chip bg-white">⏳ {durLabel(duration)}</span>
                    {ai.date && <span className="chip bg-white">📅 {prettyDate(ai.date, t)}</span>}
                    {ai.time_slot !== "flexible" && <span className="chip bg-white">🕘 {t(ai.time_slot)}</span>}
                    {quantity > 0 && <span className="chip bg-white">🔢 {quantity}</span>}
                    {ai.urgent && <span className="chip bg-red-600 text-white">⚡ {t("urgent")}</span>}
                    {ai.recurring?.freq && <span className="chip bg-violet-100 text-violet-700">🔁 {ai.recurring.day || "daily"}</span>}
                    {ai.place && <span className="chip bg-white">📍 {ai.place}</span>}
                  </div>
                </motion.div>
              )}
              <div>
                <div className="label">{t("choose_type")}</div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {meta.categories.map((c) => (
                    <button key={c.id} onClick={() => setCategory(c.id === category ? "" : c.id)} className={`tile py-3 ${category === c.id ? "tile-on" : ""}`}>
                      <span className="text-3xl">{c.icon}</span>
                      <span className="text-[11px] leading-tight">{catName(c)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="label">🛠️ Skills needed</div>
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <button key={s} onClick={() => setSkills(skills.filter((x) => x !== s))} className="chip bg-brand-600 text-white">
                      {skillIcon(s)} {skillName(s)} <X size={14} />
                    </button>
                  ))}
                  <button onClick={() => setSkillPicker(true)} className="chip bg-white border-2 border-dashed border-brand-400 text-brand-700">
                    <Plus size={14} /> {t("add_skill")}
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black flex-1">📍 {t("where")}</h1>
                <SpeakButton text={t("where")} />
              </div>
              <button
                className="btn-primary btn-lg w-full"
                onClick={() =>
                  navigator.geolocation?.getCurrentPosition(
                    (p) => {
                      const { latitude: lat, longitude: lng } = p.coords;
                      if (Math.abs(lat - 13.34) > 0.6 || Math.abs(lng - 74.74) > 0.6) {
                        toast("📍 You seem outside our area", "Using your saved location in Udupi region for this demo");
                        return;
                      }
                      setLoc({ lat, lng, address: "My location" });
                    },
                    () => toast("Location not allowed", "Please tap on the map or choose a place")
                  )
                }
              >
                <LocateFixed /> {t("use_my_location")}
              </button>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {meta.places.map((p) => (
                  <button key={p.name} onClick={() => setLoc({ lat: p.lat, lng: p.lng, address: p.name })} className={`chip shrink-0 ${loc?.address === p.name ? "bg-brand-600 text-white" : "bg-white border border-black/10"}`}>
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="text-sm font-bold text-muted">{t("tap_map")}</div>
              {loc && (
                <MapView
                  center={[loc.lat, loc.lng]}
                  zoom={14}
                  height={320}
                  markers={[{ lat: loc.lat, lng: loc.lng, emoji: "📍", size: 36 }]}
                  onPick={(lat, lng) => setLoc({ lat, lng, address: loc.address === "My location" || meta.places.some((p) => p.name === loc.address) ? `Near ${loc.address}` : loc.address })}
                />
              )}
              <div>
                <div className="label">🏠 Address / landmark (optional)</div>
                <input className="input" value={loc?.address || ""} onChange={(e) => loc && setLoc({ ...loc, address: e.target.value })} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black flex-1">📅 {t("when")}</h1>
                <SpeakButton text={t("when")} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    ["asap", "⚡", t("asap")],
                    ["today", "☀️", t("today")],
                    ["tomorrow", "🌅", t("tomorrow")],
                    ["date", "📆", t("pick_date")],
                  ] as const
                ).map(([id, icon, label]) => (
                  <button key={id} onClick={() => setWhenMode(id)} className={`tile py-4 ${whenMode === id ? (id === "asap" ? "ring-4 ring-red-500 bg-red-50" : "tile-on") : ""}`}>
                    <span className="text-3xl">{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              {whenMode === "asap" && (
                <div className="card p-3 bg-red-50 text-red-800 font-bold flex gap-2 items-center">
                  <Zap /> Only workers who are available right now & nearby get an urgent alert.
                </div>
              )}
              {whenMode === "date" && <input type="date" className="input" value={date} min={iso(new Date())} onChange={(e) => setDate(e.target.value)} />}
              {whenMode !== "asap" && (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    ["morning", "🌅"],
                    ["afternoon", "☀️"],
                    ["evening", "🌇"],
                    ["flexible", "🕐"],
                  ].map(([id, icon]) => (
                    <button key={id} onClick={() => setSlot(id)} className={`tile py-3 ${slot === id ? "tile-on" : ""}`}>
                      <span className="text-2xl">{icon}</span>
                      <span className="text-xs">{t(id)}</span>
                    </button>
                  ))}
                </div>
              )}
              <div>
                <div className="label">⏳ {t("how_long")}</div>
                <div className="grid grid-cols-3 gap-2">
                  {DURATIONS.map((d) => (
                    <button key={d.id} onClick={() => setDuration(d.id)} className={`tile py-3 ${duration === d.id ? "tile-on" : ""}`}>
                      <span className="text-xl">{d.icon}</span>
                      <span className="text-sm">{d.en}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="card p-4 flex items-center gap-4">
                <span className="text-3xl">👷</span>
                <span className="flex-1 font-extrabold">{t("how_many")}</span>
                <button className="h-12 w-12 rounded-full bg-gray-100 grid place-items-center" onClick={() => setWorkers(Math.max(1, workers - 1))} aria-label="minus">
                  <Minus />
                </button>
                <span className="text-3xl font-black w-10 text-center">{workers}</span>
                <button className="h-12 w-12 rounded-full bg-brand-600 text-white grid place-items-center" onClick={() => setWorkers(Math.min(50, workers + 1))} aria-label="plus">
                  <Plus />
                </button>
              </div>
              {skills.some((s) => meta.skills.find((x) => x.id === s)?.unit === "tree") && (
                <div className="card p-4 flex items-center gap-4">
                  <span className="text-3xl">🌴</span>
                  <span className="flex-1 font-extrabold">How many trees?</span>
                  <button className="h-12 w-12 rounded-full bg-gray-100 grid place-items-center" onClick={() => setQuantity(Math.max(0, quantity - 1))}>
                    <Minus />
                  </button>
                  <span className="text-3xl font-black w-10 text-center">{quantity}</span>
                  <button className="h-12 w-12 rounded-full bg-brand-600 text-white grid place-items-center" onClick={() => setQuantity(quantity + 1)}>
                    <Plus />
                  </button>
                </div>
              )}
              <button onClick={() => setRecurring(!recurring)} className={`card p-4 w-full flex items-center gap-3 text-left ${recurring ? "ring-4 ring-violet-400 bg-violet-50" : ""}`}>
                <Repeat className="text-violet-600" />
                <span className="flex-1">
                  <span className="block font-extrabold">{t("repeat_weekly")}</span>
                  <span className="text-sm text-muted font-semibold">Every {weekday} – same worker is invited automatically</span>
                </span>
                <span className={`h-7 w-12 rounded-full p-1 transition ${recurring ? "bg-violet-600" : "bg-gray-300"}`}>
                  <span className={`block h-5 w-5 rounded-full bg-white transition ${recurring ? "translate-x-5" : ""}`} />
                </span>
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black flex-1">💰 {t("budget")}</h1>
                <SpeakButton text={price ? `${t("suggested_price")} ${price.low} to ${price.high} rupees` : t("budget")} />
              </div>
              {price && (
                <div className="card p-4 bg-gradient-to-br from-brand-50 to-white border-2 border-brand-200">
                  <div className="text-sm font-bold text-brand-700 flex items-center gap-1">
                    <Sparkles size={16} /> {t("suggested_price")}
                  </div>
                  <div className="text-3xl font-black">
                    {money(price.low)} – {money(price.high)}
                    {workers > 1 && <span className="text-base text-muted"> {t("per_worker")}</span>}
                  </div>
                  <ul className="mt-2 text-sm text-muted font-semibold space-y-0.5">
                    {price.reasons.map((r: string) => (
                      <li key={r}>• {r}</li>
                    ))}
                  </ul>
                  <button className="btn-ghost !py-2 mt-3 text-sm" onClick={() => setBudget(price.suggested)}>
                    Use {money(price.suggested)}
                  </button>
                </div>
              )}
              <div className="card p-4">
                <div className="label">
                  Your offer {workers > 1 && `(${t("per_worker")})`}
                </div>
                <div className="flex items-center gap-3">
                  <button className="h-14 w-14 rounded-full bg-gray-100 grid place-items-center" onClick={() => setBudget(Math.max(50, budget - 50))}>
                    <Minus />
                  </button>
                  <div className="flex-1 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-muted">₹</span>
                    <input type="number" inputMode="numeric" className="input !text-3xl font-black text-center !pl-10" value={budget || ""} onChange={(e) => setBudget(Number(e.target.value))} />
                  </div>
                  <button className="h-14 w-14 rounded-full bg-brand-600 text-white grid place-items-center" onClick={() => setBudget(budget + 50)}>
                    <Plus />
                  </button>
                </div>
                {price && budget < price.low * 0.8 && <div className="mt-2 text-sm font-bold text-amber-700">⚠️ Lower than usual – fewer workers may accept.</div>}
                {workers > 1 && <div className="mt-2 text-sm font-bold text-muted">Total: {money(budget * workers)}</div>}
              </div>
              <div>
                <div className="label">{t("pay_method")}</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["cash", "💵", t("cash")],
                    ["upi", "📲", t("upi")],
                    ["online", "🛡️", t("online")],
                  ].map(([id, icon, label]) => (
                    <button key={id} onClick={() => setPayMethod(id)} className={`tile py-4 ${payMethod === id ? "tile-on" : ""}`}>
                      <span className="text-3xl">{icon}</span>
                      <span className="text-sm">{label}</span>
                    </button>
                  ))}
                </div>
                {payMethod === "online" && (
                  <div className="text-sm font-semibold text-muted mt-2 flex gap-2">
                    <ShieldCheck className="text-brand-600 shrink-0" size={18} /> Money is held safely and released to the worker only after you confirm the work is done.
                  </div>
                )}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black flex-1">✅ {t("review_post")}</h1>
                <SpeakButton
                  text={`${title}. ${loc?.address}. ${prettyDate(finalDate, t)} ${whenMode === "asap" ? t("asap") : t(slot)}. ${workers} workers. ${budget} rupees.`}
                />
              </div>
              <div className="card p-5 space-y-3">
                <input className="input !text-xl font-extrabold" value={title} onChange={(e) => setTitle(e.target.value)} />
                <div className="grid grid-cols-2 gap-2 text-sm font-bold">
                  <div className="rounded-2xl bg-gray-50 p-3">📍 {loc?.address}</div>
                  <div className="rounded-2xl bg-gray-50 p-3">
                    📅 {prettyDate(finalDate, t)} • {whenMode === "asap" ? "⚡ " + t("asap") : t(slot)}
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-3">
                    👷 {workers} • ⏳ {durLabel(duration)}
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-3">
                    💰 {money(budget)}
                    {workers > 1 && " × " + workers} • {payMethod.toUpperCase()}
                  </div>
                </div>
                {recurring && <div className="chip bg-violet-100 text-violet-700">🔁 Every {weekday}</div>}
                <div>
                  <div className="label flex items-center gap-1">
                    <Sparkles size={14} /> AI job description (tap to remove a line)
                  </div>
                  <ul className="space-y-1">
                    {tasks.map((tk) => (
                      <li key={tk}>
                        <button onClick={() => setTasks(tasks.filter((x) => x !== tk))} className="text-left font-semibold">
                          ✔️ {tk}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                {text && <p className="text-sm text-muted font-semibold italic">“{text}”</p>}
              </div>
              <button className="btn-sun btn-lg w-full" disabled={posting} onClick={post}>
                {posting ? "…" : `🚀 ${t("post_now")}`}
              </button>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {step < 4 && (
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button className="btn-ghost btn-lg flex-1" onClick={() => setStep(step - 1)}>
              ← {t("back")}
            </button>
          )}
          <button className="btn-primary btn-lg flex-[2]" disabled={!canNext || parsing} onClick={next}>
            {t("next")} →
          </button>
        </div>
      )}

      <Modal open={skillPicker} onClose={() => setSkillPicker(false)} title={t("add_skill")}>
        <div className="grid grid-cols-2 gap-2">
          {catSkills.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                if (!skills.includes(s.id)) setSkills([...skills, s.id]);
                if (!category) setCategory(s.cat);
                setSkillPicker(false);
              }}
              className={`tile py-3 ${skills.includes(s.id) ? "tile-on" : ""}`}
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="text-sm">{s[lang] || s.en}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
