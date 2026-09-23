"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Phone, MessageCircle, Navigation, Share2, Siren, HardHat, ArrowLeft, MapPin, CalendarDays, Hourglass, Banknote, ShieldCheck, Check, Users, Zap, Repeat,
  Bike, CircleCheck, Banknote as Cash, Star, Scale, Ban, PartyPopper, X, Clock,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { SkillBadge, IconBadge } from "@/lib/icons";
import { useRequireUser, Loading, SpeakButton, BookingStatusPill, money, prettyDate, durLabel, Breakdown, Avatar, Stars, Modal } from "@/components/ui";
import MapView from "@/components/MapView";
import Chat, { PhotoPicker } from "@/components/Chat";
import { ReviewModal, DisputeModal } from "@/components/modals";

const SAFETY: Record<string, string> = {
  coconut_climbing: "Always use a climbing belt or safety harness. Don't climb wet trees.",
  arecanut_harvesting: "Use a harness; avoid climbing in rain or strong wind.",
  tree_trimming: "Keep people away from the fall area. Use gloves and eye protection.",
  electrical: "Switch off the main power before touching wires. Use insulated tools.",
  spraying: "Wear a mask, gloves and full sleeves. Wash hands before eating.",
  roofing: "Use a ladder held by someone; don't walk on weak tiles.",
  welding: "Use a welding mask and gloves. Keep water or sand nearby.",
};

