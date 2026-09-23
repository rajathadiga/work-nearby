"use client";
import { Check, Crown, Sprout, HardHat, House } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { IconBadge } from "@/lib/icons";
import { useRequireUser, Loading, PageTitle } from "@/components/ui";

const PLANS = [
  { id: "free", name: "Free", price: 0, icon: Sprout, tone: "slate", for: "Everyone", perks: ["Post jobs and get matched", "Standard job alerts", "5% service fee per job"] },
  { id: "pro", name: "Worker Pro", price: 99, icon: HardHat, tone: "amber", for: "Workers", perks: ["Job alerts before others", "PRO badge on your profile", "Higher visibility in matching", "More job recommendations"] },
  { id: "homecare", name: "HomeCare Pass", price: 199, icon: House, tone: "brand", for: "Customers", perks: ["Half service fee on every job", "Priority matching", "Saved workers and recurring jobs", "Faster support"] },
];

export default function Plans() {
  const user = useRequireUser();
  const { refreshUser, toast } = useApp();
  if (!user) return <Loading />;
  return (
    <div>
      <PageTitle icon={Crown} title="Plans" sub="Simple monthly plans. Cancel any time." />
      <div className="grid md:grid-cols-3 gap-5 max-w-6xl">
        {PLANS.map((p) => {
          const active = user.subscription === p.id;
          return (
            <div key={p.id} className={`card p-6 flex flex-col ${active ? "border-brand-500 ring-2 ring-brand-500" : ""} ${p.id === "homecare" ? "md:-translate-y-1 shadow-md" : ""}`}>
              <IconBadge icon={p.icon} size={46} tone={p.tone} />
              <div className="font-semibold text-lg mt-4">{p.name}</div>
              <div className="text-sm text-muted">For {p.for.toLowerCase()}</div>
              <div className="text-3xl font-bold mt-3">
                ₹{p.price}
                <span className="text-sm text-muted font-normal"> / month</span>
              </div>
              <ul className="mt-5 space-y-2.5 flex-1">
                {p.perks.map((x) => (
                  <li key={x} className="flex gap-2.5 text-sm">
                    <Check size={17} className="text-brand-600 shrink-0" /> {x}
                  </li>
                ))}
              </ul>
              <button
                className={`${active ? "btn-ghost" : "btn-primary"} w-full mt-6`}
                disabled={active}
                onClick={async () => {
                  await api("/subscribe", { body: { plan: p.id } });
                  await refreshUser();
                  toast(p.price ? `${p.name} activated` : "Plan changed", p.price ? `₹${p.price} paid via UPI (demo)` : "", "success");
                }}
              >
                {active ? "Current plan" : p.price ? `Choose ${p.name}` : "Switch to Free"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
