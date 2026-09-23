"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Clock, Users, Repeat, Zap, Hourglass, Mail, BadgeCheck, CircleCheck } from "lucide-react";
import { useApp } from "@/lib/store";
import { SkillBadge, skillIconFor } from "@/lib/icons";
import { Avatar, Stars, LevelBadge, SpeakButton, ScoreRing, money, prettyDate, durLabel, JobStatusPill, clean } from "./ui";

export function JobCard({ job, href, showStatus, children }: { job: any; href: string; showStatus?: boolean; children?: React.ReactNode }) {
  const { t, skillName } = useApp();
  const speakText = `${job.title}. ${job.distance_km !== undefined ? job.distance_km + " " + t("km_away") + "." : ""} ${job.budget} rupees. ${prettyDate(job.date, t)}.`;
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`card p-4 flex flex-col ${job.urgent ? "border-rose-500/30" : job.invited ? "border-sun-500/50" : ""}`}>
      <Link href={href} className="flex gap-3.5">
        <SkillBadge skill={job.skills[0]} size={48} tone={job.urgent ? "rose" : "brand"} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-1">
            {job.urgent && (
              <span className="chip !text-xs bg-rose-600 text-white">
                <Zap size={12} /> {t("urgent")}
              </span>
            )}
            {job.invited && (
              <span className="chip !text-xs bg-sun-500/15 text-sun-400">
                <Mail size={12} /> Invited
              </span>
            )}
            {job.recurring?.freq && (
              <span className="chip !text-xs bg-violet-500/10 text-violet-300">
                <Repeat size={12} /> {job.recurring.freq === "weekly" ? `Every ${job.recurring.day}` : "Daily"}
              </span>
            )}
            {showStatus && <JobStatusPill status={job.status} />}
          </div>
          <div className="font-semibold text-[17px] leading-snug">{job.title}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted mt-1.5">
            {job.distance_km !== undefined && (
              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {job.distance_km} km
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {prettyDate(job.date, t)} · {t(job.time_slot === "asap" ? "asap" : job.time_slot)}
            </span>
            <span className="flex items-center gap-1">
              <Hourglass size={14} />
              {durLabel(job.duration)}
            </span>
            {job.workers_required > 1 && (
              <span className="flex items-center gap-1">
                <Users size={14} />
                {job.workers_required} {t("workers")}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end justify-between gap-2 shrink-0">
          <div className="text-right">
            <div className="text-lg font-bold text-ink">{money(job.budget)}</div>
            {job.workers_required > 1 && <div className="text-[11px] text-muted -mt-0.5">per person</div>}
          </div>
          {job.match && <ScoreRing score={job.match.score} size={44} />}
        </div>
      </Link>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line">
        <div className="flex-1 flex flex-wrap gap-1.5 min-w-0">
          {job.skills.slice(0, 3).map((s: string) => {
            const I = skillIconFor(s);
            return (
              <span key={s} className="chip !text-xs bg-surface-3 text-slate-300">
                <I size={12} /> {skillName(s)}
              </span>
            );
          })}
        </div>
        <SpeakButton text={speakText} className="!h-8 !w-8" />
      </div>
      {children}
    </motion.div>
  );
}

export function WorkerCard({ w, score, reasons, children, compact }: { w: any; score?: number; reasons?: string[]; children?: React.ReactNode; compact?: boolean }) {
  const { t, skillName } = useApp();
  const speakText = `${w.name}. ${w.rating || ""} stars. ${w.jobs_completed} ${t("jobs_done")}. ${w.distance_km ?? ""} ${t("km_away")}. ${w.daily_rate} rupees per day.`;
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-4 flex flex-col">
      <div className="flex gap-3 items-start">
        <Link href={`/workers/${w.id}`}>
          <Avatar name={w.name} size={52} online={w.available} />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/workers/${w.id}`} className="font-semibold text-[17px] hover:text-brand-300 flex items-center gap-2">
            <span className="truncate">{w.name}</span>
            {w.subscription === "pro" && <span className="chip !text-[10px] !px-1.5 !py-0 bg-sun-500/15 text-sun-400 font-semibold">PRO</span>}
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <Stars value={w.rating} count={w.rating_count} />
            <span>
              {w.jobs_completed} {t("jobs_done")}
            </span>
            {w.distance_km !== undefined && (
              <span className="flex items-center gap-1">
                <MapPin size={13} />
                {w.distance_km} km
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <LevelBadge level={w.level} />
            {w.available && (
              <span className="chip !text-xs bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/25">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {t("available_now")}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {score !== undefined ? <ScoreRing score={score} /> : null}
          <span className="font-semibold text-sm">
            {money(w.daily_rate)}
            <span className="text-xs text-muted font-normal">/day</span>
          </span>
        </div>
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {w.skills.slice(0, 4).map((s: any) => {
            const I = skillIconFor(s.skill);
            return (
              <span key={s.skill} className={`chip !text-xs ${s.verified ? "bg-brand-500/10 text-brand-300" : "bg-surface-3 text-slate-300"}`}>
                <I size={12} /> {skillName(s.skill)} {s.verified && <BadgeCheck size={12} />}
              </span>
            );
          })}
        </div>
      )}
      {reasons && reasons.length > 0 && (
        <div className="mt-3 rounded-lg bg-surface-2 border border-line p-3 text-sm space-y-1">
          <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">Why this worker</div>
          {reasons.slice(0, 4).map((r, i) => (
            <div key={i} className="flex gap-2 items-start">
              <CircleCheck size={14} className="text-brand-400 mt-0.5 shrink-0" />
              <span>{clean(r)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 mt-auto pt-3">
        <div className="flex-1 flex gap-2">{children}</div>
        <SpeakButton text={speakText} />
      </div>
    </motion.div>
  );
}
