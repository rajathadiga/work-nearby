"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mic, Map as MapIcon, List, Route, UsersRound, TrendingUp, IdCard, Crown, Power, Wallet, Star, MapPin, HardHat, ChevronRight, Search, Check, X, Plus } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { greetingKey } from "@/lib/i18n";
import { useVoiceInput } from "@/lib/speech";
import { SkillBadge, IconBadge } from "@/lib/icons";
import { useRequireUser, Loading, Empty, SpeakButton, BookingStatusPill, money, prettyDate, Stat } from "@/components/ui";
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
        toast(t("you_available"), `${res.jobs_nearby} jobs within ${res.radius_km} km`, "success");
        say(`${t("you_available")}. ${res.jobs_nearby} ${t("work_near_you")}`);
      } else toast(t("you_offline"));
      load();
      refreshUser();
    } catch (e: any) {
      toast("Something went wrong", e.message, "error");
    }
  }

  const voice = useVoiceInput(lang, async (text) => {
    const r = await api("/ai/availability", { body: { text } });
    toggle(r.available, r.radius_km);
  });

  async function accept(jobId: number) {
    try {
      await api(`/jobs/${jobId}/accept`, { body: {} });
      toast("Job accepted", "The customer has been informed", "success");
      say("Job accepted");
      load();
    } catch (e: any) {
      toast("Could not accept", e.message, "error");
    }
  }

  if (!user) return <Loading />;
  if (!wp)
    return (
      <div className="card p-8 text-center space-y-4 max-w-md mx-auto mt-10">
        <IconBadge icon={HardHat} size={60} tone="amber" className="mx-auto" />
        <h1 className="text-2xl font-bold">{t("need_work")}</h1>
        <p className="text-muted">Create your free worker profile to get work near you.</p>
        <button
          className="btn-primary btn-lg w-full"
          onClick={async () => {
            await api("/me", { method: "PATCH", body: { role: "worker" } });
            await refreshUser();
            window.location.href = "/worker/profile?onboard=1";
          }}
        >
          Start as worker <ChevronRight size={18} />
        </button>
      </div>
    );

  const active = bookings.filter((b) => ["confirmed", "on_the_way", "arrived", "completed"].includes(b.status));
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            {t(greetingKey())}, {firstName}
          </h1>
          <p className="text-muted flex items-center gap-1.5">
            <MapPin size={15} /> {user.area} · within {radius} km
          </p>
        </div>
        <SpeakButton text={`${t(greetingKey())} ${firstName}. ${available ? t("you_available") : t("you_offline")}. ${feed?.length || 0} ${t("work_near_you")}.`} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Wallet} label={t("earned_week")} value={money(earn?.week || 0)} sub={earn?.pending_amount > 0 ? `${money(earn.pending_amount)} pending` : undefined} />
        <Stat icon={Wallet} label="This month" value={money(earn?.month || 0)} sub={`${earn?.month_jobs || 0} jobs`} />
        <Stat icon={Star} label="Rating" value={wp.rating || "New"} sub={`${wp.rating_count} reviews`} />
        <Stat icon={Check} label="Completion rate" value={wp.reliability.completion_rate !== null ? wp.reliability.completion_rate + "%" : "—"} sub={`${wp.jobs_completed} ${t("jobs_done")}`} />
      </div>

      <div className="grid xl:grid-cols-[380px_minmax(0,1fr)] gap-6 items-start">
        <aside className="space-y-5 xl:sticky xl:top-24">
          {/* availability */}
          <div className={`card p-6 text-center transition ${available ? "border-emerald-300 bg-emerald-50/50" : ""}`}>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => toggle(!available)}
              className={`mx-auto h-28 w-28 rounded-full grid place-items-center border-4 shadow-sm transition ${
                available ? "bg-emerald-600 text-white border-emerald-200 pulse-dot text-emerald-500" : "bg-white text-slate-400 border-slate-200 hover:border-brand-300"
              }`}
              aria-label={t("available_today")}
            >
              <Power size={44} className={available ? "text-white" : ""} />
            </motion.button>
            <div className="mt-4 text-lg font-semibold">{available ? t("you_available") : t("you_offline")}</div>
            <div className="text-sm text-muted">{available ? `${feed?.length || 0} ${t("work_near_you")}` : t("tap_to_go_online")}</div>
            <div className="mt-4">
              <div className="text-xs font-medium text-muted mb-2">{t("radius")}</div>
              <div className="flex justify-center gap-1.5 flex-wrap">
                {[3, 5, 10, 15, 25].map((r) => (
                  <button key={r} onClick={() => toggle(available, r)} className={`chip border ${radius === r ? "bg-brand-600 text-white border-brand-600" : "bg-white border-line hover:border-brand-300"}`}>
                    {r} km
                  </button>
                ))}
              </div>
            </div>
            <button onClick={voice.listening ? voice.stop : voice.start} className={`mt-4 chip border !py-1.5 ${voice.listening ? "bg-rose-50 border-rose-300 text-rose-700" : "bg-white border-line text-muted hover:text-ink"}`}>
              <Mic size={14} /> {voice.listening ? voice.interim || t("listening") : "Say: “Available today, 10 km”"}
            </button>
          </div>

          {active.length > 0 && (
            <div className="card">
              <div className="px-5 py-3.5 border-b border-line section-title">{t("my_work")}</div>
              <div className="divide-y divide-line">
                {active.map((b) => (
                  <Link key={b.id} href={`/worker/jobs/${b.job_id}`} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50">
                    <SkillBadge skill={b.job.skills[0]} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{b.job.title}</div>
                      <div className="text-xs text-muted">
                        {prettyDate(b.job.date, t)} · {b.job.address} · {money(b.amount)}
                      </div>
                      <div className="mt-1">
                        <BookingStatusPill status={b.status} />
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-muted" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {[
              ["/worker/route", Route, t("route_jobs")],
              ["/worker/groups", UsersRound, t("groups")],
              ["/worker/insights", TrendingUp, t("demand")],
              [`/workers/${user.id}`, IdCard, t("passport")],
            ].map(([href, Icon, label]: any) => (
              <Link key={href} href={href} className="tile py-4">
                <Icon size={22} className="text-brand-600" />
                <span className="text-sm">{label}</span>
              </Link>
            ))}
          </div>

          {user.subscription !== "pro" && (
            <Link href="/plans" className="card p-4 flex items-start gap-3 hover:border-sun-400 transition">
              <Crown size={20} className="text-sun-500 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold">KaamNear Pro · ₹99/month</div>
                <div className="text-sm text-muted">Get job alerts first, a PRO badge and more visibility.</div>
              </div>
            </Link>
          )}
        </aside>

        <section className="space-y-4 min-w-0">
          <div className="flex items-center gap-2">
            <div className="section-title flex-1">{t("work_near_you")}</div>
            <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-0.5">
              <button onClick={() => setView("list")} className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-sm ${view === "list" ? "bg-white shadow-sm" : "text-muted"}`}>
                <List size={15} /> List
              </button>
              <button onClick={() => setView("map")} className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-sm ${view === "map" ? "bg-white shadow-sm" : "text-muted"}`}>
                <MapIcon size={15} /> Map
              </button>
            </div>
          </div>
          {!wp.skills?.length && (
            <Link href="/worker/profile" className="card p-4 flex items-center gap-2 border-sun-200 bg-sun-50 font-medium">
              <Plus size={18} /> Add your skills to get matched with work
            </Link>
          )}
          {feed === null ? (
            <Loading />
          ) : feed.length === 0 ? (
            <Empty icon={Search} text={t("no_work")} />
          ) : view === "map" ? (
            <div className="card p-3">
              <MapView
                center={[user.lat, user.lng]}
                height={620}
                fit
                markers={[
                  { lat: user.lat, lng: user.lng, kind: "home", popup: "You", size: 32 },
                  ...feed.map((j) => ({ lat: j.lat, lng: j.lng, kind: (j.urgent ? "urgent" : "job") as any, popup: `<b>${j.title}</b><br/>₹${j.budget} · ${j.distance_km} km<br/><a href="/worker/jobs/${j.id}">Open</a>` })),
                ]}
                circles={[{ lat: user.lat, lng: user.lng, radius: radius * 1000, color: "#2f817a", opacity: 0.06 }]}
              />
            </div>
          ) : (
            <div className="grid 2xl:grid-cols-2 gap-4">
              {feed.map((j) => (
                <JobCard key={j.id} job={j} href={`/worker/jobs/${j.id}`}>
                  <div className="flex gap-2 mt-3">
                    <button className="btn-primary flex-[2]" onClick={() => accept(j.id)}>
                      <Check size={17} /> {t("accept")}
                    </button>
                    <button
                      className="btn-ghost flex-1"
                      onClick={async () => {
                        await api(`/jobs/${j.id}/decline`, { body: {} });
                        load();
                      }}
                    >
                      <X size={16} /> {t("decline")}
                    </button>
                  </div>
                </JobCard>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
