"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck, Languages, Mic, MapPin, Sparkles, MessageCircle, Building2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { SpeakButton } from "@/components/ui";

export default function Landing() {
  const { t, meta, catName, user, login, toast } = useApp();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api("/insights/heatmap").then((h) => setStats({ jobs: h.jobs.filter((j: any) => j.open).length, workers: h.workers.filter((w: any) => w.available).length })).catch(() => {});
  }, []);

  async function demo(persona: string) {
    try {
      const r = await api(`/demo/login/${persona}`, { body: {} });
      login(r.token, r.user);
      router.push(persona === "admin" ? "/admin" : persona === "worker" ? "/worker" : "/customer");
    } catch (e: any) {
      toast("Backend not reachable", e.message);
    }
  }

  const go = (role: string) => router.push(user ? (role === "worker" ? "/worker" : "/customer/post") : `/login?role=${role}`);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 via-brand-600 to-emerald-500 text-white p-6 sm:p-10">
        <div className="absolute -right-10 -top-10 text-[180px] opacity-10 select-none">🤝</div>
        <div className="flex items-start gap-3">
          <h1 className="text-3xl sm:text-5xl font-black leading-tight flex-1">{t("hero_title")}</h1>
          <SpeakButton text={`${t("hero_title")}. ${t("need_worker")}. ${t("need_work")}.`} className="!bg-white/20 !text-white" />
        </div>
        {stats && (
          <div className="mt-4 flex flex-wrap gap-2 font-bold">
            <span className="chip bg-white/15">
              <span className="h-2.5 w-2.5 rounded-full bg-lime-300 animate-pulse" /> {stats.workers} workers available now
            </span>
            <span className="chip bg-white/15">📋 {stats.jobs} jobs open near Udupi</span>
          </div>
        )}
        <div className="mt-7 grid sm:grid-cols-2 gap-4">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => go("customer")} className="text-left rounded-3xl bg-white text-ink p-5 flex items-center gap-4 shadow-xl">
            <span className="text-5xl">🙋</span>
            <span className="flex-1">
              <span className="block text-2xl font-black">{t("need_worker")}</span>
              <span className="block text-muted font-semibold">{t("need_worker_sub")}</span>
            </span>
            <ArrowRight className="text-brand-600" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => go("worker")} className="text-left rounded-3xl bg-sun-500 text-white p-5 flex items-center gap-4 shadow-xl">
            <span className="text-5xl">👷</span>
            <span className="flex-1">
              <span className="block text-2xl font-black">{t("need_work")}</span>
              <span className="block text-white/85 font-semibold">{t("need_work_sub")}</span>
            </span>
            <ArrowRight />
          </motion.button>
        </div>
      </section>

      <section>
        <h2 className="section-title mb-3">{t("choose_type")}</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {meta?.categories
            .filter((c) => c.id !== "other")
            .map((c) => (
              <Link key={c.id} href={user ? `/customer/post?cat=${c.id}` : `/login?role=customer`} className="tile py-5">
                <span className="text-4xl">{c.icon}</span>
                <span className="text-sm">{catName(c)}</span>
              </Link>
            ))}
        </div>
      </section>

      <section>
        <h2 className="section-title mb-3">{t("how_it_works")}</h2>
        <div className="grid sm:grid-cols-4 gap-3">
          {[
            ["🎤", "step1"],
            ["🧠", "step2"],
            ["🛵", "step3"],
            ["⭐", "step4"],
          ].map(([icon, k], i) => (
            <div key={k} className="card p-4 flex sm:flex-col items-center sm:items-start gap-3">
              <span className="h-12 w-12 rounded-2xl bg-sun-100 grid place-items-center text-2xl shrink-0">{icon}</span>
              <span className="font-extrabold">
                <span className="text-sun-600 mr-1">{i + 1}.</span>
                {t(k)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-3">
        {[
          [Mic, "Voice first", "Speak in Kannada, Hindi or English – no typing needed."],
          [Sparkles, "AI matching", "Skill, distance, availability, rating & reliability decide who gets alerted."],
          [ShieldCheck, "Safe & trusted", "ID checks, ratings both ways, check-in/out, SOS and live sharing."],
          [MapPin, "Hyperlocal", "Work within your radius – even jobs along your route home."],
          [Languages, "Your language", "Every screen in ಕನ್ನಡ, हिन्दी, English with read-aloud 🔊"],
          [MessageCircle, "WhatsApp too", "Post or find work by just sending a WhatsApp message."],
        ].map(([Icon, title, body]: any) => (
          <div key={title} className="card p-4 flex gap-3">
            <Icon className="text-brand-600 shrink-0" />
            <div>
              <div className="font-extrabold">{title}</div>
              <div className="text-sm text-muted font-semibold">{body}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="card p-5">
        <h2 className="section-title">🚀 {t("try_demo")}</h2>
        <p className="text-sm text-muted font-semibold mb-3">One tap – no OTP. (Real login uses phone + OTP; demo OTP is 1234.)</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <button onClick={() => demo("customer")} className="btn-ghost justify-start">
            🙋 Priya – customer in Manipal
          </button>
          <button onClick={() => demo("worker")} className="btn-ghost justify-start">
            👷 Ramesh – coconut & garden worker
          </button>
          <button onClick={() => demo("admin")} className="btn-ghost justify-start">
            🛡️ Admin dashboard
          </button>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 gap-3">
        <Link href="/whatsapp" className="card p-5 flex items-center gap-4 hover:shadow-lg transition">
          <span className="h-14 w-14 rounded-2xl bg-[#25D366] text-white grid place-items-center text-3xl">💬</span>
          <span className="flex-1">
            <span className="block font-black text-lg">WhatsApp bot</span>
            <span className="text-sm text-muted font-semibold">Try: “Nanage ivattu kelsa beku”</span>
          </span>
          <ArrowRight />
        </Link>
        <Link href="/business" className="card p-5 flex items-center gap-4 hover:shadow-lg transition">
          <span className="h-14 w-14 rounded-2xl bg-sky-600 text-white grid place-items-center">
            <Building2 size={28} />
          </span>
          <span className="flex-1">
            <span className="block font-black text-lg">{t("business")}</span>
            <span className="text-sm text-muted font-semibold">Hotels, farms, apartments, events – bulk & recurring workers</span>
          </span>
          <ArrowRight />
        </Link>
      </section>
      <footer className="text-center text-sm text-muted font-semibold pb-6">KaamNear • Udupi • Manipal • Malpe • Brahmavar</footer>
    </div>
  );
}
