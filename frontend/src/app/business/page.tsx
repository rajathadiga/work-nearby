"use client";
import { useState } from "react";
import { Building2, Hotel, UtensilsCrossed, Tractor, Building, HardHat, PartyPopper, Store, Warehouse, UsersRound, Repeat, Receipt, CircleCheck, Send } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { IconBadge } from "@/lib/icons";
import { PageTitle } from "@/components/ui";

const TYPES = [
  ["hotel", Hotel, "Hotel"],
  ["restaurant", UtensilsCrossed, "Restaurant"],
  ["farm", Tractor, "Farm"],
  ["apartment", Building, "Apartment"],
  ["construction", HardHat, "Construction"],
  ["event", PartyPopper, "Events"],
  ["shop", Store, "Shop"],
  ["warehouse", Warehouse, "Warehouse"],
] as const;

export default function Business() {
  const { t, toast, user } = useApp();
  const [f, setF] = useState({ business_name: user?.business_name || "", business_type: "hotel", contact_phone: user?.phone || "", need: "", workers: 3, frequency: "weekly" });
  const [done, setDone] = useState(false);
  const set = (k: string, v: any) => setF({ ...f, [k]: v });

  return (
    <div>
      <PageTitle icon={Building2} title={t("business")} sub="Reliable workers for your business — daily, weekly or for one big day" />
      <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6 items-start">
        <div className="space-y-4">
          {[
            [UsersRound, "Bulk workers", "5, 10 or 50 workers for a single day — harvests, events, stock-taking."],
            [Repeat, "Recurring shifts", "The same trusted team every week, automatically scheduled."],
            [Receipt, "One monthly bill", "GST invoice with simple per-worker-per-day pricing."],
          ].map(([Icon, a, b]: any) => (
            <div key={a} className="card p-5 flex gap-4">
              <IconBadge icon={Icon} size={44} />
              <div>
                <div className="font-semibold">{a}</div>
                <div className="text-sm text-muted">{b}</div>
              </div>
            </div>
          ))}
        </div>
        {done ? (
          <div className="card p-10 text-center">
            <CircleCheck size={44} className="text-brand-600 mx-auto" />
            <div className="text-xl font-semibold mt-3">Thank you</div>
            <div className="text-muted">Our team will call you within 24 hours.</div>
          </div>
        ) : (
          <div className="card p-6 space-y-5">
            <div>
              <div className="label">Type of business</div>
              <div className="grid grid-cols-4 gap-2.5">
                {TYPES.map(([id, Icon, label]) => (
                  <button key={id} onClick={() => set("business_type", id)} className={`tile py-3 ${f.business_type === id ? "tile-on" : ""}`}>
                    <Icon size={22} className="text-brand-600" />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="label">Business name</div>
                <input className="input" value={f.business_name} onChange={(e) => set("business_name", e.target.value)} />
              </div>
              <div>
                <div className="label">Contact phone</div>
                <input className="input" inputMode="numeric" value={f.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
              </div>
            </div>
            <div>
              <div className="label">What work do you need?</div>
              <textarea className="input" rows={3} placeholder="e.g. 5 housekeeping staff every weekend" value={f.need} onChange={(e) => set("need", e.target.value)} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="label">Number of workers</div>
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
                toast("Request sent", "", "success");
              }}
            >
              <Send size={17} /> Request workers
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
