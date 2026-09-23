"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { ChartTip } from "@/components/ChartTip";
import { useRequireUser, Loading, PageTitle, money, BookingStatusPill, prettyDate } from "@/components/ui";

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

  return (
    <div className="space-y-5">
      <PageTitle title={`💰 ${t("earnings")}`} speakText={`This month you earned ${e.month} rupees from ${e.month_jobs} jobs. This week ${e.week} rupees.`} />
      <div className="rounded-[2rem] p-6 bg-gradient-to-br from-brand-600 to-emerald-500 text-white">
        <div className="font-bold text-white/80">This month</div>
        <div className="text-5xl font-black">{money(e.month)}</div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div>
            <div className="text-2xl font-black">{e.month_jobs}</div>
            <div className="text-xs font-bold text-white/80">Jobs completed</div>
          </div>
          <div>
            <div className="text-2xl font-black">{money(e.avg_per_day)}</div>
            <div className="text-xs font-bold text-white/80">Average / day</div>
          </div>
          <div>
            <div className="text-2xl font-black">{e.hours_month}</div>
            <div className="text-xs font-bold text-white/80">Hours worked</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">{t("earned_week")}</div>
          <div className="text-2xl font-black">{money(e.week)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm font-bold text-muted">⏳ Pending payments</div>
          <div className="text-2xl font-black text-amber-600">{money(e.pending_amount)}</div>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="section-title mb-2">📊 Daily earnings – last 30 days</h2>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={e.series} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#eee" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#66706c" }} interval={4} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#66706c" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(16,185,129,.08)" }} />
              <Bar dataKey="amount" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {e.by_skill.length > 0 && (
        <div className="card p-4">
          <h2 className="section-title mb-3">🛠️ Earnings by skill</h2>
          <div className="space-y-2">
            {e.by_skill.map((s: any) => (
              <div key={s.skill} className="flex items-center gap-2 text-sm">
                <span className="w-40 font-bold truncate">{s.skill}</span>
                <span className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                  <span className="block h-full rounded-full bg-brand-600" style={{ width: `${(s.amount / e.by_skill[0].amount) * 100}%` }} />
                </span>
                <span className="w-20 text-right font-black">{money(s.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4">
        <h2 className="section-title mb-3">🧾 Work history</h2>
        <div className="divide-y divide-black/5">
          {bookings.slice(0, 25).map((b) => (
            <a key={b.id} href={`/worker/jobs/${b.job_id}`} className="flex items-center gap-3 py-2">
              <span className="text-2xl">{b.job.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold truncate">{b.job.title}</span>
                <span className="text-xs text-muted font-semibold">
                  {prettyDate(b.job.date, t)} • {b.customer?.name}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-black">{money(b.amount)}</span>
                <BookingStatusPill status={b.status} />
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
