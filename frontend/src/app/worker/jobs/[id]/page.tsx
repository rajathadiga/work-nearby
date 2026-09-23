"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Phone, MessageCircle, Navigation, Share2, ShieldAlert, HardHat } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { useRequireUser, Loading, SpeakButton, BookingStatusPill, money, prettyDate, durLabel, Breakdown, Avatar, Stars, Modal } from "@/components/ui";
import MapView from "@/components/MapView";
import Chat, { PhotoPicker } from "@/components/Chat";
import { ReviewModal, DisputeModal } from "@/components/modals";

const SAFETY: Record<string, string> = {
  coconut_climbing: "Always use a climbing belt / safety harness. Don't climb wet trees.",
  arecanut_harvesting: "Use harness; avoid climbing in rain or strong wind.",
  tree_trimming: "Keep people away from the fall area. Use gloves and eye protection.",
  electrical: "Switch off the main power before touching wires. Use insulated tools.",
  spraying: "Wear mask, gloves & full sleeves. Wash hands before eating.",
  roofing: "Use a ladder held by someone; don't walk on weak tiles.",
  welding: "Use welding mask & gloves. Keep water/sand nearby.",
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

  const load = () => api(`/jobs/${id}`).then(setJob).catch((e) => toast("❌", e.message));
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
      const msg: Record<string, string> = { on_the_way: "🛵 Customer knows you are coming", arrived: "📍 Checked in", completed: "✅ Great work! Customer will confirm & pay" };
      toast(msg[status]);
      say(msg[status].replace(/^\S+ /, ""));
      load();
    } catch (e: any) {
      toast("❌", e.message);
    }
  }

  async function accept() {
    try {
      await api(`/jobs/${id}/accept`, { body: {} });
      toast("🎉 Job accepted!");
      say("Job accepted");
      load();
    } catch (e: any) {
      toast("❌", e.message);
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
  const bigBtn = "btn btn-lg w-full text-xl !py-5";

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex gap-3 items-start">
          <span className="h-16 w-16 rounded-2xl bg-brand-50 grid place-items-center text-4xl shrink-0">{job.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1 mb-1">
              {job.urgent && <span className="chip !text-xs bg-red-600 text-white">⚡ {t("urgent")}</span>}
              {b && <BookingStatusPill status={b.status} />}
              {job.recurring?.freq && <span className="chip !text-xs bg-violet-100 text-violet-700">🔁 Every {job.recurring.day}</span>}
            </div>
            <h1 className="text-2xl font-black leading-tight">{job.title}</h1>
            <div className="text-3xl font-black text-brand-700 mt-1">
              {money(job.budget)}
              {job.workers_required > 1 && <span className="text-sm text-muted"> /person</span>}
            </div>
          </div>
          <SpeakButton text={`${job.title}. ${money(job.budget)}. ${job.distance_km} ${t("km_away")}. ${prettyDate(job.date, t)}. ${job.tasks?.join(". ")}`} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4 text-sm font-bold">
          <div className="rounded-2xl bg-gray-50 p-3">📍 {job.distance_km} km • {job.address}</div>
          <div className="rounded-2xl bg-gray-50 p-3">
            📅 {prettyDate(job.date, t)} • {t(job.time_slot === "asap" ? "asap" : job.time_slot)}
          </div>
          <div className="rounded-2xl bg-gray-50 p-3">⏳ {durLabel(job.duration)}</div>
          <div className="rounded-2xl bg-gray-50 p-3">
            💵 {job.payment_method.toUpperCase()} {job.escrow && "• 🛡️ money held safely"}
          </div>
        </div>
        {job.tasks?.length > 0 && (
          <div className="mt-3 space-y-1 font-semibold">
            {job.tasks.map((x: string) => (
              <div key={x}>✔️ {x}</div>
            ))}
          </div>
        )}
        {job.description && <p className="mt-3 text-muted italic font-semibold">“{job.description}”</p>}
        {job.workers_required > 1 && (
          <div className="mt-3 rounded-2xl bg-sky-50 p-3 text-sm font-bold text-sky-900">
            👥 Team job: {job.workers_required} workers • {job.slots_left} places left
            {job.confirmed_team?.length > 0 && <div className="font-semibold">Confirmed: {job.confirmed_team.join(", ")}</div>}
          </div>
        )}
      </div>

      {safety.length > 0 && (
        <div className="card p-4 bg-amber-50 border-2 border-amber-200">
          <div className="font-black flex items-center gap-2 text-amber-800">
            <HardHat /> {t("safety_tip")}
          </div>
          {safety.map((s: string) => (
            <div key={s} className="font-semibold text-amber-900 mt-1">
              • {SAFETY[s]}
            </div>
          ))}
        </div>
      )}

      <MapView
        center={[job.lat, job.lng]}
        height={230}
        fit
        markers={[
          { lat: job.lat, lng: job.lng, emoji: job.icon, size: 34, popup: job.address },
          { lat: b?.tracking?.lat ?? user.lat, lng: b?.tracking?.lng ?? user.lng, emoji: b?.status === "on_the_way" ? "🛵" : "🏠", popup: "You" },
        ]}
      />

      {/* customer */}
      <div className="card p-4 flex items-center gap-3">
        <Avatar name={job.customer.name} size={52} />
        <div className="flex-1 min-w-0">
          <div className="font-extrabold">{job.customer.name}</div>
          <div className="text-sm text-muted font-semibold flex flex-wrap gap-x-3">
            <Stars value={job.customer.customer.rating} count={job.customer.customer.rating_count} />
            <span>💳 {job.customer.customer.payments_completed} paid</span>
            {job.customer.customer.cancellations > 0 && <span className="text-amber-700">⚠️ {job.customer.customer.cancellations} cancelled</span>}
          </div>
        </div>
        {b && (
          <a href={`tel:${job.customer.phone}`} className="h-12 w-12 rounded-full bg-brand-600 text-white grid place-items-center" aria-label={t("call")}>
            <Phone />
          </a>
        )}
      </div>

      {!b && job.my_match && (
        <div className="card p-4">
          <div className="font-extrabold mb-2">🧠 Why you got this job – {Math.round(job.my_match.score)}% match</div>
          <Breakdown parts={job.my_match.breakdown} />
        </div>
      )}

      {/* actions */}
      {!b && job.status === "open" && job.slots_left > 0 && (
        <div className="flex gap-3">
          <button className={`${bigBtn} bg-brand-600 text-white flex-[2]`} onClick={accept}>
            ✅ {t("accept")}
          </button>
          <button
            className={`${bigBtn} btn-ghost flex-1`}
            onClick={async () => {
              await api(`/jobs/${id}/decline`, { body: {} });
              router.push("/worker");
            }}
          >
            {t("decline")}
          </button>
        </div>
      )}
      {!b && job.status !== "open" && <div className="card p-4 text-center font-bold text-muted">This job is no longer available.</div>}

      {b && (
        <div className="space-y-3">
          {b.status === "confirmed" && (
            <motion.button whileTap={{ scale: 0.97 }} className={`${bigBtn} bg-sun-500 text-white`} onClick={() => step("on_the_way")}>
              🛵 {t("start_trip")}
            </motion.button>
          )}
          {b.status === "on_the_way" && (
            <motion.button whileTap={{ scale: 0.97 }} className={`${bigBtn} bg-brand-600 text-white`} onClick={() => step("arrived")}>
              📍 {t("arrived")}
            </motion.button>
          )}
          {b.status === "arrived" && (
            <div className="card p-4 space-y-4">
              <PhotoPicker label={`📷 ${t("before_photo")}`} photos={b.before_photos} onAdd={(url) => api(`/bookings/${b.id}/photos`, { body: { stage: "before", url } }).then(load)} />
              <PhotoPicker label={`📷 ${t("after_photo")}`} photos={b.after_photos} onAdd={(url) => api(`/bookings/${b.id}/photos`, { body: { stage: "after", url } }).then(load)} />
              <motion.button whileTap={{ scale: 0.97 }} className={`${bigBtn} bg-brand-600 text-white`} onClick={() => step("completed")}>
                ✅ {t("work_done")}
              </motion.button>
            </div>
          )}
          {b.status === "completed" && (
            <div className="card p-4 text-center space-y-2">
              {!b.payment && <div className="font-bold text-muted">⏳ Waiting for customer to confirm & pay {money(b.amount)}</div>}
              {b.payment?.status === "held" && <div className="font-bold text-brand-700">🛡️ {money(b.payment.worker_amount)} is held safely – released when customer confirms</div>}
              {b.payment?.status === "pending" && (
                <button className={`${bigBtn} bg-green-600 text-white`} onClick={() => api(`/bookings/${b.id}/cash-received`, { body: {} }).then(() => { toast("💵 Payment recorded"); load(); })}>
                  💵 {t("cash_received")} {money(b.payment.worker_amount)}
                </button>
              )}
            </div>
          )}
          {b.status === "paid" && (
            <div className="card p-5 text-center bg-green-50">
              <div className="text-5xl">🎉</div>
              <div className="text-2xl font-black text-green-700">{money(b.payment?.worker_amount || b.amount)} received</div>
              {b.payment?.reference && <div className="text-sm text-muted font-semibold">Ref {b.payment.reference}</div>}
            </div>
          )}
          {["completed", "paid"].includes(b.status) && !b.reviewed_by_worker && (
            <button className="btn-primary w-full" onClick={() => setReview(b)}>
              ⭐ {t("rate_customer")}
            </button>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <a className="btn-ghost" href={`https://www.google.com/maps/dir/?api=1&destination=${job.lat},${job.lng}`} target="_blank" rel="noreferrer">
              <Navigation size={18} /> Directions
            </a>
            <button className="btn-ghost" onClick={() => setChat(!chat)}>
              <MessageCircle size={18} /> {t("chat")}
            </button>
            <button className="btn-ghost" onClick={share}>
              <Share2 size={18} /> {t("share_trip")}
            </button>
            <button className="btn-danger" onClick={triggerSos}>
              <ShieldAlert size={18} /> {t("sos")}
            </button>
          </div>
          {chat && <Chat jobId={job.id} otherId={job.customer_id} otherName={job.customer.name} />}
          {["confirmed", "on_the_way"].includes(b.status) && (
            <button className="btn-ghost w-full text-red-600" onClick={() => confirm("Cancel this job? It lowers your reliability score.") && api(`/bookings/${b.id}/cancel`, { body: {} }).then(load)}>
              {t("cancel")}
            </button>
          )}
          {!b.dispute && ["arrived", "completed", "paid"].includes(b.status) && (
            <button className="btn-ghost w-full text-muted" onClick={() => setDispute(b)}>
              ⚖️ {t("report_problem")}
            </button>
          )}
          {b.dispute && <div className="card p-3 bg-amber-50 font-bold text-amber-800">⚖️ {b.dispute.reason} — {b.dispute.status}</div>}
        </div>
      )}

      <ReviewModal b={review} title={t("rate_customer")} tags={["Paid on time", "Polite", "Clear instructions", "Gave water/food", "Safe place"]} onClose={() => setReview(null)} onDone={() => { setReview(null); load(); }} />
      <DisputeModal b={dispute} onClose={() => setDispute(null)} onDone={() => { setDispute(null); load(); }} />
      <Modal open={!!sos} onClose={() => setSos(null)} title="🆘 SOS sent">
        <div className="space-y-3">
          <p className="font-semibold">Our safety team has been alerted with your location.</p>
          <a href="tel:112" className="btn-danger btn-lg w-full">
            📞 Call 112 (Emergency)
          </a>
          {sos?.trusted_contact?.phone && (
            <a href={`tel:${sos.trusted_contact.phone}`} className="btn-ghost btn-lg w-full">
              📞 Call {sos.trusted_contact.name}
            </a>
          )}
          <button className="btn-ghost w-full" onClick={share}>
            <Share2 size={18} /> Send my live location
          </button>
        </div>
      </Modal>
    </div>
  );
}
