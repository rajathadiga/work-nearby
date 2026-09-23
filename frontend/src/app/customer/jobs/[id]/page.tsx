"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Phone, MessageCircle, RefreshCw, Heart, Users, TriangleAlert, Zap, Repeat, ShieldCheck, MapPin, CalendarDays, Hourglass, Check, Info, Bike,
  CircleCheck, Ban, Scale, Star, Banknote, Smartphone, CreditCard, Bell, Mail, ArrowLeft, Clock, Wallet, Brain,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { api, fileUrl } from "@/lib/api";
import { SkillBadge } from "@/lib/icons";
import { useRequireUser, Loading, SpeakButton, JobStatusPill, BookingStatusPill, money, prettyDate, durLabel, Breakdown, Modal, Avatar, Stars, clean } from "@/components/ui";
import { WorkerCard } from "@/components/cards";
import MapView from "@/components/MapView";
import Chat from "@/components/Chat";
import { ReviewModal, DisputeModal } from "@/components/modals";

const STEPS = ["confirmed", "on_the_way", "arrived", "completed", "paid"];

export default function CustomerJob() {
  const user = useRequireUser();
  const { id } = useParams<{ id: string }>();
  const { t, toast, say } = useApp();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [chatWith, setChatWith] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [payFor, setPayFor] = useState<any>(null);
  const [reviewFor, setReviewFor] = useState<any>(null);
  const [disputeFor, setDisputeFor] = useState<any>(null);
  const [isNew, setIsNew] = useState(false);

  const load = () => api(`/jobs/${id}`).then(setJob).catch((e) => toast("Could not load job", e.message, "error"));

  useEffect(() => {
    if (!user) return;
    setIsNew(new URLSearchParams(window.location.search).get("new") === "1");
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  useEffect(() => {
    if (job?.workers_required > 1) api("/groups").then(setGroups).catch(() => {});
  }, [job?.workers_required]);

  if (!user || !job) return <Loading />;

  async function act(path: string, body: any = {}, msg?: string) {
    try {
      await api(path, { body });
      if (msg) toast(msg, "", "success");
      load();
    } catch (e: any) {
      toast("Something went wrong", e.message, "error");
    }
  }

  const bookings = job.bookings.filter((b: any) => b.status !== "cancelled");
  const hiredIds = new Set(bookings.filter((b: any) => b.status !== "no_show").map((b: any) => b.worker_id));
  const matches = (job.matches || []).filter((m: any) => !hiredIds.has(m.worker.id) && m.status !== "declined");
  const tracking = bookings.find((b: any) => b.status === "on_the_way");
  const showMatches = job.status !== "cancelled" && job.slots_left > 0;

  const mapMarkers = tracking
    ? [
        { lat: job.lat, lng: job.lng, kind: "home" as const, popup: "Work location", size: 34 },
        { lat: tracking.tracking.lat, lng: tracking.tracking.lng, kind: "vehicle" as const, popup: tracking.worker.name, size: 36 },
      ]
    : [
        { lat: job.lat, lng: job.lng, kind: "home" as const, popup: job.title, size: 34 },
        ...matches.slice(0, 12).map((m: any) => ({ lat: m.worker.lat, lng: m.worker.lng, kind: (m.worker.available ? "worker" : "worker_off") as any, size: 26, popup: `${m.worker.name} · ${Math.round(m.score)}%` })),
      ];

  return (
    <div className="space-y-5">
      <button onClick={() => router.push("/customer")} className="text-sm text-muted hover:text-ink flex items-center gap-1.5">
        <ArrowLeft size={16} /> {t("home")}
      </button>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
        <div className="space-y-5 min-w-0">
          {/* header */}
          <div className="card p-5">
            <div className="flex gap-4 items-start">
              <SkillBadge skill={job.skills[0]} size={56} tone={job.urgent ? "rose" : "brand"} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  <JobStatusPill status={job.status} />
                  {job.urgent && <span className="chip !text-xs bg-rose-600 text-white"><Zap size={12} /> {t("urgent")}</span>}
                  {job.recurring?.freq && <span className="chip !text-xs bg-violet-500/10 text-violet-300"><Repeat size={12} /> Every {job.recurring.day}</span>}
                  {job.escrow && <span className="chip !text-xs bg-brand-500/10 text-brand-300"><ShieldCheck size={12} /> Secure payment</span>}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{job.title}</h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted mt-1.5">
                  <span className="flex items-center gap-1"><MapPin size={14} /> {job.address}</span>
                  <span className="flex items-center gap-1"><CalendarDays size={14} /> {prettyDate(job.date, t)} · {t(job.time_slot === "asap" ? "asap" : job.time_slot)}</span>
                  <span className="flex items-center gap-1"><Hourglass size={14} /> {durLabel(job.duration)}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-bold">{money(job.budget)}</div>
                {job.workers_required > 1 && <div className="text-xs text-muted">× {job.workers_required} workers</div>}
              </div>
            </div>
            {job.flags?.length > 0 && (
              <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-amber-300 flex gap-2">
                <TriangleAlert size={16} className="shrink-0 mt-0.5" /> {job.flags.join(" · ")}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <SpeakButton text={`${job.title}. ${t("status_" + job.status)}. ${matches.length} workers matched.`} />
              {["open", "assigned"].includes(job.status) && (
                <>
                  <button className="btn-ghost !py-2 text-sm" onClick={() => act(`/jobs/${id}/rematch`, {}, "More workers alerted")}>
                    <RefreshCw size={15} /> Find more workers
                  </button>
                  <button className="btn-ghost !py-2 text-sm text-rose-400" onClick={() => confirm("Cancel this job?") && act(`/jobs/${id}/cancel`, {}, "Job cancelled")}>
                    <Ban size={15} /> {t("cancel")}
                  </button>
                </>
              )}
            </div>
          </div>

          {isNew && job.status === "open" && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="card p-4 border-brand-500/25 bg-brand-500/10 flex gap-3">
              <CircleCheck className="text-brand-400 shrink-0" />
              <div>
                <div className="font-semibold">Your job is live</div>
                <div className="text-sm text-muted">
                  We alerted the best {Math.min(matches.length, Math.max(5, job.workers_required * 3))} workers near you. Workers who accept appear here — or hire one directly below.
                </div>
              </div>
            </motion.div>
          )}

          {/* bookings */}
          {bookings.length > 0 && (
            <section className="space-y-3">
              <div className="section-title">
                <Users size={18} className="text-brand-400" /> {t("status_assigned")} ({bookings.filter((b: any) => b.status !== "no_show").length}/{job.workers_required})
              </div>
              {bookings.map((b: any) => {
                const idx = STEPS.indexOf(b.status);
                return (
                  <div key={b.id} className="card p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={b.worker.name} size={50} online={b.worker.available} />
                      <div className="flex-1 min-w-0">
                        <a href={`/workers/${b.worker.id}`} className="font-semibold text-lg hover:text-brand-300">
                          {b.worker.name}
                        </a>
                        <div className="flex gap-2 items-center text-sm text-muted">
                          <Stars value={b.worker.rating} count={b.worker.rating_count} /> · {b.worker.jobs_completed} jobs
                        </div>
                      </div>
                      <BookingStatusPill status={b.status} />
                      <button className="h-9 w-9 grid place-items-center rounded-lg border border-line text-rose-400 hover:bg-rose-500/10" onClick={() => act(`/favorites/${b.worker.id}`, {}, "Saved to My workers")} aria-label="save worker" title="Save worker">
                        <Heart size={17} />
                      </button>
                    </div>

                    {b.status === "on_the_way" && (
                      <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-sm flex items-center gap-2 text-amber-300">
                        <Bike size={16} /> On the way · arriving in about <b>{b.tracking.eta_min} min</b> ({b.tracking.distance_km} km)
                      </div>
                    )}

                    {b.status !== "no_show" && (
                      <div className="grid grid-cols-5 gap-2">
                        {STEPS.map((s, i) => (
                          <div key={s}>
                            <div className={`h-1.5 rounded-full ${i <= idx ? "bg-brand-600" : "bg-surface-3"}`} />
                            <div className={`text-[11px] mt-1.5 font-medium ${i === idx ? "text-brand-300" : "text-muted"}`}>{t("b_" + s).split(" – ")[0]}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {b.check_in_at && (
                      <div className="text-xs text-muted flex flex-wrap gap-x-4">
                        <span className="flex items-center gap-1"><MapPin size={12} /> Checked in {new Date(b.check_in_at + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {b.check_out_at && <span className="flex items-center gap-1"><Check size={12} /> Finished {new Date(b.check_out_at + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                      </div>
                    )}
                    {(b.before_photos.length > 0 || b.after_photos.length > 0) && (
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          ["Before", b.before_photos],
                          ["After", b.after_photos],
                        ].map(([label, ps]: any) => (
                          <div key={label}>
                            <div className="text-xs font-medium text-muted mb-1">{label}</div>
                            <div className="flex gap-1.5 flex-wrap">
                              {ps.map((p: string) => (
                                <img key={p} src={fileUrl(p)} alt={label} className="h-20 w-20 object-cover rounded-lg border border-line" />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <a href={`tel:${b.worker.phone}`} className="btn-ghost !py-2">
                        <Phone size={16} /> {t("call")}
                      </a>
                      <button className="btn-ghost !py-2" onClick={() => setChatWith(chatWith?.id === b.worker.id ? null : b.worker)}>
                        <MessageCircle size={16} /> {t("chat")}
                      </button>
                      {b.status === "completed" && !b.payment && (
                        <button className="btn-primary !py-2" onClick={() => setPayFor(b)}>
                          <Wallet size={16} /> {t("confirm_done")} · {t("pay_now")}
                        </button>
                      )}
                      {b.status === "completed" && b.payment?.status === "held" && (
                        <button className="btn-primary !py-2" onClick={() => act(`/bookings/${b.id}/confirm`, {}, "Payment released")}>
                          <CircleCheck size={16} /> {t("confirm_done")} (release {money(b.payment.worker_amount)})
                        </button>
                      )}
                      {["paid", "completed"].includes(b.status) && !b.reviewed_by_customer && (b.payment?.status === "paid" || b.payment?.status === "pending") && (
                        <button className="btn-primary !py-2" onClick={() => setReviewFor(b)}>
                          <Star size={16} /> {t("rate_worker")}
                        </button>
                      )}
                      {["confirmed", "on_the_way"].includes(b.status) && (
                        <>
                          <button className="btn-ghost !py-2 text-rose-400" onClick={() => confirm("Worker did not come? We will find a replacement.") && act(`/bookings/${b.id}/no-show`, {}, "Finding a replacement worker")}>
                            <Ban size={16} /> {t("no_show")}
                          </button>
                          <button className="btn-ghost !py-2 text-muted" onClick={() => confirm("Cancel this worker?") && act(`/bookings/${b.id}/cancel`, {}, "Booking cancelled")}>
                            {t("cancel")}
                          </button>
                        </>
                      )}
                      {!b.dispute && ["arrived", "completed", "paid"].includes(b.status) && (
                        <button className="btn-ghost !py-2 text-muted" onClick={() => setDisputeFor(b)}>
                          <Scale size={16} /> {t("report_problem")}
                        </button>
                      )}
                    </div>
                    {b.payment?.status === "pending" && (
                      <div className="text-sm text-amber-300 flex items-center gap-1.5"><Banknote size={15} /> Please pay {money(b.payment.worker_amount)} in cash to the worker</div>
                    )}
                    {b.payment?.status === "paid" && (
                      <div className="text-sm text-emerald-300 flex items-center gap-1.5">
                        <CircleCheck size={15} /> Paid {money(b.payment.amount)} via {b.payment.method.toUpperCase()} {b.payment.reference && `· Ref ${b.payment.reference}`}
                      </div>
                    )}
                    {b.dispute && (
                      <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-amber-300 flex gap-2">
                        <Scale size={16} className="shrink-0 mt-0.5" /> Problem reported: {b.dispute.reason} — {b.dispute.status === "resolved" ? `Resolved: ${b.dispute.resolution}` : "our team is reviewing"}
                      </div>
                    )}
                    {chatWith?.id === b.worker.id && <Chat jobId={job.id} otherId={b.worker.id} otherName={b.worker.name} />}
                  </div>
                );
              })}
            </section>
          )}

          {/* matches */}
          {showMatches && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="section-title flex-1">
                  <Brain size={18} className="text-brand-400" /> {t("best_matches")}
                </div>
                <span className="text-sm text-muted">{matches.length} found</span>
              </div>
              {job.workers_required > 1 && groups.length > 0 && (
                <div className="card p-4">
                  <div className="font-medium flex items-center gap-2 mb-2.5 text-sm">
                    <Users size={16} className="text-brand-400" /> Need a team? Alert a whole worker group
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {groups.slice(0, 6).map((g) => (
                      <button key={g.id} className="chip bg-surface border border-line hover:border-brand-500/40" onClick={() => act(`/jobs/${id}/notify-group`, { group_id: g.id }, `Alerted ${g.size} workers in ${g.name}`)}>
                        {g.name} · {g.size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {matches.length === 0 && <div className="card p-8 text-center text-muted">{t("finding_workers")}…</div>}
              <div className="grid 2xl:grid-cols-2 gap-3">
                {matches.slice(0, 12).map((m: any) => (
                  <WorkerCard key={m.match_id} w={m.worker} score={m.score} reasons={m.reasons}>
                    <button className="btn-primary !py-2 flex-1" onClick={() => act(`/jobs/${id}/hire`, { worker_id: m.worker.id }, `${m.worker.name} hired`)}>
                      {t("hire")}
                    </button>
                    {m.status === "invited" ? (
                      <span className="chip bg-sun-500/10 text-sun-400"><Mail size={13} /> Invited</span>
                    ) : m.status === "notified" ? (
                      <span className="chip bg-surface-3 text-muted"><Bell size={13} /> Alerted</span>
                    ) : (
                      <button className="btn-ghost !py-2" onClick={() => act(`/jobs/${id}/invite`, { worker_id: m.worker.id }, "Invite sent")}>
                        {t("invite")}
                      </button>
                    )}
                    <button className="btn-ghost !py-2 !px-3" onClick={() => setDetail(m)} aria-label="match details" title="Why this score">
                      <Info size={16} />
                    </button>
                  </WorkerCard>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* side panel */}
        <aside className="space-y-4 xl:sticky xl:top-24">
          <div className="card p-3">
            <MapView center={[job.lat, job.lng]} height={320} fit markers={mapMarkers} line={tracking ? [[tracking.tracking.lat, tracking.tracking.lng], [job.lat, job.lng]] : undefined} circles={!tracking ? [{ lat: job.lat, lng: job.lng, radius: 3000, color: "#f97a2e", opacity: 0.06 }] : []} />
            <div className="flex gap-4 text-xs text-muted mt-2 px-1">
              {tracking ? (
                <span className="flex items-center gap-1.5"><Clock size={13} /> Live location updates every few seconds</span>
              ) : (
                <>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Available</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Busy</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-700" /> Your location</span>
                </>
              )}
            </div>
          </div>
          {job.tasks?.length > 0 && (
            <div className="card p-5">
              <div className="section-title mb-3">Work checklist</div>
              <ul className="space-y-2 text-sm">
                {job.tasks.map((x: string) => (
                  <li key={x} className="flex gap-2">
                    <Check size={16} className="text-brand-400 shrink-0 mt-0.5" /> {x}
                  </li>
                ))}
              </ul>
              {job.description && <p className="text-sm text-muted italic mt-3">“{job.description}”</p>}
            </div>
          )}
        </aside>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `${detail.worker.name} · ${Math.round(detail.score)}% match` : ""}>
        {detail && (
          <div className="space-y-4">
            <Breakdown parts={detail.breakdown} />
            <div className="rounded-lg bg-brand-500/10 border border-brand-500/25 p-3 text-sm">
              Predicted chance to accept: <b>{Math.round(detail.accept_prob * 100)}%</b>
              <div className="text-xs text-muted mt-1">Learned from past accept/decline history. Final score = 85% weighted signals + 15% predicted acceptance.</div>
            </div>
            <ul className="text-sm space-y-1.5">
              {detail.reasons.map((r: string) => (
                <li key={r} className="flex gap-2"><CircleCheck size={15} className="text-brand-400 mt-0.5 shrink-0" /> {clean(r)}</li>
              ))}
            </ul>
            {detail.worker.reliability?.completion_rate !== null && (
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["Completion", detail.worker.reliability.completion_rate + "%"],
                  ["On time", detail.worker.reliability.on_time_rate + "%"],
                  ["Repeat customers", detail.worker.repeat_customers],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-surface-2 border border-line p-2.5">
                    <div className="text-lg font-bold">{v}</div>
                    <div className="text-xs text-muted">{k}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
      <PayModal b={payFor} job={job} user={user} onClose={() => setPayFor(null)} onDone={() => { setPayFor(null); load(); }} />
      <ReviewModal b={reviewFor} title={t("rate_worker")} onClose={() => setReviewFor(null)} onDone={() => { setReviewFor(null); load(); say("Thank you"); }} tags={["On time", "Skilled", "Polite", "Clean work", "Good value", "Honest"]} />
      <DisputeModal b={disputeFor} onClose={() => setDisputeFor(null)} onDone={() => { setDisputeFor(null); load(); }} />
    </div>
  );
}

function PayModal({ b, job, user, onClose, onDone }: any) {
  const { t, toast } = useApp();
  const [method, setMethod] = useState("upi");
  const [tip, setTip] = useState(0);
  const [busy, setBusy] = useState(false);
  if (!b) return null;
  const rate = job.urgent ? 0.08 : 0.05;
  const fee = Math.max(10, Math.round(b.amount * (user.subscription === "homecare" ? rate / 2 : rate)));
  const total = b.amount + tip + fee;
  const upiLink = `upi://pay?pa=${encodeURIComponent(b.worker.upi_id || "kaamnear@upi")}&pn=${encodeURIComponent(b.worker.name)}&am=${total}&cu=INR&tn=${encodeURIComponent(job.title)}`;
  async function pay() {
    setBusy(true);
    try {
      await api(`/bookings/${b.id}/pay`, { body: { method, tip } });
      toast(method === "cash" ? "Please pay the worker in cash" : "Payment successful", "", "success");
      onDone();
    } catch (e: any) {
      toast("Payment failed", e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open onClose={onClose} title={t("pay_now")}>
      <div className="space-y-4">
        <div className="rounded-xl border border-line p-4 space-y-1.5 text-sm">
          <div className="flex justify-between"><span>Work by {b.worker.name}</span><span className="font-medium">{money(b.amount)}</span></div>
          {tip > 0 && <div className="flex justify-between"><span>Tip</span><span className="font-medium">{money(tip)}</span></div>}
          <div className="flex justify-between text-muted"><span>Platform fee {user.subscription === "homecare" && "(HomeCare half fee)"}</span><span>{money(fee)}</span></div>
          <div className="flex justify-between text-lg font-bold border-t border-line pt-2 mt-2"><span>Total</span><span>{money(total)}</span></div>
          <div className="text-xs text-muted">The worker receives {money(b.amount + tip)} — 100% of the agreed amount.</div>
        </div>
        <div>
          <div className="label">Add a tip</div>
          <div className="flex gap-2">
            {[0, 20, 50, 100].map((x) => (
              <button key={x} onClick={() => setTip(x)} className={`chip border ${tip === x ? "bg-brand-600 text-white border-brand-600" : "bg-surface border-line"}`}>
                {x ? `₹${x}` : "None"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            ["upi", Smartphone, "UPI"],
            ["online", CreditCard, "Card / Netbanking"],
            ["cash", Banknote, t("cash")],
          ].map(([id, Icon, label]: any) => (
            <button key={id} onClick={() => setMethod(id)} className={`tile py-3 ${method === id ? "tile-on" : ""}`}>
              <Icon size={22} className="text-brand-400" />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
        {method === "upi" && (
          <a href={upiLink} className="block text-center text-sm font-medium text-brand-300 underline">
            Open UPI app (GPay / PhonePe / Paytm)
          </a>
        )}
        <button className="btn-primary btn-lg w-full" disabled={busy} onClick={pay}>
          {method === "cash" ? "I will pay in cash" : `Pay ${money(total)}`}
        </button>
      </div>
    </Modal>
  );
}
