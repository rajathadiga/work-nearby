"use client";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowLeftRight, Route as RouteIcon, CornerDownRight } from "lucide-react";
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
      .catch((e) => toast("Could not load route", e.message, "error"));
  }, [from, to, buffer, user?.id]);

  if (!user || !meta) return <Loading />;
  const opts = [{ name: "me", label: "My location" }, ...meta.places.map((p) => ({ name: p.name, label: p.name }))];

  return (
    <div>
      <PageTitle icon={RouteIcon} title={t("route_jobs")} sub="Pick up work on your way home" speakText={`${res?.jobs.length || 0} jobs on your way from ${from === "me" ? "your location" : from} to ${to}`} />
      <div className="card p-4 mb-5 flex flex-col lg:flex-row gap-3 lg:items-end">
        <div className="flex-1">
          <div className="label">From</div>
          <select className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
            {opts.map((o) => (
              <option key={o.name} value={o.name}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button
          className="h-11 w-11 shrink-0 rounded-lg border border-line bg-surface grid place-items-center self-center lg:self-end hover:bg-surface-2"
          onClick={() => {
            if (from === "me") return;
            setFrom(to);
            setTo(from);
          }}
          aria-label="swap"
        >
          <ArrowLeftRight size={17} />
        </button>
        <div className="flex-1">
          <div className="label">To</div>
          <select className="input" value={to} onChange={(e) => setTo(e.target.value)}>
            {opts
              .filter((o) => o.name !== "me")
              .map((o) => (
                <option key={o.name} value={o.name}>
                  {o.label}
                </option>
              ))}
          </select>
        </div>
        <div>
          <div className="label">Max distance from road</div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 5].map((b) => (
              <button key={b} onClick={() => setBuffer(b)} className={`chip border !py-2 ${buffer === b ? "bg-brand-600 text-white border-brand-600" : "bg-surface border-line"}`}>
                {b} km
              </button>
            ))}
          </div>
        </div>
      </div>
      {!res ? (
        <Loading />
      ) : (
        <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <div className="font-medium flex items-center gap-2 text-sm">
              {res.from.name} <ArrowRight size={15} /> {res.to.name} · {res.route_km} km · <span className="text-brand-300">{res.jobs.length} jobs on the way</span>
            </div>
            {res.jobs.length === 0 ? (
              <Empty icon={RouteIcon} text="No jobs along this route right now" />
            ) : (
              res.jobs.map((j: any) => (
                <JobCard key={j.id} job={{ ...j, distance_km: j.off_route_km, match: j.match_score ? { score: j.match_score } : undefined }} href={`/worker/jobs/${j.id}`}>
                  <div className="text-xs text-muted mt-2 flex items-center gap-1.5">
                    <CornerDownRight size={13} /> {j.off_route_km} km off your route · {Math.round(j.route_position * 100)}% along the way
                  </div>
                </JobCard>
              ))
            )}
          </div>
          <div className="card p-3 xl:sticky xl:top-24">
            <MapView
              center={[res.from.lat, res.from.lng]}
              height={560}
              fit
              line={[
                [res.from.lat, res.from.lng],
                [res.to.lat, res.to.lng],
              ]}
              markers={[
                { lat: res.from.lat, lng: res.from.lng, kind: "start", popup: res.from.name, size: 26 },
                { lat: res.to.lat, lng: res.to.lng, kind: "flag", popup: res.to.name, size: 32 },
                ...res.jobs.map((j: any) => ({ lat: j.lat, lng: j.lng, kind: (j.urgent ? "urgent" : "job") as any, popup: `<b>${j.title}</b><br/>₹${j.budget} · ${j.off_route_km} km off route` })),
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}
