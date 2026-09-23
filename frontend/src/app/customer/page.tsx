"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Crown } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { greetingKey } from "@/lib/i18n";
import { useRequireUser, Loading, Empty, Avatar, Stars, SpeakButton, JobStatusPill, money, prettyDate, VoiceBox } from "@/components/ui";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-black">
            {t(greetingKey())}, {firstName} 👋
          </h1>
          <p className="text-muted font-semibold">{t("what_help")}</p>
        </div>
        <SpeakButton text={`${t(greetingKey())} ${firstName}. ${t("what_help")}. ${active.length} ${t("active_jobs")}.`} />
      </div>

      <div className="card p-4">
        <VoiceBox
          value={quick}
          onChange={setQuick}
          rows={2}
          placeholder="e.g. Need someone to clean my garden tomorrow morning"
          onFinal={(v) => v.trim().length > 8 && router.push(`/customer/post?text=${encodeURIComponent(v)}`)}
        />
        <button className="btn-primary btn-lg w-full mt-3" onClick={() => router.push(`/customer/post${quick ? `?text=${encodeURIComponent(quick)}` : ""}`)}>
          <Plus /> {t("post_job")}
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {meta?.categories
          .filter((c) => c.id !== "other")
          .map((c) => (
            <Link key={c.id} href={`/customer/post?cat=${c.id}`} className="tile py-3">
              <span className="text-3xl">{c.icon}</span>
              <span className="text-xs">{catName(c)}</span>
            </Link>
          ))}
      </div>

      <section>
        <h2 className="section-title mb-3">📋 {t("active_jobs")}</h2>
        {jobs === null ? (
          <Loading />
        ) : active.length === 0 ? (
          <Empty icon="📝" text={t("empty")} />
        ) : (
          <div className="space-y-3">
            {active.map((j) => (
              <Link key={j.id} href={`/customer/jobs/${j.id}`} className="card p-4 flex items-center gap-3 hover:shadow-lg transition">
                <span className="h-14 w-14 rounded-2xl bg-brand-50 grid place-items-center text-3xl shrink-0">{j.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold truncate">{j.title}</div>
                  <div className="text-sm text-muted font-semibold">
                    {prettyDate(j.date, t)} • {money(j.budget)}
                    {j.workers_required > 1 && ` × ${j.workers_required}`}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 items-center">
                    <JobStatusPill status={j.status} />
                    {j.status === "open" && <span className="text-xs font-bold text-muted">🔔 {j.match_count} workers matched</span>}
                    {j.bookings.map((b: any) => (
                      <span key={b.id} className="chip !text-xs bg-gray-100">
                        👷 {b.worker_name.split(" ")[0]} · {t("b_" + b.status)}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-2xl text-muted">›</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {favs.length > 0 && (
        <section>
          <h2 className="section-title mb-3">❤️ {t("recent_workers")}</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {favs.map((w) => (
              <div key={w.id} className="card p-4 w-56 shrink-0">
                <Link href={`/workers/${w.id}`} className="flex items-center gap-3">
                  <Avatar name={w.name} online={w.available} />
                  <div className="min-w-0">
                    <div className="font-extrabold truncate">{w.name}</div>
                    <Stars value={w.rating} />
                  </div>
                </Link>
                {w.last_job && <div className="text-xs text-muted font-semibold mt-2 truncate">Last: {w.last_job.title}</div>}
                <Link
                  href={`/customer/post?rebook=${w.id}${w.last_job ? `&from=${w.last_job.id}` : ""}`}
                  className="btn-sun w-full mt-3 !py-2 text-sm"
                >
                  🔁 {t("book_again")}
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {user.subscription !== "homecare" && (
        <Link href="/plans" className="card p-4 flex items-center gap-3 bg-gradient-to-r from-amber-50 to-white">
          <Crown className="text-amber-500" />
          <div className="flex-1">
            <div className="font-extrabold">HomeCare Pass – ₹199/month</div>
            <div className="text-sm text-muted font-semibold">Half service fee • priority matching • saved workers</div>
          </div>
          <span className="text-muted">›</span>
        </Link>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="section-title mb-3">🕘 Past jobs</h2>
          <div className="space-y-2">
            {past.slice(0, 8).map((j) => (
              <Link key={j.id} href={`/customer/jobs/${j.id}`} className="card p-3 flex items-center gap-3">
                <span className="text-2xl">{j.icon}</span>
                <span className="flex-1 font-bold truncate">{j.title}</span>
                <JobStatusPill status={j.status} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
