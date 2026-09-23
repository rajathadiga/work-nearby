"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Heart, Phone } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
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
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="rounded-[2rem] overflow-hidden card">
        <div className="bg-gradient-to-br from-brand-700 to-emerald-500 p-5 text-white relative">
          <div className="text-xs font-black tracking-widest text-white/70">🪪 DIGITAL {t("passport").toUpperCase()}</div>
          <div className="flex items-center gap-4 mt-3">
            <Avatar name={w.name} size={80} online={w.available} />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black">{w.name}</h1>
              <div className="font-semibold text-white/85">
                📍 {w.area} {w.distance_km !== undefined && !isMe && `• ${w.distance_km} km`}
              </div>
              <div className="mt-1 flex gap-1 flex-wrap">
                <LevelBadge level={w.level} />
                {w.subscription === "pro" && <span className="chip !text-xs bg-amber-300 text-amber-900">PRO</span>}
              </div>
            </div>
            <SpeakButton
              text={`${w.name}. ${w.rating} stars. ${w.jobs_completed} jobs completed. Skills: ${w.skills.map((s: any) => skillName(s.skill)).join(", ")}`}
              className="!bg-white/20 !text-white"
            />
          </div>
        </div>
        <div className="grid grid-cols-4 divide-x text-center py-3">
          <div>
            <div className="text-xl font-black">
              <Stars value={w.rating} />
            </div>
            <div className="text-[11px] text-muted font-bold">{w.rating_count} reviews</div>
          </div>
          <div>
            <div className="text-xl font-black">{w.jobs_completed}</div>
            <div className="text-[11px] text-muted font-bold">Jobs done</div>
          </div>
          <div>
            <div className="text-xl font-black">{w.experience_years}y</div>
            <div className="text-[11px] text-muted font-bold">Experience</div>
          </div>
          <div>
            <div className="text-xl font-black">{w.repeat_customers}</div>
            <div className="text-[11px] text-muted font-bold">Repeat customers</div>
          </div>
        </div>
      </div>

      {w.bio && <div className="card p-4 font-semibold italic">“{w.bio}”</div>}

      <div className="card p-4">
        <h2 className="section-title mb-3">🛠️ Skills</h2>
        <div className="space-y-3">
          {w.skills.map((s: any) => (
            <div key={s.skill}>
              <div className="flex items-center gap-2 font-bold">
                <span className="text-2xl">{s.icon}</span>
                <span className="flex-1">{skillName(s.skill)}</span>
                {s.verified && <span className="chip !text-xs bg-green-100 text-green-700">✓ Verified</span>}
                <span className="text-sm text-muted">{LEVEL_LABEL[s.level]}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 mt-1 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600" style={{ width: `${LEVEL_W[s.level] || 50}%` }} />
              </div>
              {w.jobs_per_skill?.[s.skill] > 0 && <div className="text-xs text-muted font-semibold mt-0.5">{w.jobs_per_skill[s.skill]} jobs done on KaamNear</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="section-title mb-3">✅ {t("reliability")}</h2>
        {rel.completion_rate === null ? (
          <div className="text-muted font-semibold">New worker – no history yet</div>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Completion", rel.completion_rate + "%"],
              ["On time", rel.on_time_rate + "%"],
              ["Cancellations", rel.cancellation_rate + "%"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-gray-50 p-3">
                <div className="text-2xl font-black">{v}</div>
                <div className="text-xs text-muted font-bold">{k}</div>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 mt-3 text-sm font-bold">
          <span className="chip bg-gray-100">📱 Phone ✓</span>
          <span className={`chip ${w.verification.id === "verified" ? "bg-green-100 text-green-700" : "bg-gray-100 text-muted"}`}>🪪 ID {w.verification.id === "verified" ? "✓" : "–"}</span>
          <span className={`chip ${w.verification.face === "verified" ? "bg-green-100 text-green-700" : "bg-gray-100 text-muted"}`}>🤳 Face {w.verification.face === "verified" ? "✓" : "–"}</span>
          {w.groups?.map((g: string) => (
            <span key={g} className="chip bg-sun-100 text-sun-600">
              👥 {g}
            </span>
          ))}
        </div>
      </div>

      <div className="card p-4 flex items-center gap-3">
        <div className="flex-1">
          <div className="text-sm text-muted font-bold">Rates</div>
          <div className="font-black text-lg">
            {money(w.daily_rate)}/day • {money(w.hourly_rate)}/hour
          </div>
          <div className="text-xs text-muted font-semibold">
            Works {w.available_days.join(", ")} • {w.available_from}–{w.available_to} • up to {w.radius_km} km
          </div>
        </div>
      </div>

      {!isMe && (
        <div className="flex gap-2">
          <Link href={`/customer/post?rebook=${w.id}`} className="btn-primary btn-lg flex-[2]">
            {t("hire")} {w.name.split(" ")[0]}
          </Link>
          <button
            className={`btn-lg btn ${w.is_favorite ? "bg-pink-600 text-white" : "btn-ghost"}`}
            onClick={async () => {
              await api(`/favorites/${w.id}`, { method: w.is_favorite ? "DELETE" : "POST", body: w.is_favorite ? undefined : {} });
              toast(w.is_favorite ? "Removed" : "❤️ Saved");
              load();
            }}
            aria-label="save"
          >
            <Heart className={w.is_favorite ? "fill-white" : ""} />
          </button>
          <a href={`tel:${w.phone}`} className="btn-ghost btn-lg" aria-label={t("call")}>
            <Phone />
          </a>
        </div>
      )}

      <div className="card p-4">
        <h2 className="section-title mb-3">💬 Reviews</h2>
        {w.reviews.length === 0 && <div className="text-muted font-semibold">No reviews yet</div>}
        <div className="space-y-3">
          {w.reviews.map((r: any, i: number) => (
            <div key={i} className="border-b border-black/5 pb-3 last:border-0">
              <div className="flex items-center gap-2">
                <span className="font-bold flex-1">{r.by}</span>
                <span className="text-amber-500 font-black">{"★".repeat(r.rating)}</span>
                <span className="text-xs text-muted">{r.date}</span>
              </div>
              {r.comment && <div className="font-semibold text-muted">{r.comment}</div>}
              <div className="flex gap-1 mt-1 flex-wrap">
                {r.tags?.map((tg: string) => (
                  <span key={tg} className="chip !text-[11px] bg-brand-50 text-brand-800">
                    {tg}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
