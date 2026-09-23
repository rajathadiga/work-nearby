"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mic, Map as MapIcon, List, Route, Users, TrendingUp, IdCard, Crown } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { greetingKey } from "@/lib/i18n";
import { useVoiceInput } from "@/lib/speech";
import { useRequireUser, Loading, Empty, SpeakButton, BookingStatusPill, money, prettyDate } from "@/components/ui";
import { JobCard } from "@/components/cards";
import MapView from "@/components/MapView";

export default function WorkerHome() {
  const user = useRequireUser("worker");
  const { t, lang, toast, refreshUser, say } = useApp();
  const [feed, setFeed] = useState<any[] | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [earn, setEarn] = useState<any>(null);
  const [available, setAvailable] = useState(false);
  const [radius, setRadius] = useState(10);
  const [view, setView] = useState<"list" | "map">("list");
  const wp = user?.worker;

  const load = () => {
    api("/worker/feed").then(setFeed).catch(() => setFeed([]));
    api("/worker/bookings").then(setBookings).catch(() => {});
  };

  useEffect(() => {
    if (!wp) return;
    setAvailable(wp.available);
    setRadius(wp.radius_km);
    load();
    api("/worker/earnings").then(setEarn).catch(() => {});
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wp?.id]);

  async function toggle(v: boolean, r?: number) {
    try {
      const res = await api("/worker/availability", { body: { available: v, radius_km: r ?? radius } });
      setAvailable(res.available);
      setRadius(res.radius_km);
      if (res.available) {
        toast(`🟢 ${t("you_available")}`, `${res.jobs_nearby} jobs within ${res.radius_km} km`);
        say(`${t("you_available")}. ${res.jobs_nearby} ${t("work_near_you")}`);
      } else toast(t("you_offline"));
      load();
      refreshUser();
    } catch (e: any) {
      toast("❌", e.message);
    }
  }

  const voice = useVoiceInput(lang, async (text) => {
    const r = await api("/ai/availability", { body: { text } });
    toggle(r.available, r.radius_km);
  });

  async function accept(jobId: number) {
    try {
      await api(`/jobs/${jobId}/accept`, { body: {} });
      toast("🎉 Job accepted!", "Customer has been informed");
      say("Job accepted");
      load();
    } catch (e: any) {
      toast("❌", e.message);
    }
  }

  if (!user) return <Loading />;
  if (!wp)
    return (
      <div className="card p-6 text-center space-y-4 max-w-md mx-auto">
        <div className="text-6xl">👷</div>
        <h1 className="text-2xl font-black">{t("need_work")}</h1>
        <p className="text-muted font-semibold">Create your free worker profile to get work near you.</p>
        <button
          className="btn-sun btn-lg w-full"
          onClick={async () => {
            await api("/me", { method: "PATCH", body: { role: "worker" } });
            await refreshUser();
            window.location.href = "/worker/profile?onboard=1";
          }}
        >
          Start as worker →
        </button>
      </div>
    );

  const active = bookings.filter((b) => ["confirmed", "on_the_way", "arrived", "completed"].includes(b.status));
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-black">
            {t(greetingKey())}, {firstName} 👋
          </h1>
          <p className="text-muted font-semibold">
            📍 {user.area} • {radius} km
          </p>
        </div>
        <SpeakButton text={`${t(greetingKey())} ${firstName}. ${available ? t("you_available") : t("you_offline")}. ${feed?.length || 0} ${t("work_near_you")}.`} />
      </div>

      {/* availability */}
      <div className={`rounded-[2rem] p-5 text-center transition ${available ? "bg-gradient-to-br from-green-500 to-brand-700 text-white" : "bg-white card"}`}>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => toggle(!available)}
          className={`mx-auto h-36 w-36 rounded-full grid place-items-center text-5xl font-black border-8 shadow-2xl ${
            available ? "bg-white text-green-600 border-green-300 pulse-dot" : "bg-gray-100 text-gray-400 border-gray-200"
          }`}
          aria-label={t("available_today")}
        >
          {available ? "🟢" : "⚪"}
        </motion.button>
        <div className="mt-4 text-2xl font-black">{available ? t("you_available") : t("you_offline")}</div>
        <div className={`font-semibold ${available ? "text-white/85" : "text-muted"}`}>{available ? `${feed?.length || 0} ${t("work_near_you")}` : t("tap_to_go_online")}</div>
        <div className="mt-4 flex justify-center gap-2 flex-wrap">
          {[3, 5, 10, 15, 25].map((r) => (
            <button key={r} onClick={() => toggle(available, r)} className={`chip ${radius === r ? (available ? "bg-white text-green-700" : "bg-brand-600 text-white") : available ? "bg-white/20" : "bg-gray-100"}`}>
              {r} km
            </button>
          ))}
        </div>
        <button onClick={voice.listening ? voice.stop : voice.start} className={`mt-4 chip ${available ? "bg-white/20" : "bg-sun-100 text-sun-600"} !py-2`}>
          <Mic size={16} /> {voice.listening ? voice.interim || t("listening") : "“Available today, 10 km”"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/worker/earnings" className="card p-4">
          <div className="text-sm font-bold text-muted">{t("earned_week")}</div>
          <div className="text-3xl font-black text-brand-700">{money(earn?.week || 0)}</div>
          {earn?.pending_amount > 0 && <div className="text-xs font-bold text-amber-700">+{money(earn.pending_amount)} pending</div>}
        </Link>
        <Link href={`/workers/${user.id}`} className="card p-4">
          <div className="text-sm font-bold text-muted">⭐ Rating</div>
          <div className="text-3xl font-black">{wp.rating || "New"}</div>
          <div className="text-xs font-bold text-muted">
            {wp.jobs_completed} {t("jobs_done")}
          </div>
        </Link>
      </div>

      {active.length > 0 && (
        <section className="space-y-2">
          <h2 className="section-title">🛠️ {t("my_work")}</h2>
          {active.map((b) => (
            <Link key={b.id} href={`/worker/jobs/${b.job_id}`} className="card p-4 flex items-center gap-3 ring-2 ring-sun-300">
              <span className="text-3xl">{b.job.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold truncate">{b.job.title}</div>
                <div className="text-sm text-muted font-semibold">
                  {prettyDate(b.job.date, t)} • {b.job.address} • {money(b.amount)}
                </div>
                <BookingStatusPill status={b.status} />
              </div>
              <span className="text-2xl text-muted">›</span>
            </Link>
          ))}
        </section>
      )}

      <div className="grid grid-cols-4 gap-2">
        {[
          ["/worker/route", Route, t("route_jobs")],
          ["/worker/groups", Users, t("groups")],
          ["/worker/insights", TrendingUp, t("demand")],
          [`/workers/${user.id}`, IdCard, t("passport")],
        ].map(([href, Icon, label]: any) => (
          <Link key={href} href={href} className="tile py-3">
            <Icon className="text-brand-600" />
            <span className="text-[11px] leading-tight">{label}</span>
          </Link>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="section-title flex-1">📍 {t("work_near_you")}</h2>
          <div className="flex rounded-full bg-white border border-black/10 p-0.5">
            <button onClick={() => setView("list")} className={`px-3 py-1.5 rounded-full ${view === "list" ? "bg-brand-600 text-white" : ""}`} aria-label="list">
              <List size={18} />
            </button>
            <button onClick={() => setView("map")} className={`px-3 py-1.5 rounded-full ${view === "map" ? "bg-brand-600 text-white" : ""}`} aria-label="map">
              <MapIcon size={18} />
            </button>
          </div>
        </div>
        {!wp.skills?.length && (
          <Link href="/worker/profile" className="card p-4 block bg-sun-50 font-bold">
            ➕ Add your skills to get matched with work →
          </Link>
        )}
        {feed === null ? (
          <Loading />
        ) : feed.length === 0 ? (
          <Empty icon="🔎" text={t("no_work")} />
        ) : view === "map" ? (
          <MapView
            center={[user.lat, user.lng]}
            height={420}
            fit
            markers={[
              { lat: user.lat, lng: user.lng, emoji: "🏠", popup: "You", size: 30 },
              ...feed.map((j) => ({ lat: j.lat, lng: j.lng, emoji: j.icon, popup: `<b>${j.title}</b><br/>₹${j.budget} • ${j.distance_km} km<br/><a href="/worker/jobs/${j.id}">Open →</a>` })),
            ]}
            circles={[{ lat: user.lat, lng: user.lng, radius: radius * 1000, color: "#10b981", opacity: 0.08 }]}
          />
        ) : (
          feed.map((j) => (
            <JobCard key={j.id} job={j} href={`/worker/jobs/${j.id}`}>
              <div className="flex gap-2 mt-3">
                <button className="btn-primary flex-[2] !py-3" onClick={() => accept(j.id)}>
                  ✅ {t("accept")}
                </button>
                <button
                  className="btn-ghost flex-1 !py-3"
                  onClick={async () => {
                    await api(`/jobs/${j.id}/decline`, { body: {} });
                    load();
                  }}
                >
                  {t("decline")}
                </button>
              </div>
            </JobCard>
          ))
        )}
      </section>

      {user.subscription !== "pro" && (
        <Link href="/plans" className="card p-4 flex items-center gap-3 bg-gradient-to-r from-amber-50 to-white">
          <Crown className="text-amber-500" />
          <div className="flex-1">
            <div className="font-extrabold">KaamNear Pro – ₹99/month</div>
            <div className="text-sm text-muted font-semibold">Get job alerts first • PRO badge • more visibility</div>
          </div>
          <span className="text-muted">›</span>
        </Link>
      )}
    </div>
  );
}
