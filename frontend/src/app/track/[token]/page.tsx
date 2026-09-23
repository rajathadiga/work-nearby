"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import MapView from "@/components/MapView";

const LABEL: Record<string, string> = {
  confirmed: "Job confirmed – not started yet",
  on_the_way: "🛵 On the way to work",
  arrived: "📍 Reached the work place – working",
  completed: "✅ Work finished",
  paid: "✅ Work finished & paid",
  cancelled: "Cancelled",
  no_show: "Did not go",
};

export default function Track() {
  const { token } = useParams<{ token: string }>();
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    const load = () =>
      api(`/track/${token}`)
        .then(setD)
        .catch((e) => setErr(e.message));
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [token]);

  if (err) return <div className="p-8 text-center font-bold">{err}</div>;
  if (!d) return <div className="p-8 text-center font-bold">Loading…</div>;
  return (
    <div className="min-h-screen bg-paper p-4 max-w-lg mx-auto space-y-3">
      <div className="font-black text-xl">
        🤝 Kaam<span className="text-sun-500">Near</span> • Live safety tracking
      </div>
      <div className="card p-4">
        <div className="text-2xl font-black">{d.worker.name}</div>
        <div className="text-lg font-bold text-brand-700">{LABEL[d.status]}</div>
        {d.status === "on_the_way" && <div className="font-semibold">ETA {d.tracking.eta_min} min • {d.tracking.distance_km} km left</div>}
        <div className="text-sm text-muted font-semibold mt-1">
          Work: {d.job.title} • {d.job.address} • {d.job.date} • Customer: {d.customer.name}
        </div>
        {d.check_in_at && <div className="text-sm font-semibold">Checked in: {new Date(d.check_in_at + "Z").toLocaleTimeString()}</div>}
        {d.check_out_at && <div className="text-sm font-semibold">Checked out: {new Date(d.check_out_at + "Z").toLocaleTimeString()}</div>}
      </div>
      <MapView
        center={[d.job.lat, d.job.lng]}
        height={360}
        fit
        markers={[
          { lat: d.job.lat, lng: d.job.lng, emoji: "🏠", size: 32, popup: "Work place" },
          { lat: d.tracking.lat, lng: d.tracking.lng, emoji: "🧑", size: 32, popup: d.worker.name },
        ]}
      />
      <div className="grid grid-cols-2 gap-2">
        <a href={`tel:${d.worker.phone}`} className="btn-primary">
          📞 Call {d.worker.name.split(" ")[0]}
        </a>
        <a href="tel:112" className="btn-danger">
          🆘 Call 112
        </a>
      </div>
    </div>
  );
}
