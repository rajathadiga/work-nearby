"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";
import { useApp } from "@/lib/store";
import { api, fileUrl } from "@/lib/api";
import { useRequireUser, Loading, money, BookingStatusPill, Avatar, PageTitle } from "@/components/ui";
import { ShieldCheck, Users, UserCheck, ClipboardList, Clock, IndianRupee, Wallet, Lock, Crown, ClipboardCheck, FolderKanban, Brain, RefreshCw, FileText, MessageSquare, IdCard, Video, TriangleAlert, Siren, Building2, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ChartTip } from "@/components/ChartTip";
import MapView from "@/components/MapView";

const TABS = ["Overview", "Live map", "Disputes", "Verification", "Fraud", "SOS", "Business", "Users"];

function Stat({ label, value, sub, tone = "", icon: Icon }: { label: string; value: any; sub?: string; tone?: string; icon: LucideIcon }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted">
        <Icon size={16} /> {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${tone}`}>{value}</div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

export default function Admin() {
  const user = useRequireUser("admin");
  const { toast, logout } = useApp();
  const [tab, setTab] = useState("Overview");
  const [o, setO] = useState<any>(null);
  const [q, setQ] = useState<any>(null);
  const [mapData, setMapData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [resolution, setResolution] = useState<Record<number, string>>({});

  const load = () => {
    api("/admin/overview").then(setO);
    api("/admin/queues").then(setQ);
  };
  useEffect(() => {
    if (user?.role !== "admin") return;
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [user?.role]);
  useEffect(() => {
    if (tab === "Live map") api("/admin/map").then(setMapData);
    if (tab === "Users") api("/admin/users").then(setUsers);
  }, [tab]);

  if (!user || user.role !== "admin" || !o || !q) return <Loading />;
  const act = async (path: string, body: any = {}, msg = "Done") => {
    try {
      await api(path, { body });
      toast(msg, "", "success");
      load();
      if (tab === "Users") api("/admin/users").then(setUsers);
    } catch (e: any) {
      toast("Action failed", e.message, "error");
    }
  };
  const counts: Record<string, number> = {
    Disputes: q.disputes.filter((d: any) => d.status === "open").length,
    Verification: q.verifications.length + q.skill_verifications.length,
    Fraud: q.flagged_jobs.length,
    SOS: q.sos.filter((s: any) => s.status === "active").length,
    Business: q.business.length,
  };

  return (
    <div className="space-y-4">
      <PageTitle
        icon={ShieldCheck}
        title="Operations dashboard"
        sub="KaamNear · Udupi region"
        right={
          <button
            className="btn-ghost !py-2 text-sm"
            onClick={() => {
              logout();
              window.location.href = "/";
            }}
          >
            <LogOut size={15} /> Logout
          </button>
        }
      />
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {TABS.map((x) => (
          <button key={x} onClick={() => setTab(x)} className={`chip shrink-0 !py-2 border ${tab === x ? "bg-ink text-paper border-ink" : "bg-surface border-line hover:border-brand-500/40"}`}>
            {x}
            {counts[x] ? <span className={`ml-1 rounded-full px-1.5 text-xs ${x === "SOS" ? "bg-rose-600 text-white" : "bg-sun-500 text-white"}`}>{counts[x]}</span> : null}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat icon={Users} label="Users" value={o.users.toLocaleString()} sub={`${o.workers} workers • ${o.customers} customers`} />
            <Stat icon={UserCheck} label="Available now" value={o.available_now} sub="workers online" tone="text-emerald-300" />
            <Stat icon={ClipboardList} label="Jobs today" value={o.jobs_today} sub={`${o.completed_today} completed • ${o.cancelled_today} cancelled`} />
            <Stat icon={Clock} label="Open jobs" value={o.open_jobs} sub="waiting for workers" tone="text-sun-400" />
            <Stat icon={IndianRupee} label="GMV" value={money(o.gmv)} sub="paid through platform" />
            <Stat icon={Wallet} label="Platform revenue" value={money(o.revenue)} sub="service fees" tone="text-brand-300" />
            <Stat icon={Lock} label="Held in escrow" value={money(o.held_escrow)} />
            <Stat icon={Crown} label="Subscriptions" value={(o.subscriptions.pro || 0) + (o.subscriptions.homecare || 0)} sub={`${o.subscriptions.pro || 0} Pro • ${o.subscriptions.homecare || 0} HomeCare`} />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="card p-4">
              <h2 className="section-title mb-3"><ClipboardCheck size={18} className="text-brand-400" /> Jobs posted per day</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={o.series} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#222228" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8d8d99" }} interval={4} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#8d8d99" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTip prefix="" />} cursor={{ fill: "rgba(249,122,46,.08)" }} />
                    <Bar dataKey="jobs" fill="#f97a2e" radius={[4, 4, 0, 0]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card p-4">
              <h2 className="section-title mb-3"><IndianRupee size={18} className="text-brand-400" /> GMV per day</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={o.series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#222228" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8d8d99" }} interval={4} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#8d8d99" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Line type="monotone" dataKey="gmv" stroke="#f97a2e" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="card p-4">
              <h2 className="section-title mb-4"><FolderKanban size={18} className="text-brand-400" /> Jobs by category</h2>
              <div className="space-y-2">
                {o.categories.map((c: any) => (
                  <div key={c.category} className="flex items-center gap-2 text-sm">
                    <span className="w-28 font-bold capitalize">{c.category}</span>
                    <span className="flex-1 h-3 rounded-full bg-surface-3 overflow-hidden">
                      <span className="block h-full rounded-full bg-brand-600" style={{ width: `${(c.jobs / o.categories[0].jobs) * 100}%` }} />
                    </span>
                    <span className="w-10 text-right font-semibold">{c.jobs}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-4">
              <h2 className="section-title mb-1"><Brain size={18} className="text-brand-400" /> Matching model (acceptance prediction)</h2>
              <p className="text-sm text-muted font-semibold mb-3">
                Logistic regression predicting P(worker accepts) – trained on {o.model.trained_on} past offers • accuracy {o.model.accuracy ? Math.round(o.model.accuracy * 100) + "%" : "–"}
              </p>
              <div className="space-y-1.5">
                {Object.entries(o.model.weights).map(([k, v]: any) => (
                  <div key={k} className="flex items-center gap-2 text-sm">
                    <span className="w-24 font-bold">{k}</span>
                    <span className="flex-1 h-3 relative bg-surface-3 rounded-full">
                      <span
                        className={`absolute top-0 h-3 rounded-full ${v >= 0 ? "bg-brand-600 left-1/2" : "bg-rose-400 right-1/2"}`}
                        style={{ width: `${Math.min(50, Math.abs(v) * 15)}%` }}
                      />
                    </span>
                    <span className="w-14 text-right font-mono text-xs">{v.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <button className="btn-ghost !py-2 text-sm mt-3" onClick={() => act("/admin/retrain", {}, "Model retrained")}>
                <RefreshCw size={15} /> Retrain on latest data
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "Live map" &&
        (mapData ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-5 text-sm text-muted">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Available worker ({mapData.workers.filter((w: any) => w.available).length})</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Offline worker</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sun-500" /> Open job</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-700" /> Assigned / in progress</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-700" /> Urgent</span>
            </div>
            <MapView
              center={[13.34, 74.76]}
              zoom={12}
              height="70vh"
              markers={[
                ...mapData.workers.map((w: any) => ({ lat: w.lat, lng: w.lng, kind: "dot" as const, color: w.available ? "#10b981" : "#52525c", size: 11, popup: w.name })),
                ...mapData.jobs.map((j: any) => ({ lat: j.lat, lng: j.lng, kind: (j.urgent ? "urgent" : "job") as any, color: j.urgent ? "#be123c" : j.status === "open" ? "#f5a524" : "#717ef2", size: 24, popup: `#${j.id} ${j.title} (${j.status})` })),
              ]}
              circles={mapData.jobs.filter((j: any) => j.status === "open").map((j: any) => ({ lat: j.lat, lng: j.lng, radius: 1200, color: "#c2842b", opacity: 0.1 }))}
            />
          </div>
        ) : (
          <Loading />
        ))}

      {tab === "Disputes" && (
        <div className="space-y-3">
          {q.disputes.length === 0 && <div className="card p-6 text-center text-muted font-bold">No open disputes</div>}
          {q.disputes.map((d: any) => (
            <div key={d.id} className="card p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="font-semibold">
                    #{d.id} • {d.booking.job.title}
                  </div>
                  <div className="text-sm text-muted font-semibold">
                    Raised by {d.raised_by} • Customer {d.booking.customer.name} • Worker {d.booking.worker.name}
                  </div>
                </div>
                <span className={`chip ${d.status === "open" ? "bg-amber-500/15 text-amber-300" : "bg-green-500/15 text-green-300"}`}>{d.status}</span>
              </div>
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 font-medium">“{d.reason}”</div>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-surface-2 border border-line p-3 space-y-1 font-semibold">
                  <div className="font-semibold flex items-center gap-1.5"><FileText size={15} /> Evidence</div>
                  <div>
                    Status: <BookingStatusPill status={d.booking.status} />
                  </div>
                  <div>Check-in: {d.booking.check_in_at ? new Date(d.booking.check_in_at + "Z").toLocaleString() : "—"}</div>
                  <div>Check-out: {d.booking.check_out_at ? new Date(d.booking.check_out_at + "Z").toLocaleString() : "—"}</div>
                  <div>
                    Payment: {d.booking.payment ? `${money(d.booking.payment.amount)} ${d.booking.payment.method} (${d.booking.payment.status})` : "none"}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {[...d.booking.before_photos, ...d.booking.after_photos].map((p: string) => (
                      <img key={p} src={fileUrl(p)} alt="evidence" className="h-16 w-16 rounded-lg object-cover" />
                    ))}
                    {!d.booking.before_photos.length && !d.booking.after_photos.length && <span className="text-muted">No photos</span>}
                  </div>
                </div>
                <div className="rounded-lg bg-surface-2 border border-line p-3 max-h-48 overflow-y-auto">
                  <div className="font-semibold mb-1 flex items-center gap-1.5"><MessageSquare size={15} /> Chat</div>
                  {d.chat.length === 0 && <div className="text-muted">No messages</div>}
                  {d.chat.map((c: any, i: number) => (
                    <div key={i}>
                      <b>{c.from}:</b> {c.text || c.kind}
                    </div>
                  ))}
                </div>
              </div>
              {d.status === "open" ? (
                <div className="space-y-2">
                  <input className="input !py-2 !text-base" placeholder="Resolution note" value={resolution[d.id] || ""} onChange={(e) => setResolution({ ...resolution, [d.id]: e.target.value })} />
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-primary !py-2" onClick={() => act(`/admin/disputes/${d.id}/resolve`, { resolution: resolution[d.id] || "Payment released to worker", action: "release" }, "Released")}>
                      Release to worker
                    </button>
                    <button className="btn-sun !py-2" onClick={() => act(`/admin/disputes/${d.id}/resolve`, { resolution: resolution[d.id] || "Refunded to customer", action: "refund" }, "Refunded")}>
                      Refund customer
                    </button>
                    <button className="btn-ghost !py-2" onClick={() => act(`/admin/disputes/${d.id}/resolve`, { resolution: resolution[d.id] || "Resolved after talking to both", action: "none" }, "Resolved")}>
                      Close (no money change)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm font-bold text-green-300">Resolution: {d.resolution}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "Verification" && (
        <div className="space-y-3">
          <h2 className="section-title"><IdCard size={18} className="text-brand-400" /> Identity documents</h2>
          {q.verifications.length === 0 && <div className="card p-4 text-muted font-bold">Queue empty</div>}
          {q.verifications.map((v: any) => (
            <div key={v.user.id} className="card p-4 flex flex-wrap items-center gap-3">
              <Avatar name={v.user.name} />
              <div className="flex-1 min-w-40">
                <div className="font-semibold">{v.user.name}</div>
                <div className="text-sm text-muted font-semibold">
                  {v.user.role} • {v.user.phone}
                </div>
              </div>
              {v.id_doc && <img src={fileUrl(v.id_doc)} alt="id" className="h-16 rounded-lg" />}
              {v.face_doc && <img src={fileUrl(v.face_doc)} alt="face" className="h-16 rounded-lg" />}
              {(["id", "face", "address"] as const).map((k) =>
                v.user.verification[k] === "pending" ? (
                  <span key={k} className="flex gap-1">
                    <button className="btn-primary !py-1.5 !px-3 text-sm" onClick={() => act(`/admin/verify/${v.user.id}`, { approve: true, kind: k }, `${k} approved`)}>
                      Approve {k}
                    </button>
                    <button className="btn-ghost !py-1.5 !px-3 text-sm" onClick={() => act(`/admin/verify/${v.user.id}`, { approve: false, kind: k }, `${k} rejected`)}>
                      Reject
                    </button>
                  </span>
                ) : null
              )}
            </div>
          ))}
          <h2 className="section-title pt-2"><Video size={18} className="text-brand-400" /> Skill videos</h2>
          {q.skill_verifications.length === 0 && <div className="card p-4 text-muted font-bold">Queue empty</div>}
          {q.skill_verifications.map((s: any) => (
            <div key={s.worker_id + s.skill} className="card p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1">
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm font-semibold text-muted">{s.skill_name}</div>
              </div>
              {s.evidence ? (
                s.evidence.match(/\.(mp4|webm|mov)$/) ? (
                  <video src={fileUrl(s.evidence)} controls className="h-28 rounded-lg" />
                ) : (
                  <img src={fileUrl(s.evidence)} alt="evidence" className="h-20 rounded-lg" />
                )
              ) : (
                <span className="text-xs text-muted">no file (demo)</span>
              )}
              <button className="btn-primary !py-2" onClick={() => act(`/admin/skill-verify/${s.worker_id}/${s.skill}`, { approve: true }, "Skill verified")}>
                Approve
              </button>
              <button className="btn-ghost !py-2" onClick={() => act(`/admin/skill-verify/${s.worker_id}/${s.skill}`, { approve: false }, "Rejected")}>
                Reject
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "Fraud" && (
        <div className="space-y-3">
          <p className="text-sm text-muted font-semibold">Jobs auto-flagged by the scam detector (payment demands, OTP/bank requests, unrealistic pay, spam bursts, off-platform contact).</p>
          {q.flagged_jobs.map((j: any) => (
            <div key={j.id} className="card p-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold flex-1">
                  #{j.id} {j.title}
                </span>
                <span className={`chip ${j.fraud_score >= 0.8 ? "bg-rose-600 text-white" : "bg-amber-500/10 text-amber-300"}`}>risk {Math.round(j.fraud_score * 100)}%</span>
              </div>
              <ul className="text-sm font-semibold text-rose-300 mt-1">
                {j.flags.map((f: string) => (
                  <li key={f} className="flex items-center gap-1.5"><TriangleAlert size={14} /> {f}</li>
                ))}
              </ul>
              <div className="flex gap-2 mt-2">
                {j.status !== "cancelled" && (
                  <button className="btn-danger !py-2 text-sm" onClick={() => act(`/admin/jobs/${j.id}/remove`, {}, "Job removed")}>
                    Remove job
                  </button>
                )}
                <button className="btn-ghost !py-2 text-sm" onClick={() => act(`/admin/users/${j.customer_id}/block`, {}, "User block toggled")}>
                  Block / unblock poster
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "SOS" && (
        <div className="space-y-3">
          {q.sos.length === 0 && <div className="card p-6 text-center text-muted font-bold">No SOS alerts</div>}
          {q.sos.map((s: any) => (
            <div key={s.id} className={`card p-4 flex items-center gap-3 ${s.status === "active" ? "ring-2 ring-rose-500" : ""}`}>
              <Siren size={28} className="text-rose-400" />
              <div className="flex-1">
                <div className="font-semibold">
                  {s.user} • {s.phone}
                </div>
                <div className="text-sm text-muted font-semibold">
                  Booking #{s.booking_id} • {new Date(s.created_at + "Z").toLocaleString()}
                </div>
                <a className="text-sm font-bold text-sky-300 underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${s.lat},${s.lng}`}>
                  Open location
                </a>
              </div>
              <a href={`tel:${s.phone}`} className="btn-primary !py-2">
                Call
              </a>
              {s.status === "active" && (
                <button className="btn-ghost !py-2" onClick={() => act(`/admin/sos/${s.id}/close`, {}, "Closed")}>
                  Close
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "Business" && (
        <div className="space-y-3">
          {q.business.map((b: any) => (
            <div key={b.id} className="card p-4">
              <div className="font-semibold">
                <Building2 size={16} className="inline text-brand-400 mr-1" /> {b.business_name} <span className="chip !text-xs bg-surface-3 ml-1">{b.business_type}</span>
              </div>
              <div className="font-semibold">{b.need}</div>
              <div className="text-sm text-muted font-semibold">
                {b.workers} workers • {b.frequency} • Phone {b.contact_phone}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Users" && (
        <div className="card divide-y">
          {users.map((u) => (
            <div key={u.id} className="p-3 flex items-center gap-3">
              <Avatar name={u.name} size={40} />
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">
                  {u.name} {u.blocked && <span className="chip !text-xs bg-red-500/15 text-rose-300">blocked</span>}
                </div>
                <div className="text-xs text-muted font-semibold">
                  {u.role} • {u.phone} • {u.area}
                  {u.worker && ` • ⭐${u.worker.rating} • ${u.worker.jobs_completed} jobs`}
                </div>
              </div>
              {u.role !== "admin" && (
                <button className="btn-ghost !py-1.5 text-sm" onClick={() => act(`/admin/users/${u.id}/block`, {}, "Updated")}>
                  {u.blocked ? "Unblock" : "Block"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
