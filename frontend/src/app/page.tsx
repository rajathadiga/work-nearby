"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight, ShieldCheck, Languages, Mic, MapPin, Sparkles, MessageCircle, Building2, BriefcaseBusiness, HardHat, Brain, Bike, Star, Users,
  ClipboardList, CircleCheck,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { CatBadge, IconBadge } from "@/lib/icons";
import { SpeakButton } from "@/components/ui";
import MapView from "@/components/MapView";

export default function Landing() {
  const { t, meta, catName, user, login, toast } = useApp();
  const router = useRouter();
  const [heat, setHeat] = useState<any>(null);

  useEffect(() => {
    api("/insights/heatmap").then(setHeat).catch(() => {});
  }, []);

  async function demo(persona: string) {
    try {
      const r = await api(`/demo/login/${persona}`, { body: {} });
      login(r.token, r.user);
      router.push(persona === "admin" ? "/admin" : persona === "worker" ? "/worker" : "/customer");
    } catch (e: any) {
      toast("Server not reachable", e.message, "error");
    }
  }

  const go = (role: string) => router.push(user ? (role === "worker" ? "/worker" : "/customer/post") : `/login?role=${role}`);
  const openJobs = heat?.jobs.filter((j: any) => j.open) || [];
  const freeWorkers = heat?.workers.filter((w: any) => w.available) || [];

  return (
    <div className="space-y-12 -mt-1">
      {/* hero */}
      <section className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center rounded-2xl bg-white border border-line p-6 sm:p-10 lg:p-12">
        <div>
          <span className="chip bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 mb-5">
            <MapPin size={14} /> Udupi · Manipal · Malpe · Brahmavar
          </span>
          <div className="flex items-start gap-3">
            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-bold leading-[1.15] tracking-tight flex-1">{t("hero_title")}</h1>
            <SpeakButton text={`${t("hero_title")}. ${t("need_worker")}. ${t("need_work")}.`} />
          </div>
          <p className="mt-4 text-lg text-muted max-w-xl">{t("app_tagline")} Gardening, repairs, farm work, cleaning, moving and more — matched to verified people within a few kilometres.</p>
          <div className="mt-8 grid sm:grid-cols-2 gap-3 max-w-xl">
            <button onClick={() => go("customer")} className="group text-left rounded-xl bg-brand-600 hover:bg-brand-700 text-white p-4 flex items-center gap-3.5 transition">
              <IconBadge icon={BriefcaseBusiness} tone="white" size={46} />
              <span className="flex-1">
                <span className="block text-lg font-semibold">{t("need_worker")}</span>
                <span className="block text-sm text-white/75">{t("need_worker_sub")}</span>
              </span>
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition" />
            </button>
            <button onClick={() => go("worker")} className="group text-left rounded-xl bg-white border border-line hover:border-brand-400 p-4 flex items-center gap-3.5 transition">
              <IconBadge icon={HardHat} tone="amber" size={46} />
              <span className="flex-1">
                <span className="block text-lg font-semibold">{t("need_work")}</span>
                <span className="block text-sm text-muted">{t("need_work_sub")}</span>
              </span>
              <ArrowRight size={18} className="text-muted group-hover:translate-x-0.5 transition" />
            </button>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-brand-600" /> ID-verified workers
            </span>
            <span className="flex items-center gap-1.5">
              <Languages size={16} className="text-brand-600" /> ಕನ್ನಡ · हिन्दी · English
            </span>
            <span className="flex items-center gap-1.5">
              <Mic size={16} className="text-brand-600" /> Speak instead of typing
            </span>
          </div>
        </div>
        <div className="relative">
          <MapView
            center={[13.345, 74.765]}
            zoom={12}
            height={420}
            markers={[
              ...freeWorkers.slice(0, 40).map((w: any) => ({ lat: w.lat, lng: w.lng, kind: "dot" as const, color: "#059669", size: 10 })),
              ...openJobs.map((j: any) => ({ lat: j.lat, lng: j.lng, kind: "job" as const, size: 26, popup: j.title })),
            ]}
          />
          <div className="absolute left-4 bottom-4 right-4 sm:right-auto grid grid-cols-2 gap-3 z-[400]">
            <div className="card px-4 py-3 shadow-md">
              <div className="text-xs text-muted font-medium flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Workers available now
              </div>
              <div className="text-2xl font-bold">{freeWorkers.length || "–"}</div>
            </div>
            <div className="card px-4 py-3 shadow-md">
              <div className="text-xs text-muted font-medium flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-600" /> Open jobs nearby
              </div>
              <div className="text-2xl font-bold">{openJobs.length || "–"}</div>
            </div>
          </div>
        </div>
      </section>

      {/* categories */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-xl font-semibold">{t("choose_type")}</h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
          {meta?.categories
            .filter((c) => c.id !== "other")
            .map((c) => (
              <Link key={c.id} href={user ? `/customer/post?cat=${c.id}` : `/login?role=customer`} className="tile py-5">
                <CatBadge cat={c.id} size={48} />
                <span className="text-sm">{catName(c)}</span>
              </Link>
            ))}
        </div>
      </section>

      {/* how it works */}
      <section>
        <h2 className="text-xl font-semibold mb-4">{t("how_it_works")}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            [Mic, "step1"],
            [Brain, "step2"],
            [Bike, "step3"],
            [Star, "step4"],
          ].map(([Icon, k]: any, i) => (
            <div key={k} className="card p-5 flex gap-4 items-start">
              <IconBadge icon={Icon} size={44} tone={i % 2 ? "amber" : "brand"} />
              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wider">Step {i + 1}</div>
                <div className="font-semibold mt-0.5">{t(k)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* features */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          [Mic, "Voice first", "Speak in Kannada, Hindi or English. Every screen can read itself aloud."],
          [Sparkles, "AI matching", "Skill, distance, availability, rating and reliability decide who gets the job alert."],
          [ShieldCheck, "Safe and trusted", "ID checks, two-way ratings, check-in/out, SOS and live location sharing."],
          [MapPin, "Hyperlocal", "Work inside your radius — even jobs along your route home."],
          [Users, "Teams on demand", "Book 5 or 50 workers for harvests, events and construction."],
          [MessageCircle, "Works on WhatsApp", "Post or find work by sending a simple WhatsApp message."],
        ].map(([Icon, title, body]: any) => (
          <div key={title} className="card p-5 flex gap-4">
            <IconBadge icon={Icon} size={42} tone="slate" />
            <div>
              <div className="font-semibold">{title}</div>
              <div className="text-sm text-muted mt-0.5">{body}</div>
            </div>
          </div>
        ))}
      </section>

      {/* demo + links */}
      <section className="grid lg:grid-cols-3 gap-4">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-brand-600" />
            <h2 className="text-lg font-semibold">{t("try_demo")}</h2>
          </div>
          <p className="text-sm text-muted mt-1 mb-4">One click, no OTP. Regular login uses your phone number; the demo OTP is 1234.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              ["customer", BriefcaseBusiness, "Priya", "Customer in Manipal"],
              ["worker", HardHat, "Ramesh", "Coconut & garden worker"],
              ["admin", ShieldCheck, "Admin", "Operations dashboard"],
            ].map(([p, Icon, name, sub]: any) => (
              <button key={p} onClick={() => demo(p)} className="flex items-center gap-3 rounded-xl border border-line p-3 text-left hover:border-brand-400 hover:bg-brand-50/40 transition">
                <IconBadge icon={Icon} size={40} tone={p === "worker" ? "amber" : p === "admin" ? "slate" : "brand"} />
                <span>
                  <span className="block font-semibold">{name}</span>
                  <span className="block text-xs text-muted">{sub}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4">
          <Link href="/whatsapp" className="card p-5 flex items-center gap-4 hover:border-brand-300 transition">
            <IconBadge icon={MessageCircle} size={44} tone="brand" />
            <span className="flex-1">
              <span className="block font-semibold">WhatsApp bot</span>
              <span className="text-sm text-muted">Try “Nanage ivattu kelsa beku”</span>
            </span>
            <ArrowRight size={18} className="text-muted" />
          </Link>
          <Link href="/business" className="card p-5 flex items-center gap-4 hover:border-brand-300 transition">
            <IconBadge icon={Building2} size={44} tone="sky" />
            <span className="flex-1">
              <span className="block font-semibold">{t("business")}</span>
              <span className="text-sm text-muted">Hotels, farms, apartments, events</span>
            </span>
            <ArrowRight size={18} className="text-muted" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-line pt-6 flex flex-wrap gap-4 items-center text-sm text-muted">
        <span className="font-semibold text-ink">KaamNear</span>
        <span className="flex items-center gap-1.5">
          <CircleCheck size={15} /> Verified workers
        </span>
        <span className="flex items-center gap-1.5">
          <ClipboardList size={15} /> Transparent pricing
        </span>
        <span className="flex-1" />
        <span>Udupi · Manipal · Malpe · Brahmavar</span>
      </footer>
    </div>
  );
}
