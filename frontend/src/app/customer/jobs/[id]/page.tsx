"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Phone, MessageCircle, RefreshCw, Heart, ChevronDown, ChevronUp, Users, AlertTriangle } from "lucide-react";
import { useApp } from "@/lib/store";
import { api, fileUrl } from "@/lib/api";
import {
  useRequireUser, Loading, SpeakButton, JobStatusPill, BookingStatusPill, money, prettyDate, durLabel, Breakdown, Modal, Avatar, Stars,
} from "@/components/ui";
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
  const [open, setOpen] = useState<number | null>(null);
  const [chatWith, setChatWith] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [payFor, setPayFor] = useState<any>(null);
  const [reviewFor, setReviewFor] = useState<any>(null);
  const [disputeFor, setDisputeFor] = useState<any>(null);
  const [isNew, setIsNew] = useState(false);

  const load = () => api(`/jobs/${id}`).then(setJob).catch((e) => toast("❌", e.message));

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
      if (msg) toast(msg);
      load();
    } catch (e: any) {
      toast("❌", e.message);
    }
  }

  const bookings = job.bookings.filter((b: any) => !["cancelled"].includes(b.status));
  const hiredIds = new Set(bookings.filter((b: any) => b.status !== "no_show").map((b: any) => b.worker_id));
  const matches = (job.matches || []).filter((m: any) => !hiredIds.has(m.worker.id) && m.status !== "declined");
  const tracking = bookings.find((b: any) => b.status === "on_the_way");

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="card p-5">
        <div className="flex gap-3 items-start">
          <span className="h-16 w-16 rounded-2xl bg-brand-50 grid place-items-center text-4xl shrink-0">{job.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1 mb-1">
              <JobStatusPill status={job.status} />
              {job.urgent && <span className="chip !text-xs bg-red-600 text-white">⚡ {t("urgent")}</span>}
              {job.recurring?.freq && <span className="chip !text-xs bg-violet-100 text-violet-700">🔁 Every {job.recurring.day}</span>}
              {job.escrow && <span className="chip !text-xs bg-brand-100 text-brand-800">🛡️ Safe pay</span>}
            </div>
            <h1 className="text-2xl font-black leading-tight">{job.title}</h1>
            <div className="text-muted font-semibold text-sm mt-1">
              📍 {job.address} • 📅 {prettyDate(job.date, t)} • {t(job.time_slot === "asap" ? "asap" : job.time_slot)} • ⏳ {durLabel(job.duration)}
            </div>
            <div className="font-black text-xl text-brand-700 mt-1">
              {money(job.budget)}
              {job.workers_required > 1 && <span className="text-sm text-muted"> × {job.workers_required} workers</span>}
            </div>
          </div>
          <SpeakButton text={`${job.title}. ${t("status_" + job.status)}. ${matches.length} workers matched.`} />
        </div>
        {job.tasks?.length > 0 && (
          <div className="mt-3 grid sm:grid-cols-2 gap-1 text-sm font-semibold text-muted">
            {job.tasks.map((x: string) => (
              <div key={x}>✔️ {x}</div>
            ))}
          </div>
        )}
        {job.flags?.length > 0 && (
          <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-800 flex gap-2">
            <AlertTriangle size={18} /> {job.flags.join(" • ")}
          </div>
        )}
        {["open", "assigned"].includes(job.status) && (
          <div className="mt-3 flex gap-2">
            <button className="btn-ghost !py-2 text-sm" onClick={() => act(`/jobs/${id}/rematch`, {}, "🔔 Alerted more workers")}>
              <RefreshCw size={16} /> Find more workers
            </button>
            <button
              className="btn-ghost !py-2 text-sm text-red-600"
              onClick={() => {
                if (confirm("Cancel this job?")) act(`/jobs/${id}/cancel`, {}, "Job cancelled");
              }}
            >
              {t("cancel")}
            </button>
          </div>
        )}
      </div>

      {isNew && job.status === "open" && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card p-5 bg-gradient-to-r from-brand-600 to-emerald-500 text-white">
          <div className="text-xl font-black">🎉 Your job is live!</div>
          <div className="font-semibold">We sent alerts to the best {Math.min(matches.length, Math.max(5, job.workers_required * 3))} workers near you. Workers who accept will appear below — or hire one directly.</div>
        </motion.div>
      )}

      {/* bookings */}
      {bookings.length > 0 && (
        <section className="space-y-3">
          <h2 className="section-title">
            👷 {t("status_assigned")} ({bookings.filter((b: any) => b.status !== "no_show").length}/{job.workers_required})
          </h2>
          {tracking && (
            <div className="card p-3">
              <div className="flex items-center gap-2 mb-2 font-extrabold">
                🛵 {tracking.worker.name} {t("b_on_the_way").toLowerCase()} •
                <span className="text-brand-700">
                  {tracking.tracking.eta_min} min • {tracking.tracking.distance_km} km
                </span>
              </div>
              <MapView
                center={[job.lat, job.lng]}
                height={260}
                fit
                markers={[
                  { lat: job.lat, lng: job.lng, emoji: "🏠", popup: "Work location", size: 32 },
                  { lat: tracking.tracking.lat, lng: tracking.tracking.lng, emoji: "🛵", popup: tracking.worker.name, size: 34 },
                ]}
                line={[
                  [tracking.tracking.lat, tracking.tracking.lng],
                  [job.lat, job.lng],
                ]}
              />
            </div>
          )}
          {bookings.map((b: any) => {
            const idx = STEPS.indexOf(b.status);
            return (
              <div key={b.id} className="card p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar name={b.worker.name} size={56} online={b.worker.available} />
                  <div className="flex-1 min-w-0">
                    <a href={`/workers/${b.worker.id}`} className="font-extrabold text-lg hover:underline">
                      {b.worker.name}
                    </a>
                    <div className="flex gap-2 items-center text-sm text-muted font-semibold">
                      <Stars value={b.worker.rating} count={b.worker.rating_count} /> • {b.worker.jobs_completed} jobs
                    </div>
                    <BookingStatusPill status={b.status} />
                  </div>
                  <button className="h-11 w-11 grid place-items-center rounded-full bg-pink-50 text-pink-600" onClick={() => act(`/favorites/${b.worker.id}`, {}, "❤️ Saved to My workers")} aria-label="save">
                    <Heart size={20} />
                  </button>
                </div>

                {b.status !== "no_show" && (
                  <div className="flex items-center gap-1">
                    {STEPS.map((s, i) => (
                      <div key={s} className="flex-1">
                        <div className={`h-2 rounded-full ${i <= idx ? "bg-brand-500" : "bg-black/10"}`} />
                        <div className={`text-[10px] mt-1 font-bold text-center ${i === idx ? "text-brand-700" : "text-muted"}`}>{t("b_" + s).split(" – ")[0]}</div>
                      </div>
                    ))}
                  </div>
                )}

                {b.check_in_at && (
                  <div className="text-xs text-muted font-semibold">
                    📍 Checked in {new Date(b.check_in_at + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {b.check_out_at && ` • ✅ Finished ${new Date(b.check_out_at + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                  </div>
                )}
                {(b.before_photos.length > 0 || b.after_photos.length > 0) && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["Before", b.before_photos],
                      ["After", b.after_photos],
                    ].map(([label, ps]: any) => (
                      <div key={label}>
                        <div className="text-xs font-bold text-muted">{label}</div>
                        <div className="flex gap-1 flex-wrap">
                          {ps.map((p: string) => (
                            <img key={p} src={fileUrl(p)} alt={label} className="h-20 w-20 object-cover rounded-xl" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <a href={`tel:${b.worker.phone}`} className="btn-ghost !py-2">
                    <Phone size={18} /> {t("call")}
                  </a>
                  <button className="btn-ghost !py-2" onClick={() => setChatWith(chatWith?.id === b.worker.id ? null : b.worker)}>
                    <MessageCircle size={18} /> {t("chat")}
                  </button>
                  {b.status === "completed" && !b.payment && (
                    <button className="btn-sun !py-2" onClick={() => setPayFor(b)}>
                      💰 {t("confirm_done")} → {t("pay_now")}
                    </button>
                  )}
                  {b.status === "completed" && b.payment?.status === "held" && (
                    <button className="btn-sun !py-2" onClick={() => act(`/bookings/${b.id}/confirm`, {}, "💰 Payment released")}>
                      ✅ {t("confirm_done")} (release {money(b.payment.worker_amount)})
                    </button>
                  )}
                  {b.payment?.status === "pending" && <span className="chip bg-amber-100 text-amber-800">💵 Pay {money(b.payment.worker_amount)} cash to worker</span>}
                  {["paid", "completed"].includes(b.status) && !b.reviewed_by_customer && (b.payment?.status === "paid" || b.payment?.status === "pending") && (
                    <button className="btn-primary !py-2" onClick={() => setReviewFor(b)}>
                      ⭐ {t("rate_worker")}
                    </button>
                  )}
                  {["confirmed", "on_the_way"].includes(b.status) && (
                    <>
                      <button className="btn-ghost !py-2 text-red-600" onClick={() => confirm("Worker did not come? We will find a replacement.") && act(`/bookings/${b.id}/no-show`, {}, "🔁 Finding a replacement worker")}>
                        🚫 {t("no_show")}
                      </button>
                      <button className="btn-ghost !py-2 text-muted" onClick={() => confirm("Cancel this worker?") && act(`/bookings/${b.id}/cancel`, {}, "Cancelled")}>
                        {t("cancel")}
                      </button>
                    </>
                  )}
                  {!b.dispute && ["arrived", "completed", "paid"].includes(b.status) && (
                    <button className="btn-ghost !py-2 text-muted" onClick={() => setDisputeFor(b)}>
                      ⚖️ {t("report_problem")}
                    </button>
                  )}
                </div>
                {b.payment?.status === "paid" && (
                  <div className="text-sm font-bold text-green-700">
                    ✅ Paid {money(b.payment.amount)} via {b.payment.method.toUpperCase()} {b.payment.reference && `• Ref ${b.payment.reference}`}
                  </div>
                )}
                {b.dispute && (
                  <div className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-800">
                    ⚖️ Problem reported: {b.dispute.reason} — {b.dispute.status === "resolved" ? `Resolved: ${b.dispute.resolution}` : "Our team is reviewing"}
                  </div>
                )}
                {chatWith?.id === b.worker.id && <Chat jobId={job.id} otherId={b.worker.id} otherName={b.worker.name} />}
              </div>
            );
          })}
        </section>
      )}

      {/* matches */}
      {job.status !== "cancelled" && job.slots_left > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="section-title flex-1">🧠 {t("best_matches")}</h2>
            <span className="text-sm font-bold text-muted">{matches.length} found</span>
          </div>
          {job.status === "open" && (
            <MapView
              center={[job.lat, job.lng]}
              height={220}
              fit
              markers={[
                { lat: job.lat, lng: job.lng, emoji: "📍", popup: job.title, size: 34 },
                ...matches.slice(0, 10).map((m: any) => ({ lat: m.worker.lat, lng: m.worker.lng, emoji: m.worker.available ? "👷" : "🧑", popup: `${m.worker.name} • ${Math.round(m.score)}%` })),
              ]}
              circles={[{ lat: job.lat, lng: job.lng, radius: 3000, color: "#10b981", opacity: 0.08 }]}
            />
          )}
          {job.workers_required > 1 && groups.length > 0 && (
            <div className="card p-4">
              <div className="font-extrabold flex items-center gap-2 mb-2">
                <Users size={18} /> Need a team? Alert a whole worker group
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {groups.slice(0, 6).map((g) => (
                  <button key={g.id} className="chip bg-sun-50 border border-sun-200 shrink-0" onClick={() => act(`/jobs/${id}/notify-group`, { group_id: g.id }, `👥 Alerted ${g.size} workers in ${g.name}`)}>
                    {g.icon} {g.name} ({g.size})
                  </button>
                ))}
              </div>
            </div>
          )}
          {matches.length === 0 && <div className="card p-6 text-center font-bold text-muted">🔎 {t("finding_workers")}…</div>}
          {matches.slice(0, 12).map((m: any) => (
            <WorkerCard key={m.match_id} w={m.worker} score={m.score} reasons={m.reasons}>
              <button className="btn-primary !py-2 flex-1" onClick={() => act(`/jobs/${id}/hire`, { worker_id: m.worker.id }, `✅ ${m.worker.name} hired`)}>
                {t("hire")}
              </button>
              {m.status === "invited" ? (
                <span className="chip bg-sun-100 text-sun-600">📩 Invited</span>
              ) : m.status === "notified" ? (
                <span className="chip bg-gray-100 text-muted">🔔 Alerted</span>
              ) : (
                <button className="btn-ghost !py-2" onClick={() => act(`/jobs/${id}/invite`, { worker_id: m.worker.id }, "📩 Invite sent")}>
                  {t("invite")}
                </button>
              )}
              <button className="btn-ghost !py-2 !px-3" onClick={() => setOpen(open === m.match_id ? null : m.match_id)} aria-label="details">
                {open === m.match_id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {open === m.match_id && <div />}
            </WorkerCard>
          ))}
          {matches.slice(0, 12).some((m: any) => m.match_id === open) && (
            <MatchDetail m={matches.find((x: any) => x.match_id === open)} onClose={() => setOpen(null)} />
          )}
        </section>
      )}

      <PayModal b={payFor} job={job} user={user} onClose={() => setPayFor(null)} onDone={() => { setPayFor(null); load(); }} />
      <ReviewModal b={reviewFor} title={t("rate_worker")} onClose={() => setReviewFor(null)} onDone={() => { setReviewFor(null); load(); say("Thank you"); }} tags={["On time", "Skilled", "Polite", "Clean work", "Good value", "Honest"]} />
      <DisputeModal b={disputeFor} onClose={() => setDisputeFor(null)} onDone={() => { setDisputeFor(null); load(); }} />
      <div className="h-4" />
      <button className="btn-ghost w-full" onClick={() => router.push("/customer")}>
        ← {t("home")}
      </button>
    </div>
  );
}

function MatchDetail({ m, onClose }: { m: any; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={`Why ${m.worker.name}? – ${Math.round(m.score)}% match`}>
      <Breakdown parts={m.breakdown} />
      <div className="mt-4 rounded-2xl bg-brand-50 p-3 text-sm font-semibold">
        🤖 Predicted chance to accept: <b>{Math.round(m.accept_prob * 100)}%</b>
        <div className="text-xs text-muted mt-1">Learned from past accept/decline history (logistic regression). Final score = 85% weighted rules + 15% predicted acceptance.</div>
      </div>
      <div className="mt-3 text-sm font-semibold space-y-1">
        {m.reasons.map((r: string) => (
          <div key={r}>• {r}</div>
        ))}
      </div>
      {m.worker.reliability?.completion_rate !== null && (
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="rounded-2xl bg-gray-50 p-2">
            <div className="text-xl font-black">{m.worker.reliability.completion_rate}%</div>
            <div className="text-xs text-muted font-bold">Completion</div>
          </div>
          <div className="rounded-2xl bg-gray-50 p-2">
            <div className="text-xl font-black">{m.worker.reliability.on_time_rate}%</div>
            <div className="text-xs text-muted font-bold">On time</div>
          </div>
          <div className="rounded-2xl bg-gray-50 p-2">
            <div className="text-xl font-black">{m.worker.repeat_customers}</div>
            <div className="text-xs text-muted font-bold">Repeat customers</div>
          </div>
        </div>
      )}
    </Modal>
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
      toast(method === "cash" ? "💵 Please give cash to the worker" : "✅ Payment successful");
      onDone();
    } catch (e: any) {
      toast("❌", e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open onClose={onClose} title={`💰 ${t("pay_now")}`}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-gray-50 p-4 space-y-1 font-semibold">
          <div className="flex justify-between">
            <span>Work ({b.worker.name})</span>
            <span>{money(b.amount)}</span>
          </div>
          {tip > 0 && (
            <div className="flex justify-between">
              <span>Tip 🙏</span>
              <span>{money(tip)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted text-sm">
            <span>Platform fee {user.subscription === "homecare" && "(HomeCare ½)"}</span>
            <span>{money(fee)}</span>
          </div>
          <div className="flex justify-between text-xl font-black border-t pt-2 mt-2">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
          <div className="text-xs text-muted">Worker receives {money(b.amount + tip)} – 100% of the agreed amount.</div>
        </div>
        <div>
          <div className="label">Add a tip?</div>
          <div className="flex gap-2">
            {[0, 20, 50, 100].map((x) => (
              <button key={x} onClick={() => setTip(x)} className={`chip ${tip === x ? "bg-brand-600 text-white" : "bg-gray-100"}`}>
                {x ? `₹${x}` : "No"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["upi", "📲", "UPI"],
            ["online", "💳", "Card / Net"],
            ["cash", "💵", t("cash")],
          ].map(([id, icon, label]) => (
            <button key={id} onClick={() => setMethod(id)} className={`tile py-3 ${method === id ? "tile-on" : ""}`}>
              <span className="text-2xl">{icon}</span>
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
        {method === "upi" && (
          <a href={upiLink} className="block text-center text-sm font-bold text-sky-700 underline">
            Open UPI app (GPay / PhonePe / Paytm) →
          </a>
        )}
        <button className="btn-sun btn-lg w-full" disabled={busy} onClick={pay}>
          {method === "cash" ? "I will pay cash" : `Pay ${money(total)}`}
        </button>
      </div>
    </Modal>
  );
}