export default function WorkerJob() {
  const user = useRequireUser("worker");
  const { id } = useParams<{ id: string }>();
  const { t, toast, say } = useApp();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [chat, setChat] = useState(false);
  const [review, setReview] = useState<any>(null);
  const [dispute, setDispute] = useState<any>(null);
  const [sos, setSos] = useState<any>(null);

  const load = () => api(`/jobs/${id}`).then(setJob).catch((e) => toast("Could not load job", e.message, "error"));
  useEffect(() => {
    if (!user) return;
    load();
    const iv = setInterval(load, 6000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  if (!user || !job) return <Loading />;
  const b = job.bookings.find((x: any) => x.worker_id === user.id && x.status !== "cancelled");

  function getPos(): Promise<{ lat?: number; lng?: number }> {
    return new Promise((res) =>
      navigator.geolocation
        ? navigator.geolocation.getCurrentPosition(
            (p) => (Math.abs(p.coords.latitude - 13.34) < 0.6 ? res({ lat: p.coords.latitude, lng: p.coords.longitude }) : res({})),
            () => res({}),
            { timeout: 3000 }
          )
        : res({})
    );
  }

  async function step(status: string) {
    const pos = await getPos();
    try {
      await api(`/bookings/${b.id}/status`, { body: { status, ...pos } });
      const msg: Record<string, string> = { on_the_way: "The customer knows you are coming", arrived: "Checked in at the work place", completed: "Great work! The customer will confirm and pay" };
      toast(msg[status], "", "success");
      say(msg[status]);
      load();
    } catch (e: any) {
      toast("Something went wrong", e.message, "error");
    }
  }

  async function accept() {
    try {
      await api(`/jobs/${id}/accept`, { body: {} });
      toast("Job accepted", "", "success");
      say("Job accepted");
      load();
    } catch (e: any) {
      toast("Could not accept", e.message, "error");
    }
  }

  async function triggerSos() {
    const pos = await getPos();
    const r = await api("/sos", { body: { booking_id: b?.id || 0, ...pos } });
    setSos(r);
  }

  const shareUrl = b ? `${window.location.origin}/track/${b.share_token}` : "";
  const share = async () => {
    const text = `I am going for work: ${job.title} at ${job.address}. Track me live: ${shareUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "KaamNear – my work", text, url: shareUrl });
        return;
      } catch {}
    }
    window.open(`https://wa.me/${user.trusted_contact?.phone ? "91" + user.trusted_contact.phone : ""}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const safety = (job.skills || []).filter((s: string) => SAFETY[s]);
  const big = "btn btn-lg w-full !text-lg !py-4";

  return (
    <div className="space-y-5">
      <button onClick={() => router.push("/worker")} className="text-sm text-muted hover:text-ink flex items-center gap-1.5">
        <ArrowLeft size={16} /> {t("home")}
      </button>
      <div className="grid xl:grid-cols-[minmax(0,1fr)_440px] gap-6 items-start">
        <div className="space-y-5 min-w-0">
          <div className="card p-5">
            <div className="flex gap-4 items-start">
              <SkillBadge skill={job.skills[0]} size={56} tone={job.urgent ? "rose" : "brand"} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {job.urgent && <span className="chip !text-xs bg-rose-600 text-white"><Zap size={12} /> {t("urgent")}</span>}
                  {b && <BookingStatusPill status={b.status} />}
                  {job.recurring?.freq && <span className="chip !text-xs bg-violet-500/10 text-violet-300"><Repeat size={12} /> Every {job.recurring.day}</span>}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{job.title}</h1>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-bold text-brand-300">{money(job.budget)}</div>
                {job.workers_required > 1 && <div className="text-xs text-muted">per person</div>}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-5 text-sm">
              {[
                [MapPin, `${job.distance_km} km · ${job.address}`],
                [CalendarDays, `${prettyDate(job.date, t)} · ${t(job.time_slot === "asap" ? "asap" : job.time_slot)}`],
                [Hourglass, durLabel(job.duration)],
                [job.escrow ? ShieldCheck : Banknote, job.escrow ? "Secure online payment" : `Payment: ${job.payment_method.toUpperCase()}`],
              ].map(([Icon, txt]: any) => (
                <div key={txt} className="rounded-lg bg-surface-2 border border-line px-3 py-2.5 flex items-center gap-2">
                  <Icon size={16} className="text-muted shrink-0" />
                  <span className="truncate">{txt}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <SpeakButton text={`${job.title}. ${job.budget} rupees. ${job.distance_km} ${t("km_away")}. ${prettyDate(job.date, t)}. ${job.tasks?.join(". ")}`} />
              <span className="text-sm text-muted">{t("read_aloud")}</span>
            </div>
          </div>

          {/* primary actions */}
          {!b && job.status === "open" && job.slots_left > 0 && (
            <div className="grid sm:grid-cols-3 gap-3">
              <button className={`${big} bg-brand-600 hover:bg-brand-700 text-white sm:col-span-2`} onClick={accept}>
                <Check size={22} /> {t("accept")}
              </button>
              <button
                className={`${big} btn-ghost`}
                onClick={async () => {
                  await api(`/jobs/${id}/decline`, { body: {} });
                  router.push("/worker");
                }}
              >
                <X size={20} /> {t("decline")}
              </button>
            </div>
          )}
          {!b && job.status !== "open" && <div className="card p-5 text-center text-muted">This job is no longer available.</div>}

          {b && (
            <div className="card p-5 space-y-4">
              {b.status === "confirmed" && (
                <motion.button whileTap={{ scale: 0.98 }} className={`${big} bg-sun-500 hover:bg-sun-600 text-white`} onClick={() => step("on_the_way")}>
                  <Bike size={22} /> {t("start_trip")}
                </motion.button>
              )}
              {b.status === "on_the_way" && (
                <motion.button whileTap={{ scale: 0.98 }} className={`${big} bg-brand-600 hover:bg-brand-700 text-white`} onClick={() => step("arrived")}>
                  <MapPin size={22} /> {t("arrived")}
                </motion.button>
              )}
              {b.status === "arrived" && (
                <div className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <PhotoPicker label={t("before_photo")} photos={b.before_photos} onAdd={(url) => api(`/bookings/${b.id}/photos`, { body: { stage: "before", url } }).then(load)} />
                    <PhotoPicker label={t("after_photo")} photos={b.after_photos} onAdd={(url) => api(`/bookings/${b.id}/photos`, { body: { stage: "after", url } }).then(load)} />
                  </div>
                  <motion.button whileTap={{ scale: 0.98 }} className={`${big} bg-brand-600 hover:bg-brand-700 text-white`} onClick={() => step("completed")}>
                    <CircleCheck size={22} /> {t("work_done")}
                  </motion.button>
                </div>
              )}
              {b.status === "completed" && (
                <div className="text-center space-y-3">
                  {!b.payment && (
                    <div className="text-muted flex items-center justify-center gap-2">
                      <Clock size={17} /> Waiting for the customer to confirm and pay {money(b.amount)}
                    </div>
                  )}
                  {b.payment?.status === "held" && (
                    <div className="text-brand-300 flex items-center justify-center gap-2">
                      <ShieldCheck size={17} /> {money(b.payment.worker_amount)} is held safely — released when the customer confirms
                    </div>
                  )}
                  {b.payment?.status === "pending" && (
                    <button className={`${big} bg-emerald-600 hover:bg-emerald-700 text-white`} onClick={() => api(`/bookings/${b.id}/cash-received`, { body: {} }).then(() => { toast("Payment recorded", "", "success"); load(); })}>
                      <Cash size={22} /> {t("cash_received")} · {money(b.payment.worker_amount)}
                    </button>
                  )}
                </div>
              )}
              {b.status === "paid" && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-5 flex items-center gap-4">
                  <IconBadge icon={PartyPopper} size={52} tone="brand" />
                  <div>
                    <div className="text-xl font-bold text-emerald-300">{money(b.payment?.worker_amount || b.amount)} received</div>
                    {b.payment?.reference && <div className="text-sm text-muted">Reference {b.payment.reference}</div>}
                  </div>
                </div>
              )}
              {["completed", "paid"].includes(b.status) && !b.reviewed_by_worker && (
                <button className="btn-primary w-full" onClick={() => setReview(b)}>
                  <Star size={17} /> {t("rate_customer")}
                </button>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <a className="btn-ghost" href={`https://www.google.com/maps/dir/?api=1&destination=${job.lat},${job.lng}`} target="_blank" rel="noreferrer">
                  <Navigation size={17} /> Directions
                </a>
                <button className="btn-ghost" onClick={() => setChat(!chat)}>
                  <MessageCircle size={17} /> {t("chat")}
                </button>
                <button className="btn-ghost" onClick={share}>
                  <Share2 size={17} /> {t("share_trip")}
                </button>
                <button className="btn-danger" onClick={triggerSos}>
                  <Siren size={17} /> {t("sos")}
                </button>
              </div>
              {chat && <Chat jobId={job.id} otherId={job.customer_id} otherName={job.customer.name} />}
              <div className="flex flex-wrap gap-2">
                {["confirmed", "on_the_way"].includes(b.status) && (
                  <button className="btn-ghost !py-2 text-sm text-rose-400" onClick={() => confirm("Cancel this job? It lowers your reliability score.") && api(`/bookings/${b.id}/cancel`, { body: {} }).then(load)}>
                    <Ban size={15} /> {t("cancel")}
                  </button>
                )}
                {!b.dispute && ["arrived", "completed", "paid"].includes(b.status) && (
                  <button className="btn-ghost !py-2 text-sm text-muted" onClick={() => setDispute(b)}>
                    <Scale size={15} /> {t("report_problem")}
                  </button>
                )}
              </div>
              {b.dispute && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-amber-300 flex gap-2">
                  <Scale size={16} /> {b.dispute.reason} — {b.dispute.status}
                </div>
              )}
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-5">
            {job.tasks?.length > 0 && (
              <div className="card p-5">
                <div className="section-title mb-3">Work checklist</div>
                <ul className="space-y-2 text-sm">
                  {job.tasks.map((x: string) => (
                    <li key={x} className="flex gap-2">
                      <Check size={16} className="text-brand-400 mt-0.5 shrink-0" /> {x}
                    </li>
                  ))}
                </ul>
                {job.description && <p className="mt-3 text-sm text-muted italic">“{job.description}”</p>}
              </div>
            )}
            {!b && job.my_match && (
              <div className="card p-5">
                <div className="section-title mb-3">Why you got this job · {Math.round(job.my_match.score)}% match</div>
                <Breakdown parts={job.my_match.breakdown} />
              </div>
            )}
            {safety.length > 0 && (
              <div className="card p-5 border-amber-500/30 bg-amber-500/10">
                <div className="section-title text-amber-300 mb-2">
                  <HardHat size={18} /> {t("safety_tip")}
                </div>
                <ul className="space-y-1.5 text-sm text-amber-300">
                  {safety.map((s: string) => (
                    <li key={s}>{SAFETY[s]}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <div className="card p-3">
            <MapView
              center={[job.lat, job.lng]}
              height={340}
              fit
              markers={[
                { lat: job.lat, lng: job.lng, kind: job.urgent ? "urgent" : "job", size: 34, popup: job.address },
                { lat: b?.tracking?.lat ?? user.lat, lng: b?.tracking?.lng ?? user.lng, kind: b?.status === "on_the_way" ? "vehicle" : "home", popup: "You", size: 30 },
              ]}
            />
          </div>
          <div className="card p-5">
            <div className="text-xs font-medium text-muted uppercase tracking-wider mb-3">Customer</div>
            <div className="flex items-center gap-3">
              <Avatar name={job.customer.name} size={46} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{job.customer.name}</div>
                <Stars value={job.customer.customer.rating} count={job.customer.customer.rating_count} />
              </div>
              {b && (
                <a href={`tel:${job.customer.phone}`} className="h-10 w-10 rounded-lg bg-brand-600 text-white grid place-items-center" aria-label={t("call")}>
                  <Phone size={18} />
                </a>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 text-center text-sm">
              <div className="rounded-lg bg-surface-2 border border-line p-2.5">
                <div className="font-bold">{job.customer.customer.payments_completed}</div>
                <div className="text-xs text-muted">Payments made</div>
              </div>
              <div className="rounded-lg bg-surface-2 border border-line p-2.5">
                <div className={`font-bold ${job.customer.customer.cancellations > 0 ? "text-amber-300" : ""}`}>{job.customer.customer.cancellations}</div>
                <div className="text-xs text-muted">Cancellations</div>
              </div>
            </div>
          </div>
          {job.workers_required > 1 && (
            <div className="card p-5 text-sm">
              <div className="section-title mb-2">
                <Users size={17} className="text-brand-400" /> Team job
              </div>
              <div className="text-muted">
                {job.workers_required} workers needed · {job.slots_left} places left
              </div>
              {job.confirmed_team?.length > 0 && <div className="mt-1">Confirmed: {job.confirmed_team.join(", ")}</div>}
            </div>
          )}
        </aside>
      </div>

      <ReviewModal b={review} title={t("rate_customer")} tags={["Paid on time", "Polite", "Clear instructions", "Gave water/food", "Safe place"]} onClose={() => setReview(null)} onDone={() => { setReview(null); load(); }} />
      <DisputeModal b={dispute} onClose={() => setDispute(null)} onDone={() => { setDispute(null); load(); }} />
      <Modal open={!!sos} onClose={() => setSos(null)} title="SOS alert sent">
        <div className="space-y-3">
          <p className="text-muted">Our safety team has been alerted with your location.</p>
          <a href="tel:112" className="btn-danger btn-lg w-full">
            <Phone size={18} /> Call 112 (Emergency)
          </a>
          {sos?.trusted_contact?.phone && (
            <a href={`tel:${sos.trusted_contact.phone}`} className="btn-ghost btn-lg w-full">
              <Phone size={18} /> Call {sos.trusted_contact.name}
            </a>
          )}
          <button className="btn-ghost w-full" onClick={share}>
            <Share2 size={17} /> Send my live location
          </button>
        </div>
      </Modal>
    </div>
  );
}
