"use client";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
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
    <div className="space-y-5">
      <PageTitle
        title={`🔥 ${t("demand")}`}
        sub="Which work pays more near you"
        speakText={`Skills in demand near you: ${ins.trends
          .slice(0, 3)
          .map((x: any) => x.name)
          .join(", ")}`}
      />

      <div className="card p-4">
        <h2 className="section-title mb-2">🗺️ Where is the work? (last 30 days)</h2>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          <button onClick={() => setFilter("")} className={`chip shrink-0 ${!filter ? "bg-brand-600 text-white" : "bg-gray-100"}`}>
            All
          </button>
          {meta?.categories
            .filter((c) => c.id !== "other")
            .map((c) => (
              <button key={c.id} onClick={() => setFilter(c.id)} className={`chip shrink-0 ${filter === c.id ? "bg-brand-600 text-white" : "bg-gray-100"}`}>
                {c.icon} {catName(c)}
              </button>
            ))}
        </div>
        <MapView
          center={[13.34, 74.75]}
          zoom={11}
          height={340}
          circles={[
            ...heat.jobs.map((j: any) => ({ lat: j.lat, lng: j.lng, radius: j.open ? 900 : 600, color: j.open ? "#ef4444" : "#f97316", opacity: j.open ? 0.28 : 0.12 })),
          ]}
          markers={heat.workers.filter((w: any) => w.available).map((w: any) => ({ lat: w.lat, lng: w.lng, emoji: "🟢", size: 12 }))}
        />
        <div className="flex gap-4 text-xs font-bold text-muted mt-2">
          <span>🔴 Open jobs</span>
          <span>🟠 Past jobs</span>
          <span>🟢 Available workers</span>
        </div>
        <div className="mt-3 space-y-1.5">
          {heat.areas.slice(0, 6).map((a: any) => (
            <div key={a.name} className="flex items-center gap-2 text-sm">
              <span className="w-28 font-bold">{a.name}</span>
              <span className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                <span className="block h-full rounded-full bg-red-500" style={{ width: `${(a.open_jobs / maxW) * 100}%` }} />
              </span>
              <span className="w-40 text-right font-semibold text-muted">
                {a.open_jobs} jobs • {a.available_workers} workers
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="section-title mb-3">📈 Skills in demand near you</h2>
        <div className="space-y-2">
          {ins.trends.map((x: any) => (
            <div key={x.skill} className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3">
              <span className="text-3xl">{x.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold">{x.name}</div>
                <div className="text-xs text-muted font-semibold">
                  {x.jobs} jobs (2 weeks) • {x.workers} workers • ~{money(x.avg_rate)}/{x.unit}
                </div>
              </div>
              <span className={`chip ${x.change_pct >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {x.change_pct >= 0 ? "▲" : "▼"} {Math.abs(x.change_pct)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {ins.suggestions.length > 0 && (
        <div className="card p-4 bg-gradient-to-br from-sun-50 to-white">
          <h2 className="section-title mb-1">💡 Learn these to get more work</h2>
          <p className="text-sm text-muted font-semibold mb-3">Based on your current skills and local demand</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {ins.suggestions.map((s: any) => (
              <div key={s.skill} className="rounded-2xl bg-white border border-sun-200 p-3 flex gap-3">
                <span className="text-3xl">{s.icon}</span>
                <div>
                  <div className="font-extrabold">{s.name}</div>
                  <div className="text-xs text-muted font-semibold">{s.why}</div>
                  <div className="text-sm font-bold text-brand-700">
                    Earn ~{money(s.avg_rate)}/{s.unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4">
        <h2 className="section-title mb-3">🚀 Your growth path</h2>
        <div className="space-y-2">
          {ins.growth.map((g: any, i: number) => (
            <div key={g.key} className="flex items-center gap-3">
              <span className={`h-9 w-9 rounded-full grid place-items-center font-black ${g.done ? "bg-brand-600 text-white" : "bg-gray-100 text-muted"}`}>{g.done ? <Check size={18} /> : i + 1}</span>
              <span className={`font-bold ${g.done ? "" : "text-muted"}`}>{g.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted font-semibold mt-3">Informal worker → digital profile → verified skills → work history → trusted worker → higher-paying jobs.</p>
      </div>

      {demand && (
        <div className="card p-4">
          <h2 className="section-title mb-3">📍 Local work intelligence</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {Object.entries(demand.by_area)
              .filter(([, v]: any) => v.length)
              .map(([area, items]: any) => (
                <div key={area} className="rounded-2xl bg-gray-50 p-3">
                  <div className="font-extrabold">{area}</div>
                  <div className="text-sm font-semibold text-muted">
                    High demand: {items.map((i: any) => `${i.icon} ${i.name}`).join(", ")}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
