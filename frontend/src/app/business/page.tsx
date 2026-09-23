"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { PageTitle } from "@/components/ui";

const TYPES = [
  ["hotel", "🏨", "Hotel"],
  ["restaurant", "🍽️", "Restaurant"],
  ["farm", "🚜", "Farm"],
  ["apartment", "🏢", "Apartment"],
  ["construction", "🏗️", "Construction"],
  ["event", "🎪", "Events"],
  ["shop", "🏪", "Shop"],
  ["warehouse", "📦", "Warehouse"],
];

export default function Business() {
  const { t, toast, user } = useApp();
  const [f, setF] = useState({ business_name: user?.business_name || "", business_type: "hotel", contact_phone: user?.phone || "", need: "", workers: 3, frequency: "weekly" });
  const [done, setDone] = useState(false);
  const set = (k: string, v: any) => setF({ ...f, [k]: v });

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <PageTitle title={`🏢 ${t("business")}`} sub="Reliable workers for your business – daily, weekly or for one big day" />
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          ["👥", "Bulk workers", "5, 10, 50 workers for one day"],
          ["🔁", "Recurring shifts", "Same trusted team every week"],
          ["🧾", "One monthly bill", "GST invoice, per worker/day pricing"],
        ].map(([i, a, b]) => (
          <div key={a} className="card p-4">
            <div className="text-3xl">{i}</div>
            <div className="font-extrabold">{a}</div>
            <div className="text-sm text-muted font-semibold">{b}</div>
          </div>
        ))}
      </div>
      {done ? (
        <div className="card p-6 text-center">
          <div className="text-5xl">✅</div>
          <div className="text-xl font-black mt-2">Thank you! Our team will call you within 24 hours.</div>
        </div>
      ) : (
        <div className="card p-5 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {TYPES.map(([id, icon, label]) => (
              <button key={id} onClick={() => set("business_type", id)} className={`tile py-3 ${f.business_type === id ? "tile-on" : ""}`}>
                <span className="text-2xl">{icon}</span>
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>
          <input className="input" placeholder="Business name" value={f.business_name} onChange={(e) => set("business_name", e.target.value)} />
          <input className="input" placeholder="Contact phone" inputMode="numeric" value={f.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
          <textarea className="input" rows={3} placeholder="What work do you need? e.g. 5 housekeeping staff every weekend" value={f.need} onChange={(e) => set("need", e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label">Workers</div>
              <input className="input" type="number" min={1} value={f.workers} onChange={(e) => set("workers", Number(e.target.value))} />
            </div>
            <div>
              <div className="label">How often</div>
              <select className="input" value={f.frequency} onChange={(e) => set("frequency", e.target.value)}>
                <option value="once">One time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          <button
            className="btn-primary btn-lg w-full"
            disabled={!f.business_name || !f.need || !f.contact_phone}
            onClick={async () => {
              await api("/business-requests", { body: f });
              setDone(true);
              toast("🏢 Request sent");
            }}
          >
            Request workers
          </button>
        </div>
      )}
    </div>
  );
}
