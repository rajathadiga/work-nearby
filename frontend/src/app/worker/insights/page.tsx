"use client";
import { useEffect, useState } from "react";
import { Check, TrendingUp, TrendingDown, Map as MapIcon, Lightbulb, Rocket, MapPinned } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { SkillBadge, catIconFor } from "@/lib/icons";
import { useRequireUser, Loading, PageTitle, money } from "@/components/ui";
import MapView from "@/components/MapView";

export default function Insights() {
  const user = useRequireUser();
  const { t, meta, catName } = useApp();
  const [ins, setIns] = useState<any>(null);
  const [heat, setHeat] = useState<any>(null);
  const [demand, setDemand] = useState<any>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!user) return;
    api("/worker/insights").then(setIns);
    api(`/insights/demand?lat=${user.lat}&lng=${user.lng}`).then(setDemand);
  }, [user?.id]);
  useEffect(() => {
    api(`/insights/heatmap${filter ? `?skill=${filter}` : ""}`).then(setHeat);
  }, [filter]);

  if (!user || !ins || !heat) return <Loading />;
  const maxW = Math.max(1, ...heat.areas.map((a: any) => a.open_jobs));

  return (
    <div className="space-y-6">
      <PageTitle
        icon={TrendingUp}
        title={t("demand")}
        sub="Which work pays more near you"
        speakText={`Skills in demand near you: ${ins.trends.slice(0, 3).map((x: any) => x.name).join(", ")}`}
      />

      <div className="grid xl:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
        <div className="card p-5">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="section-title flex-1">
              <MapIcon size={18} className="text-brand-400" /> Where the work is (last 30 days)
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3">
            <button onClick={() => setFilter("")} className={`chip shrink-0 border ${!filter ? "bg-brand-600 text-white border-brand-600" : "bg-surface border-line"}`}>
              All
            </button>
            {meta?.categories
              .filter((c) => c.id !== "other")
              .map((c) => {
                const I = catIconFor(c.id);
                return (
                  <button key={c.id} onClick={() => setFilter(c.id)} className={`chip shrink-0 border ${filter === c.id ? "bg-brand-600 text-white border-brand-600" : "bg-surface border-line hover:border-brand-500/40"}`}>
                    <I size={14} /> {catName(c)}
                  </button>
                );
              })}
          </div>
          <MapView
            center={[13.34, 74.76]}
            zoom={11}
            height={460}
            circles={heat.jobs.map((j: any) => ({ lat: j.lat, lng: j.lng, radius: j.open ? 900 : 600, color: j.open ? "#be123c" : "#c2842b", opacity: j.open ? 0.22 : 0.1 }))}
            markers={heat.workers.filter((w: any) => w.available).map((w: any) => ({ lat: w.lat, lng: w.lng, kind: "dot" as const, color: "#059669", size: 9 }))}
          />
          <div className="flex flex-wrap gap-5 text-xs text-muted mt-3">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-rose-700/40" /> Open jobs</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-amber-600/30" /> Past jobs</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Available workers</span>
          </div>
        </div>

        <div className="card p-5">
          <div className="section-title mb-4">Busiest areas right now</div>
          <div className="space-y-3.5">
            {heat.areas.slice(0, 8).map((a: any) => (
              <div key={a.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-muted">
                    {a.open_jobs} jobs · {a.available_workers} workers
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                  <div className="h-full rounded-full bg-rose-600/80" style={{ width: `${(a.open_jobs / maxW) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-6 items-start">
        <div className="card">
          <div className="px-5 py-4 border-b border-line section-title">
            <TrendingUp size={18} className="text-brand-400" /> Skills in demand near you
          </div>
          <div className="divide-y divide-line">
            {ins.trends.map((x: any) => (
              <div key={x.skill} className="px-5 py-3 flex items-center gap-3">
                <SkillBadge skill={x.skill} size={38} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{x.name}</div>
                  <div className="text-xs text-muted">
                    {x.jobs} jobs in 2 weeks · {x.workers} workers · ~{money(x.avg_rate)}/{x.unit}
                  </div>
                </div>
                <span className={`chip !text-xs ${x.change_pct >= 0 ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
                  {x.change_pct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {Math.abs(x.change_pct)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {ins.suggestions.length > 0 && (
            <div className="card">
              <div className="px-5 py-4 border-b border-line">
                <div className="section-title">
                  <Lightbulb size={18} className="text-sun-500" /> Learn these to get more work
                </div>
                <div className="text-sm text-muted">Based on your current skills and local demand</div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 p-5">
                {ins.suggestions.map((s: any) => (
                  <div key={s.skill} className="rounded-xl border border-line p-3.5 flex gap-3">
                    <SkillBadge skill={s.skill} size={38} tone="amber" />
                    <div className="min-w-0">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted">{s.why}</div>
                      <div className="text-sm font-semibold text-brand-300 mt-0.5">
                        ~{money(s.avg_rate)}/{s.unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-5">
            <div className="section-title mb-4">
              <Rocket size={18} className="text-brand-400" /> Your growth path
            </div>
            <ol className="relative border-l-2 border-line ml-4 space-y-4">
              {ins.growth.map((g: any, i: number) => (
                <li key={g.key} className="pl-6 relative">
                  <span className={`absolute -left-[15px] top-0 h-7 w-7 rounded-full grid place-items-center text-xs font-semibold ${g.done ? "bg-brand-600 text-white" : "bg-surface border-2 border-line text-muted"}`}>
                    {g.done ? <Check size={14} /> : i + 1}
                  </span>
                  <span className={`font-medium ${g.done ? "" : "text-muted"}`}>{g.label}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {demand && (
        <div className="card p-5">
          <div className="section-title mb-4">
            <MapPinned size={18} className="text-brand-400" /> Local work intelligence
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(demand.by_area)
              .filter(([, v]: any) => v.length)
              .map(([area, items]: any) => (
                <div key={area} className="rounded-xl border border-line p-4">
                  <div className="font-semibold mb-2">{area}</div>
                  <div className="space-y-1.5">
                    {items.map((i: any) => (
                      <div key={i.skill} className="flex items-center gap-2 text-sm text-muted">
                        <SkillBadge skill={i.skill} size={22} tone="slate" /> {i.name}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
