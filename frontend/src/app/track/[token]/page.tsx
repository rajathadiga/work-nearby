"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Phone, Siren, MapPin, Clock, Check } from "lucide-react";
import { api } from "@/lib/api";
import MapView from "@/components/MapView";
import { Logo } from "@/components/Shell";

const LABEL: Record<string, string> = {
  confirmed: "Job confirmed — not started yet",
  on_the_way: "On the way to work",
  arrived: "Reached the work place — working",
  completed: "Work finished",
  paid: "Work finished and paid",
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

  if (err) return <div className="p-8 text-center font-medium">{err}</div>;
  if (!d) return <div className="p-8 text-center text-muted">Loading…</div>;
  return (
    <div className="min-h-screen bg-paper">
      <header className="h-16 bg-white border-b border-line px-4 sm:px-8 flex items-center">
        <Logo />
        <span className="ml-3 text-sm text-muted">· Live safety tracking</span>
      </header>
      <div className="p-4 sm:p-8 grid lg:grid-cols-[380px_minmax(0,1fr)] gap-6">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="text-2xl font-bold">{d.worker.name}</div>
            <div className="text-brand-700 font-medium mt-1">{LABEL[d.status]}</div>
            {d.status === "on_the_way" && (
              <div className="text-sm mt-1 flex items-center gap-1.5">
                <Clock size={14} /> ETA {d.tracking.eta_min} min · {d.tracking.distance_km} km left
              </div>
            )}
            <div className="text-sm text-muted mt-3 space-y-1">
              <div className="flex items-center gap-1.5"><MapPin size={14} /> {d.job.title} · {d.job.address}</div>
              <div>Date {d.job.date} · Customer {d.customer.name}</div>
              {d.check_in_at && <div className="flex items-center gap-1.5"><Check size={14} /> Checked in {new Date(d.check_in_at + "Z").toLocaleTimeString()}</div>}
              {d.check_out_at && <div className="flex items-center gap-1.5"><Check size={14} /> Checked out {new Date(d.check_out_at + "Z").toLocaleTimeString()}</div>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <a href={`tel:${d.worker.phone}`} className="btn-primary">
              <Phone size={16} /> Call {d.worker.name.split(" ")[0]}
            </a>
            <a href="tel:112" className="btn-danger">
              <Siren size={16} /> Call 112
            </a>
          </div>
        </div>
        <div className="card p-3">
          <MapView
            center={[d.job.lat, d.job.lng]}
            height="70vh"
            fit
            markers={[
              { lat: d.job.lat, lng: d.job.lng, kind: "home", size: 34, popup: "Work place" },
              { lat: d.tracking.lat, lng: d.tracking.lng, kind: d.status === "on_the_way" ? "vehicle" : "worker", size: 34, popup: d.worker.name },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
