"use client";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpDown } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { useRequireUser, Loading, PageTitle, Empty } from "@/components/ui";
import { JobCard } from "@/components/cards";
import MapView from "@/components/MapView";

export default function RouteJobs() {
  const user = useRequireUser("worker");
  const { t, meta, toast } = useApp();
  const [from, setFrom] = useState("me");
  const [to, setTo] = useState("Udupi");
  const [buffer, setBuffer] = useState(3);
  const [res, setRes] = useState<any>(null);

  useEffect(() => {
    if (!user?.worker) return;
    api(`/worker/route?from_place=${from}&to_place=${to}&buffer_km=${buffer}`)
      .then(setRes)
      .catch((e) => toast("❌", e.message));
  }, [from, to, buffer, user?.id]);

  if (!user || !meta) return <Loading />;
  const opts = [{ name: "me", label: "📍 My location" }, ...meta.places.map((p) => ({ name: p.name, label: p.name }))];

  return (
    <div className="space-y-4">
      <PageTitle title={`🛣️ ${t("route_jobs")}`} sub="Earn on your way home" speakText={`${res?.jobs.length || 0} jobs on your way from ${from === "me" ? "your location" : from} to ${to}`} />
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <select className="input !py-2" value={from} onChange={(e) => setFrom(e.target.value)}>
            {opts.map((o) => (
              <option key={o.name} value={o.name}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            className="h-11 w-11 shrink-0 rounded-full bg-gray-100 grid place-items-center"
            onClick={() => {
              if (from === "me") return;
              setFrom(to);
              setTo(from);
            }}
            aria-label="swap"
          >
            <ArrowUpDown size={18} />
          </button>
          <select className="input !py-2" value={to} onChange={(e) => setTo(e.target.value)}>
            {opts
              .filter((o) => o.name !== "me")
              .map((o) => (
                <option key={o.name} value={o.name}>
                  {o.label}
                </option>
              ))}
          </select>
        </div>
        <div className="flex gap-2 items-center text-sm font-bold">
          How far from the road:
          {[1, 2, 3, 5].map((b) => (
            <button key={b} onClick={() => setBuffer(b)} className={`chip ${buffer === b ? "bg-brand-600 text-white" : "bg-gray-100"}`}>
              {b} km
            </button>
          ))}
        </div>
      </div>
      {!res ? (
        <Loading />
      ) : (
        <>
          <MapView
            center={[res.from.lat, res.from.lng]}
            height={300}
            fit
            line={[
              [res.from.lat, res.from.lng],
              [res.to.lat, res.to.lng],
            ]}
            markers={[
              { lat: res.from.lat, lng: res.from.lng, emoji: "🟢", popup: res.from.name, size: 22 },
              { lat: res.to.lat, lng: res.to.lng, emoji: "🏁", popup: res.to.name, size: 30 },
              ...res.jobs.map((j: any) => ({ lat: j.lat, lng: j.lng, emoji: j.icon, popup: `<b>${j.title}</b><br/>₹${j.budget} • ${j.off_route_km} km off route` })),
            ]}
          />
          <div className="font-extrabold flex items-center gap-2">
            {res.from.name} <ArrowRight size={16} /> {res.to.name} • {res.route_km} km • {res.jobs.length} jobs on the way
          </div>
          {res.jobs.length === 0 ? (
            <Empty icon="🛣️" text="No jobs along this route right now" />
          ) : (
            res.jobs.map((j: any) => (
              <JobCard key={j.id} job={{ ...j, distance_km: j.off_route_km, match: j.match_score ? { score: j.match_score } : undefined }} href={`/worker/jobs/${j.id}`}>
                <div className="text-xs font-bold text-sun-600 mt-2">↪ {j.off_route_km} km off your route • {Math.round(j.route_position * 100)}% along the way</div>
              </JobCard>
            ))
          )}
        </>
      )}
    </div>
  );
}
