"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Crown, ClipboardList, Bell, Users, History, ChevronRight, Repeat, Wallet, Star } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { greetingKey } from "@/lib/i18n";
import { SkillBadge, CatBadge } from "@/lib/icons";
import { useRequireUser, Loading, Empty, Avatar, Stars, SpeakButton, JobStatusPill, money, prettyDate, VoiceBox, Stat } from "@/components/ui";

export default function CustomerHome() {
  const user = useRequireUser();
  const { t, meta, catName } = useApp();
  const router = useRouter();
  const [jobs, setJobs] = useState<any[] | null>(null);
  const [favs, setFavs] = useState<any[]>([]);
  const [quick, setQuick] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = () => api("/jobs/mine").then(setJobs).catch(() => setJobs([]));
    load();
    api("/favorites").then(setFavs).catch(() => {});
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, [user]);

  if (!user) return <Loading />;
  const active = (jobs || []).filter((j) => !["completed", "cancelled"].includes(j.status));
  const past = (jobs || []).filter((j) => ["completed", "cancelled"].includes(j.status));
  const firstName = user.name.split(" ")[0];
  const spent = past.filter((j) => j.status === "completed").reduce((a, j) => a + j.budget * j.workers_required, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            {t(greetingKey())}, {firstName}
          </h1>
          <p className="text-muted">{t("what_help")}</p>
        </div>
        <SpeakButton text={`${t(greetingKey())} ${firstName}. ${t("what_help")}. ${active.length} ${t("active_jobs")}.`} />
        <Link href="/customer/post" className="btn-primary">
          <Plus size={18} /> {t("post_job")}
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={ClipboardList} label="Active jobs" value={active.length} />
        <Stat icon={History} label="Completed jobs" value={past.filter((j) => j.status === "completed").length} />
        <Stat icon={Wallet} label="Spent on work" value={money(spent)} />
        <Stat icon={Star} label="Your rating" value={user.customer.rating || "New"} sub={`${user.customer.rating_count} reviews from workers`} />
      </div>

      <div className="grid xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">
          <div className="card p-5">
            <div className="section-title mb-3">{t("describe")}</div>
            <VoiceBox
              value={quick}
              onChange={setQuick}
              rows={2}
              placeholder="e.g. Need someone to clean my garden tomorrow morning"
              onFinal={(v) => v.trim().length > 8 && router.push(`/customer/post?text=${encodeURIComponent(v)}`)}
            />
            <div className="flex justify-end mt-3">
              <button className="btn-primary" onClick={() => router.push(`/customer/post${quick ? `?text=${encodeURIComponent(quick)}` : ""}`)}>
                {t("continue")} <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div>
            <div className="section-title mb-3">{t("choose_type")}</div>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
              {meta?.categories
                .filter((c) => c.id !== "other")
                .map((c) => (
                  <Link key={c.id} href={`/customer/post?cat=${c.id}`} className="tile py-4">
                    <CatBadge cat={c.id} size={42} />
                    <span className="text-xs">{catName(c)}</span>
                  </Link>
                ))}
            </div>
          </div>

          <section>
            <div className="section-title mb-3">
              <ClipboardList size={18} className="text-brand-400" /> {t("active_jobs")}
            </div>
            {jobs === null ? (
              <Loading />
            ) : active.length === 0 ? (
              <Empty icon={ClipboardList} text={t("empty")} action={<Link href="/customer/post" className="btn-primary !py-2">{t("post_job")}</Link>} />
            ) : (
              <div className="grid lg:grid-cols-2 gap-3">
                {active.map((j) => (
                  <Link key={j.id} href={`/customer/jobs/${j.id}`} className="card p-4 flex items-start gap-3.5 hover:border-brand-500/40 transition">
                    <SkillBadge skill={j.skills[0]} size={46} tone={j.urgent ? "rose" : "brand"} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{j.title}</div>
                      <div className="text-sm text-muted">
                        {prettyDate(j.date, t)} · {money(j.budget)}
                        {j.workers_required > 1 && ` × ${j.workers_required}`}
                        {j.recurring?.freq && (
                          <span className="inline-flex items-center gap-1 ml-2 text-violet-300">
                            <Repeat size={12} /> weekly
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                        <JobStatusPill status={j.status} />
                        {j.status === "open" && (
                          <span className="text-xs text-muted flex items-center gap-1">
                            <Bell size={12} /> {j.match_count} workers matched
                          </span>
                        )}
                        {j.bookings.map((b: any) => (
                          <span key={b.id} className="chip !text-xs bg-surface-3 text-slate-300">
                            {b.worker_name.split(" ")[0]} · {t("b_" + b.status)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-muted mt-1" />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <div className="card">
            <div className="px-5 py-4 border-b border-line section-title">
              <Users size={18} className="text-brand-400" /> {t("recent_workers")}
            </div>
            {favs.length === 0 ? (
              <div className="p-5 text-sm text-muted">Workers you save will appear here for quick re-booking.</div>
            ) : (
              <div className="divide-y divide-line">
                {favs.map((w) => (
                  <div key={w.id} className="p-4 flex items-center gap-3">
                    <Avatar name={w.name} size={42} online={w.available} />
                    <Link href={`/workers/${w.id}`} className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{w.name}</div>
                      <div className="text-xs text-muted truncate">
                        <Stars value={w.rating} size={12} /> {w.last_job && `· ${w.last_job.title}`}
                      </div>
                    </Link>
                    <Link href={`/customer/post?rebook=${w.id}${w.last_job ? `&from=${w.last_job.id}` : ""}`} className="btn-ghost !py-1.5 !px-3 text-sm">
                      <Repeat size={14} /> {t("book_again")}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {user.subscription !== "homecare" && (
            <Link href="/plans" className="card p-5 flex items-start gap-3 hover:border-sun-500/50 transition">
              <Crown size={22} className="text-sun-500 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold">HomeCare Pass · ₹199/month</div>
                <div className="text-sm text-muted">Half service fee, priority matching and saved workers.</div>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </Link>
          )}

          {past.length > 0 && (
            <div className="card">
              <div className="px-5 py-4 border-b border-line section-title">
                <History size={18} className="text-brand-400" /> Past jobs
              </div>
              <div className="divide-y divide-line">
                {past.slice(0, 8).map((j) => (
                  <Link key={j.id} href={`/customer/jobs/${j.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-surface-2">
                    <SkillBadge skill={j.skills[0]} size={32} tone="slate" />
                    <span className="flex-1 text-sm font-medium truncate">{j.title}</span>
                    <JobStatusPill status={j.status} />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
