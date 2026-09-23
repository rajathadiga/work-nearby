"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Video, Trash2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { api, uploadFile } from "@/lib/api";
import { useRequireUser, Loading, PageTitle, VoiceBox, LevelBadge, Modal } from "@/components/ui";

const LEVELS = [
  { id: "beginner", label: "Beginner", stars: 1 },
  { id: "intermediate", label: "Good", stars: 2 },
  { id: "advanced", label: "Very good", stars: 3 },
  { id: "expert", label: "Expert", stars: 4 },
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WorkerProfile() {
  const user = useRequireUser("worker");
  const { t, meta, catName, lang, toast, refreshUser, logout } = useApp();
  const [form, setForm] = useState<any>(null);
  const [name, setName] = useState("");
  const [trusted, setTrusted] = useState({ name: "", phone: "" });
  const [picker, setPicker] = useState(false);
  const [onboard, setOnboard] = useState(false);
  const [saving, setSaving] = useState(false);
  const videoRef = useRef<HTMLInputElement>(null);
  const [videoSkill, setVideoSkill] = useState("");

  useEffect(() => {
    if (!user?.worker) return;
    const w = user.worker;
    setOnboard(new URLSearchParams(window.location.search).get("onboard") === "1");
    setForm({
      bio: w.bio,
      experience_years: w.experience_years,
      daily_rate: w.daily_rate,
      hourly_rate: w.hourly_rate,
      radius_km: w.radius_km,
      available_days: w.available_days,
      available_from: w.available_from,
      available_to: w.available_to,
      upi_id: w.upi_id,
      skills: w.skills.map((s: any) => ({ skill: s.skill, level: s.level, verified: s.verified, status: s.status })),
    });
    setName(user.name);
    setTrusted(user.trusted_contact);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (user && !user.worker)
    return (
      <div className="card p-6 text-center space-y-3 max-w-md mx-auto">
        <div className="text-5xl">👷</div>
        <Link href="/worker" className="btn-sun btn-lg w-full">
          Start as worker →
        </Link>
      </div>
    );
  if (!user || !form || !meta) return <Loading />;
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  const has = (id: string) => form.skills.some((s: any) => s.skill === id);

  async function save() {
    setSaving(true);
    try {
      await api("/worker/profile", { method: "PATCH", body: form });
      await api("/me", { method: "PATCH", body: { name, trusted_contact_name: trusted.name, trusted_contact_phone: trusted.phone } });
      await refreshUser();
      toast("✅ Profile saved");
      if (onboard) window.location.href = "/worker";
    } catch (e: any) {
      toast("❌", e.message);
    } finally {
      setSaving(false);
    }
  }

  async function verifyDoc(kind: string, file?: File) {
    const url = file ? await uploadFile(file) : "";
    await api(`/verify/${kind}`, { body: { url } });
    await refreshUser();
    toast("📤 Sent for verification", "Usually approved within a day");
  }

  const statusChip = (s: string) =>
    s === "verified" ? <span className="chip !text-xs bg-green-100 text-green-700">✓ Verified</span> : s === "pending" ? <span className="chip !text-xs bg-amber-100 text-amber-700">⏳ Checking</span> : s === "rejected" ? <span className="chip !text-xs bg-red-100 text-red-700">✗ Try again</span> : null;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <PageTitle title={onboard ? "👋 Welcome! Set up your work profile" : `👷 ${t("profile")}`} sub={onboard ? "Add skills so customers can find you" : ""} right={<LevelBadge level={user.worker.level} />} />

      <div className="card p-4 space-y-3">
        <div>
          <div className="label">{t("your_name")}</div>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <div className="label">🗣️ About me (speak or type)</div>
          <VoiceBox value={form.bio} onChange={(v) => set("bio", v)} rows={2} placeholder="10 years experience in coconut climbing, own tools…" />
        </div>
      </div>

      {/* skills */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center">
          <h2 className="section-title flex-1">🛠️ {t("skills")}</h2>
          <button className="btn-primary !py-2 text-sm" onClick={() => setPicker(true)}>
            + {t("add_skill")}
          </button>
        </div>
        {form.skills.length === 0 && <div className="text-muted font-bold text-center py-4">Tap “{t("add_skill")}” to choose what work you can do</div>}
        {form.skills.map((s: any, i: number) => {
          const sk = meta.skills.find((x) => x.id === s.skill);
          return (
            <div key={s.skill} className="rounded-2xl border border-black/10 p-3">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{sk?.icon}</span>
                <span className="flex-1 font-extrabold">{sk ? sk[lang] || sk.en : s.skill}</span>
                {statusChip(s.status)}
                <button className="h-9 w-9 rounded-full bg-gray-100 grid place-items-center" onClick={() => set("skills", form.skills.filter((_: any, j: number) => j !== i))} aria-label="remove">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1 mt-2">
                {LEVELS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => set("skills", form.skills.map((x: any, j: number) => (j === i ? { ...x, level: l.id } : x)))}
                    className={`rounded-xl py-2 text-xs font-bold ${s.level === l.id ? "bg-brand-600 text-white" : "bg-gray-100"}`}
                  >
                    {"★".repeat(l.stars)}
                    <div>{l.label}</div>
                  </button>
                ))}
              </div>
              {!s.verified && s.status !== "pending" && (
                <button
                  className="mt-2 text-sm font-bold text-sky-700 flex items-center gap-1"
                  onClick={() => {
                    setVideoSkill(s.skill);
                    videoRef.current?.click();
                  }}
                >
                  <Video size={16} /> Upload a 30-second video to get “Verified skill” ✓
                </button>
              )}
            </div>
          );
        })}
        <input
          ref={videoRef}
          type="file"
          accept="video/*,image/*"
          capture="environment"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f || !videoSkill) return;
            try {
              await api("/worker/profile", { method: "PATCH", body: { skills: form.skills } });
              const url = await uploadFile(f);
              const r = await api(`/worker/skills/${videoSkill}/verify`, { body: { url } });
              set("skills", r.skills.map((x: any) => ({ skill: x.skill, level: x.level, verified: x.verified, status: x.status })));
              toast("🎥 Video sent", "Our team will verify your skill");
            } catch (err: any) {
              toast("❌", err.message);
            }
          }}
        />
      </div>

      <div className="card p-4 space-y-4">
        <h2 className="section-title">💰 Rates & area</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label">{t("daily_rate")}</div>
            <input className="input font-black" type="number" inputMode="numeric" value={form.daily_rate} onChange={(e) => set("daily_rate", Number(e.target.value))} />
          </div>
          <div>
            <div className="label">Per hour</div>
            <input className="input font-black" type="number" inputMode="numeric" value={form.hourly_rate} onChange={(e) => set("hourly_rate", Number(e.target.value))} />
          </div>
          <div>
            <div className="label">Years of experience</div>
            <input className="input font-black" type="number" inputMode="numeric" value={form.experience_years} onChange={(e) => set("experience_years", Number(e.target.value))} />
          </div>
          <div>
            <div className="label">UPI ID (to get paid)</div>
            <input className="input" value={form.upi_id} onChange={(e) => set("upi_id", e.target.value)} placeholder="name@upi" />
          </div>
        </div>
        <div>
          <div className="label">
            📍 {t("radius")} – {form.radius_km} km
          </div>
          <input type="range" min={2} max={30} value={form.radius_km} onChange={(e) => set("radius_km", Number(e.target.value))} className="w-full accent-emerald-600 h-3" />
        </div>
        <div>
          <div className="label">📅 Days I work</div>
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((d) => {
              const on = form.available_days.includes(d);
              return (
                <button key={d} onClick={() => set("available_days", on ? form.available_days.filter((x: string) => x !== d) : [...form.available_days, d])} className={`rounded-xl py-3 text-sm font-bold ${on ? "bg-brand-600 text-white" : "bg-gray-100"}`}>
                  {d}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label">From</div>
            <input className="input" type="time" value={form.available_from} onChange={(e) => set("available_from", e.target.value)} />
          </div>
          <div>
            <div className="label">To</div>
            <input className="input" type="time" value={form.available_to} onChange={(e) => set("available_to", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <h2 className="section-title">🪪 {t("verification")}</h2>
        <p className="text-sm text-muted font-semibold">Verified workers get more jobs. Your documents are only seen by our safety team.</p>
        {[
          ["phone", "📱 Mobile number", "verified"],
          ["id", "🪪 Aadhaar / ID card photo", user.verification.id],
          ["face", "🤳 Selfie (face check)", user.verification.face],
          ["address", "🏠 Address proof", user.verification.address],
        ].map(([k, label, st]) => (
          <div key={k} className="flex items-center gap-2 rounded-2xl bg-gray-50 p-3">
            <span className="flex-1 font-bold">{label}</span>
            {st === "verified" || st === true ? (
              <span className="chip bg-green-100 text-green-700">
                <Check size={14} /> Done
              </span>
            ) : st === "pending" ? (
              <span className="chip bg-amber-100 text-amber-700">⏳ Checking</span>
            ) : (
              <label className="btn-primary !py-2 text-sm cursor-pointer">
                Upload
                <input type="file" accept="image/*" capture={k === "face" ? "user" : "environment"} hidden onChange={(e) => e.target.files?.[0] && verifyDoc(k, e.target.files[0])} />
              </label>
            )}
          </div>
        ))}
      </div>

      <div className="card p-4 space-y-3">
        <h2 className="section-title">🛟 Trusted contact (for safety)</h2>
        <div className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="Name" value={trusted.name} onChange={(e) => setTrusted({ ...trusted, name: e.target.value })} />
          <input className="input" placeholder="Phone" inputMode="numeric" value={trusted.phone} onChange={(e) => setTrusted({ ...trusted, phone: e.target.value })} />
        </div>
      </div>

      <div className="sticky bottom-24 z-10">
        <button className="btn-primary btn-lg w-full shadow-2xl" disabled={saving} onClick={save}>
          {saving ? "…" : `💾 ${t("save")}`}
        </button>
      </div>
      <div className="flex gap-2">
        <Link href={`/workers/${user.id}`} className="btn-ghost flex-1">
          🪪 {t("passport")}
        </Link>
        <Link href="/settings" className="btn-ghost flex-1">
          ⚙️ {t("settings")}
        </Link>
        <button
          className="btn-ghost flex-1"
          onClick={() => {
            logout();
            window.location.href = "/";
          }}
        >
          {t("logout")}
        </button>
      </div>

      <Modal open={picker} onClose={() => setPicker(false)} title={t("add_skill")}>
        <div className="space-y-4">
          {meta.categories
            .filter((c) => meta.skills.some((s) => s.cat === c.id))
            .map((c) => (
              <div key={c.id}>
                <div className="label">
                  {c.icon} {catName(c)}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {meta.skills
                    .filter((s) => s.cat === c.id)
                    .map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (!has(s.id)) set("skills", [...form.skills, { skill: s.id, level: "intermediate", verified: false, status: "none" }]);
                          setPicker(false);
                        }}
                        className={`tile py-3 ${has(s.id) ? "tile-on" : ""}`}
                      >
                        <span className="text-2xl">{s.icon}</span>
                        <span className="text-sm">{s[lang] || s.en}</span>
                      </button>
                    ))}
                </div>
              </div>
            ))}
        </div>
      </Modal>
    </div>
  );
}
