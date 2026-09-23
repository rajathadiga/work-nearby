"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Clock, Users, Repeat, Zap } from "lucide-react";
import { useApp } from "@/lib/store";
import { Avatar, Stars, LevelBadge, SpeakButton, ScoreRing, money, prettyDate, durLabel, JobStatusPill } from "./ui";

export function JobCard({ job, href, showStatus, children }: { job: any; href: string; showStatus?: boolean; children?: React.ReactNode }) {
  const { t, skillName } = useApp();
  const speakText = `${job.title}. ${job.distance_km !== undefined ? job.distance_km + " " + t("km_away") + "." : ""} ${money(job.budget)}. ${prettyDate(job.date, t)}.`;
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`card p-4 ${job.urgent ? "ring-2 ring-red-400" : ""} ${job.invited ? "ring-2 ring-sun-400" : ""}`}>
      <Link href={href} className="flex gap-3">
        <span className="h-14 w-14 shrink-0 rounded-2xl bg-brand-50 grid place-items-center text-3xl">{job.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1 mb-1">
            {job.urgent && (
              <span className="chip !text-xs bg-red-600 text-white">
                <Zap size={12} /> {t("urgent")}
              </span>
            )}
            {job.invited && <span className="chip !text-xs bg-sun-500 text-white">📩 Invited</span>}
            {job.recurring?.freq && (
              <span className="chip !text-xs bg-violet-100 text-violet-700">
                <Repeat size={12} /> {job.recurring.freq === "weekly" ? `Every ${job.recurring.day}` : "Daily"}
              </span>
            )}
            {showStatus && <JobStatusPill status={job.status} />}
          </div>
          <div className="font-extrabold text-lg leading-snug">{job.title}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted font-semibold mt-1">
            {job.distance_km !== undefined && (
              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {job.distance_km} km
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {prettyDate(job.date, t)} • {t(job.time_slot === "asap" ? "asap" : job.time_slot)}
            </span>
            {job.workers_required > 1 && (
              <span className="flex items-center gap-1">
                <Users size={14} />
                {job.workers_required}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {job.skills.slice(0, 3).map((s: string) => (
              <span key={s} className="chip !text-xs bg-gray-100 text-gray-700">
                {skillName(s)}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end justify-between gap-2">
          <span className="text-xl font-black text-brand-700">{money(job.budget)}</span>
          {job.workers_required > 1 && <span className="text-[11px] text-muted font-bold -mt-2">/person</span>}
          {job.match && <ScoreRing score={job.match.score} size={46} />}
        </div>
      </Link>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs text-muted font-semibold flex-1 truncate">📍 {job.address} • ⏳ {durLabel(job.duration)}</span>
        <SpeakButton text={speakText} className="!h-9 !w-9" />
      </div>
      {children}
    </motion.div>
  );
}

export function WorkerCard({ w, score, reasons, children, compact }: { w: any; score?: number; reasons?: string[]; children?: React.ReactNode; compact?: boolean }) {
  const { t, skillName } = useApp();
  const speakText = `${w.name}. ${w.rating || ""} stars. ${w.jobs_completed} ${t("jobs_done")}. ${w.distance_km ?? ""} ${t("km_away")}. ${money(w.daily_rate)} per day.`;
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
      <div className="flex gap-3 items-start">
        <Link href={`/workers/${w.id}`}>
          <Avatar name={w.name} size={60} online={w.available} />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/workers/${w.id}`} className="font-extrabold text-lg hover:underline flex items-center gap-2">
            {w.name} {w.subscription === "pro" && <span className="chip !text-[10px] !px-2 bg-amber-100 text-amber-700">PRO</span>}
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted font-semibold">
            <Stars value={w.rating} count={w.rating_count} />
            <span>
              {w.jobs_completed} {t("jobs_done")}
            </span>
            {w.distance_km !== undefined && <span>📍 {w.distance_km} km</span>}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <LevelBadge level={w.level} />
            {w.available && <span className="chip !text-xs bg-green-100 text-green-700">🟢 {t("available_now")}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {score !== undefined ? <ScoreRing score={score} /> : null}
          <span className="font-black text-brand-700">
            {money(w.daily_rate)}
            <span className="text-xs text-muted">/day</span>
          </span>
        </div>
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-1 mt-3">
          {w.skills.slice(0, 4).map((s: any) => (
            <span key={s.skill} className={`chip !text-xs ${s.verified ? "bg-brand-50 text-brand-800" : "bg-gray-100 text-gray-700"}`}>
              {s.icon} {skillName(s.skill)} {s.verified && "✓"}
            </span>
          ))}
        </div>
      )}
      {reasons && reasons.length > 0 && (
        <div className="mt-3 rounded-2xl bg-brand-50/60 p-3 text-sm font-semibold text-brand-900 space-y-0.5">
          <div className="text-xs font-black text-brand-700 uppercase tracking-wide">Why this worker</div>
          {reasons.slice(0, 4).map((r, i) => (
            <div key={i}>• {r}</div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 mt-3">
        <div className="flex-1 flex gap-2">{children}</div>
        <SpeakButton text={speakText} />
      </div>
    </motion.div>
  );
}
