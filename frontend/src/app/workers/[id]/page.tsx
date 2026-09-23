"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Heart, Phone, MapPin, BadgeCheck, Smartphone, IdCard, ScanFace, UsersRound, Star, MessageSquareQuote, Wrench, ShieldCheck, Wallet } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { SkillBadge } from "@/lib/icons";
import { useRequireUser, Loading, Avatar, Stars, LevelBadge, SpeakButton, money } from "@/components/ui";

const LEVEL_LABEL: Record<string, string> = { expert: "Expert", advanced: "Advanced", intermediate: "Intermediate", beginner: "Beginner" };
const LEVEL_W: Record<string, number> = { expert: 100, advanced: 78, intermediate: 55, beginner: 30 };

export default function Passport() {
  const user = useRequireUser();
  const { id } = useParams<{ id: string }>();
  const { t, skillName, toast } = useApp();
  const [w, setW] = useState<any>(null);

  const load = () => api(`/workers/${id}`).then(setW);
  useEffect(() => {
    if (user) load();
  }, [user?.id, id]);

  if (!user || !w) return <Loading />;
  const rel = w.reliability;
  const isMe = user.id === w.id;

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="card overflow-hidden">
        <div className="glow-panel !border-0 px-6 py-7 sm:px-8 text-white flex flex-wrap items-center gap-5">
          <div className="ring-4 ring-white/20 rounded-full">
            <Avatar name={w.name} size={84} online={w.available} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold tracking-widest text-white/60 uppercase">Digital {t("passport")}</div>
            <h1 className="text-2xl sm:text-3xl font-bold mt-0.5">{w.name}</h1>
            <div className="text-white/80 flex items-center gap-1.5 mt-0.5">
              <MapPin size={15} /> {w.area} {w.distance_km !== undefined && !isMe && `· ${w.distance_km} km away`}
            </div>
            <div className="mt-2 flex gap-1.5 flex-wrap">
              <LevelBadge level={w.level} />
              {w.subscription === "pro" && <span className="chip !text-xs bg-sun-500/20 text-sun-400 font-semibold">PRO</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <SpeakButton text={`${w.name}. ${w.rating} stars. ${w.jobs_completed} jobs completed. Skills: ${w.skills.map((s: any) => skillName(s.skill)).join(", ")}`} className="!bg-white/10 !border-white/20 !text-white" />
            {!isMe && (
              <>
                <button
                  className={`h-9 px-3 rounded-lg border flex items-center gap-1.5 text-sm font-medium ${w.is_favorite ? "bg-surface text-rose-400 border-white" : "border-white/30 text-white hover:bg-white/10"}`}
                  onClick={async () => {
                    await api(`/favorites/${w.id}`, { method: w.is_favorite ? "DELETE" : "POST", body: w.is_favorite ? undefined : {} });
                    toast(w.is_favorite ? "Removed from saved workers" : "Saved to My workers", "", "success");
                    load();
                  }}
                >
                  <Heart size={15} className={w.is_favorite ? "fill-rose-600" : ""} /> {w.is_favorite ? "Saved" : "Save"}
                </button>
                <a href={`tel:${w.phone}`} className="h-9 px-3 rounded-lg border border-white/30 text-white hover:bg-white/10 flex items-center gap-1.5 text-sm font-medium">
                  <Phone size={15} /> {t("call")}
                </a>
                <Link href={`/customer/post?rebook=${w.id}`} className="btn bg-[#f2f2f5] text-[#0b0b0e] hover:bg-white !py-2">
                  {t("hire")} {w.name.split(" ")[0]}
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-line">
          {[
            [<Stars key="s" value={w.rating} />, `${w.rating_count} reviews`],
            [w.jobs_completed, "Jobs done"],
            [`${w.experience_years} yrs`, "Experience"],
            [w.repeat_customers, "Repeat customers"],
            [`${money(w.daily_rate)}`, "Per day"],
          ].map(([v, l]: any, i) => (
            <div key={i} className="px-5 py-4 text-center">
              <div className="text-xl font-bold">{v}</div>
              <div className="text-xs text-muted">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">
          {w.bio && <div className="card p-5 text-[15px] italic text-slate-300">“{w.bio}”</div>}
          <div className="card p-5">
            <div className="section-title mb-4">
              <Wrench size={18} className="text-brand-400" /> Skills
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {w.skills.map((s: any) => (
                <div key={s.skill} className="rounded-xl border border-line p-4">
                  <div className="flex items-center gap-3">
                    <SkillBadge skill={s.skill} size={38} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium flex items-center gap-1.5">
                        {skillName(s.skill)} {s.verified && <BadgeCheck size={15} className="text-brand-400" />}
                      </div>
                      <div className="text-xs text-muted">
                        {LEVEL_LABEL[s.level]}
                        {w.jobs_per_skill?.[s.skill] > 0 && ` · ${w.jobs_per_skill[s.skill]} jobs on KaamNear`}
                      </div>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-3 mt-3 overflow-hidden">
                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${LEVEL_W[s.level] || 50}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="px-5 py-4 border-b border-line section-title">
              <MessageSquareQuote size={18} className="text-brand-400" /> Reviews
            </div>
            {w.reviews.length === 0 && <div className="p-5 text-muted">No reviews yet</div>}
            <div className="divide-y divide-line">
              {w.reviews.map((r: any, i: number) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Avatar name={r.by} size={30} />
                    <span className="font-medium flex-1">{r.by}</span>
                    <span className="flex">
                      {Array.from({ length: 5 }).map((_, k) => (
                        <Star key={k} size={14} className={k < r.rating ? "fill-amber-400 text-amber-400" : "text-track"} />
                      ))}
                    </span>
                    <span className="text-xs text-muted">{r.date}</span>
                  </div>
                  {r.comment && <div className="text-sm text-slate-300 mt-2">{r.comment.replace(/[\p{Extended_Pictographic}]/gu, "")}</div>}
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {r.tags?.map((tg: string) => (
                      <span key={tg} className="chip !text-[11px] bg-brand-500/10 text-brand-300">
                        {tg}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card p-5">
            <div className="section-title mb-4">
              <ShieldCheck size={18} className="text-brand-400" /> {t("reliability")}
            </div>
            {rel.completion_rate === null ? (
              <div className="text-muted text-sm">New worker — no history yet</div>
            ) : (
              <div className="space-y-3">
                {[
                  ["Completion rate", rel.completion_rate],
                  ["On time", rel.on_time_rate],
                  ["Cancellations", rel.cancellation_rate],
                ].map(([k, v]: any) => (
                  <div key={k}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted">{k}</span>
                      <span className="font-semibold">{v}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                      <div className={`h-full rounded-full ${k === "Cancellations" ? "bg-rose-500" : "bg-brand-600"}`} style={{ width: `${v}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card p-5 space-y-2.5">
            <div className="section-title mb-2">
              <IdCard size={18} className="text-brand-400" /> {t("verification")}
            </div>
            {[
              [Smartphone, "Mobile number", "verified"],
              [IdCard, "Government ID", w.verification.id],
              [ScanFace, "Face check", w.verification.face],
            ].map(([Icon, label, st]: any) => (
              <div key={label} className="flex items-center gap-2.5 text-sm">
                <Icon size={16} className="text-muted" />
                <span className="flex-1">{label}</span>
                {st === "verified" ? <BadgeCheck size={17} className="text-brand-400" /> : <span className="text-xs text-muted">Not yet</span>}
              </div>
            ))}
          </div>
          <div className="card p-5 text-sm space-y-2">
            <div className="section-title mb-2">
              <Wallet size={18} className="text-brand-400" /> Rates and hours
            </div>
            <div className="flex justify-between"><span className="text-muted">Per day</span><span className="font-medium">{money(w.daily_rate)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Per hour</span><span className="font-medium">{money(w.hourly_rate)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Working days</span><span className="font-medium text-right">{w.available_days.join(", ")}</span></div>
            <div className="flex justify-between"><span className="text-muted">Hours</span><span className="font-medium">{w.available_from}–{w.available_to}</span></div>
            <div className="flex justify-between"><span className="text-muted">Travels up to</span><span className="font-medium">{w.radius_km} km</span></div>
          </div>
          {w.groups?.length > 0 && (
            <div className="card p-5">
              <div className="section-title mb-3">
                <UsersRound size={18} className="text-brand-400" /> Groups
              </div>
              <div className="flex flex-wrap gap-1.5">
                {w.groups.map((g: string) => (
                  <span key={g} className="chip !text-xs bg-surface-3 text-slate-300">{g}</span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
