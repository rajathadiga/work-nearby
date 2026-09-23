"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Wallet, CalendarDays, Clock, ClipboardCheck, Hourglass, TrendingUp } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { SkillBadge } from "@/lib/icons";
import { ChartTip } from "@/components/ChartTip";
import { useRequireUser, Loading, PageTitle, money, BookingStatusPill, prettyDate, Stat } from "@/components/ui";

export default function Earnings() {
  const user = useRequireUser("worker");
  const { t } = useApp();
  const [e, setE] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.worker) return;
    api("/worker/earnings").then(setE);
    api("/worker/bookings").then(setBookings);
  }, [user?.id]);

  if (!user || !e) return <Loading />;
  const maxSkill = e.by_skill[0]?.amount || 1;

  return (
    <div className="space-y-6">
      <PageTitle icon={Wallet} title={t("earnings")} sub="Your income from KaamNear" speakText={`This month you earned ${e.month} rupees from ${e.month_jobs} jobs. This week ${e.week} rupees.`} />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat icon={Wallet} label="This month" value={money(e.month)} tone="text-brand-300" />
        <Stat icon={CalendarDays} label={t("earned_week")} value={money(e.week)} />
        <Stat icon={ClipboardCheck} label="Jobs this month" value={e.month_jobs} />
        <Stat icon={TrendingUp} label="Average per day" value={money(e.avg_per_day)} />
        <Stat icon={Clock} label="Hours worked" value={e.hours_month} sub={e.pending_amount > 0 ? `${money(e.pending_amount)} payment pending` : undefined} />
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="card p-5 xl:col-span-2">
          <div className="section-title mb-4">Daily earnings — last 30 days</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={e.series} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#222228" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8d8d99" }} interval={3} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8d8d99" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(249,122,46,.08)" }} />
                <Bar dataKey="amount" fill="#f97a2e" radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <div className="section-title mb-4">Earnings by skill</div>
          <div className="space-y-3.5">
            {e.by_skill.map((s: any) => (
              <div key={s.skill}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{s.skill}</span>
                  <span className="font-semibold">{money(s.amount)}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${(s.amount / maxSkill) * 100}%` }} />
                </div>
              </div>
            ))}
            {e.by_skill.length === 0 && <div className="text-sm text-muted">No completed work yet.</div>}
          </div>
          <div className="mt-6 pt-4 border-t border-line flex justify-between text-sm">
            <span className="text-muted">All-time earnings</span>
            <span className="font-semibold">
              {money(e.total)} · {e.total_jobs} jobs
            </span>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-line section-title">
          <Hourglass size={18} className="text-brand-400" /> Work history
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-muted text-left">
              <tr>
                <th className="px-5 py-2.5 font-medium">Job</th>
                <th className="px-5 py-2.5 font-medium hidden md:table-cell">Date</th>
                <th className="px-5 py-2.5 font-medium hidden md:table-cell">Customer</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {bookings.slice(0, 30).map((b) => (
                <tr key={b.id} className="hover:bg-surface-2 cursor-pointer" onClick={() => (window.location.href = `/worker/jobs/${b.job_id}`)}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <SkillBadge skill={b.job.skills[0]} size={32} tone="slate" />
                      <span className="font-medium truncate max-w-[220px]">{b.job.title}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell text-muted">{prettyDate(b.job.date, t)}</td>
                  <td className="px-5 py-3 hidden md:table-cell text-muted">{b.customer?.name}</td>
                  <td className="px-5 py-3">
                    <BookingStatusPill status={b.status} />
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">{money(b.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
