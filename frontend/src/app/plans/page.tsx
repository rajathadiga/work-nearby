"use client";
import { Check } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { useRequireUser, Loading, PageTitle } from "@/components/ui";

const PLANS = [
  { id: "free", name: "Free", price: 0, icon: "🌱", for: "Everyone", perks: ["Post jobs & get matched", "Standard job alerts", "5% service fee"] },
  { id: "pro", name: "Worker Pro", price: 99, icon: "👷", for: "Workers", perks: ["Job alerts before others", "PRO badge on profile", "Higher visibility in matching", "More job recommendations"] },
  { id: "homecare", name: "HomeCare Pass", price: 199, icon: "🏠", for: "Customers", perks: ["Half service fee on every job", "Priority matching", "Saved workers & recurring jobs", "Faster support"] },
];

export default function Plans() {
  const user = useRequireUser();
  const { refreshUser, toast } = useApp();
  if (!user) return <Loading />;
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <PageTitle title="⭐ Plans" sub="Simple monthly plans. Cancel any time." />
      <div className="grid sm:grid-cols-3 gap-3">
        {PLANS.map((p) => {
          const active = user.subscription === p.id;
          return (
            <div key={p.id} className={`card p-5 flex flex-col ${active ? "ring-4 ring-brand-500" : ""}`}>
              <div className="text-4xl">{p.icon}</div>
              <div className="font-black text-xl mt-2">{p.name}</div>
              <div className="text-sm text-muted font-bold">{p.for}</div>
              <div className="text-3xl font-black mt-2">
                ₹{p.price}
                <span className="text-sm text-muted">/month</span>
              </div>
              <ul className="mt-3 space-y-1 flex-1">
                {p.perks.map((x) => (
                  <li key={x} className="flex gap-2 font-semibold text-sm">
                    <Check size={18} className="text-brand-600 shrink-0" /> {x}
                  </li>
                ))}
              </ul>
              <button
                className={`${active ? "btn-ghost" : "btn-primary"} w-full mt-4`}
                disabled={active}
                onClick={async () => {
                  await api("/subscribe", { body: { plan: p.id } });
                  await refreshUser();
                  toast(p.price ? `🎉 ${p.name} activated` : "Plan changed", p.price ? `₹${p.price} via UPI (demo)` : "");
                }}
              >
                {active ? "✓ Current plan" : p.price ? `Get for ₹${p.price}` : "Switch"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
