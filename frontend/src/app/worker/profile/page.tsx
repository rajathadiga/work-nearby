"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Video, Trash2, UserRound, Wrench, Wallet, IdCard, LifeBuoy, Save, Plus, HardHat, ChevronRight, Smartphone, ScanFace, House, Clock, BadgeCheck, Star } from "lucide-react";
import { useApp } from "@/lib/store";
import { api, uploadFile } from "@/lib/api";
import { SkillBadge, CatBadge, IconBadge } from "@/lib/icons";
import { useRequireUser, Loading, PageTitle, VoiceBox, LevelBadge, Modal } from "@/components/ui";

const LEVELS = [
  { id: "beginner", label: "Beginner", stars: 1 },
  { id: "intermediate", label: "Good", stars: 2 },
  { id: "advanced", label: "Very good", stars: 3 },
  { id: "expert", label: "Expert", stars: 4 },
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Section({ icon, title, children, right }: any) {
  return (
    <div className="card">
      <div className="px-5 py-4 border-b border-line flex items-center gap-2">
        <span className="text-brand-600">{icon}</span>
        <span className="font-semibold flex-1">{title}</span>
        {right}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

export default function WorkerProfile() {
  const user = useRequireUser("worker");
  const { t, meta, catName, lang, toast, refreshUser } = useApp();
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
      bio: w.bio, experience_years: w.experience_years, daily_rate: w.daily_rate, hourly_rate: w.hourly_rate, radius_km: w.radius_km,
      available_days: w.available_days, available_from: w.available_from, available_to: w.available_to, upi_id: w.upi_id,
      skills: w.skills.map((s: any) => ({ skill: s.skill, level: s.level, verified: s.verified, status: s.status })),
    });
    setName(user.name);
    setTrusted(user.trusted_contact);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (user && !user.worker)
    return (
      <div className="card p-8 text-center space-y-4 max-w-md mx-auto mt-10">
        <IconBadge icon={HardHat} size={56} tone="amber" className="mx-auto" />
        <Link href="/worker" className="btn-primary btn-lg w-full">
          Start as worker <ChevronRight size={18} />
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
      toast("Profile saved", "", "success");
      if (onboard) window.location.href = "/worker";
    } catch (e: any) {
      toast("Could not save", e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function verifyDoc(kind: string, file?: File) {
    const url = file ? await uploadFile(file) : "";
    await api(`/verify/${kind}`, { body: { url } });
    await refreshUser();
    toast("Sent for verification", "Usually approved within a day", "success");
  }

  const statusChip = (s: string) =>
    s === "verified" ? (
      <span className="chip !text-xs bg-emerald-50 text-emerald-700"><BadgeCheck size={13} /> Verified</span>
    ) : s === "pending" ? (
      <span className="chip !text-xs bg-amber-50 text-amber-700"><Clock size={13} /> Under review</span>
    ) : s === "rejected" ? (
      <span className="chip !text-xs bg-rose-50 text-rose-700">Try again</span>
    ) : null;


  return (
    <div>
      <PageTitle
        icon={UserRound}
        title={onboard ? "Set up your work profile" : t("profile")}
        sub={onboard ? "Add skills so customers can find you" : "This is what customers see before hiring you"}
        right={
          <div className="flex items-center gap-2">
            <LevelBadge level={user.worker.level} />
            <Link href={`/workers/${user.id}`} className="btn-ghost !py-2 text-sm">
              {t("passport")}
            </Link>
            <button className="btn-primary !py-2" disabled={saving} onClick={save}>
              <Save size={16} /> {saving ? "Saving…" : t("save")}
            </button>
          </div>
        }
      />

      <div className="grid xl:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <Section icon={<UserRound size={18} />} title="About you">
            <div>
              <div className="label">{t("your_name")}</div>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <div className="label">About me (speak or type)</div>
              <VoiceBox value={form.bio} onChange={(v) => set("bio", v)} rows={2} placeholder="10 years experience in coconut climbing, own tools…" />
            </div>
          </Section>

          <Section
            icon={<Wrench size={18} />}
            title={t("skills")}
            right={
              <button className="btn-ghost !py-1.5 text-sm" onClick={() => setPicker(true)}>
                <Plus size={15} /> {t("add_skill")}
              </button>
            }
          >
            {form.skills.length === 0 && <div className="text-muted text-center py-4">Add the work you can do</div>}
            {form.skills.map((s: any, i: number) => {
              const sk = meta.skills.find((x) => x.id === s.skill);
              return (
                <div key={s.skill} className="rounded-xl border border-line p-3.5">
                  <div className="flex items-center gap-3">
                    <SkillBadge skill={s.skill} size={38} />
                    <span className="flex-1 font-semibold">{sk ? sk[lang] || sk.en : s.skill}</span>
                    {statusChip(s.status)}
                    <button className="h-8 w-8 rounded-lg text-muted hover:bg-rose-50 hover:text-rose-600 grid place-items-center" onClick={() => set("skills", form.skills.filter((_: any, j: number) => j !== i))} aria-label="remove skill">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 mt-3">
                    {LEVELS.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => set("skills", form.skills.map((x: any, j: number) => (j === i ? { ...x, level: l.id } : x)))}
                        className={`rounded-lg py-2 text-xs font-medium border transition ${s.level === l.id ? "bg-brand-600 text-white border-brand-600" : "bg-white border-line hover:border-brand-300"}`}
                      >
                        <div className="flex justify-center gap-0.5 mb-0.5">
                          {Array.from({ length: l.stars }).map((_, k) => (
                            <Star key={k} size={11} className={s.level === l.id ? "fill-white" : "fill-amber-400 text-amber-400"} />
                          ))}
                        </div>
                        {l.label}
                      </button>
                    ))}
                  </div>
                  {!s.verified && s.status !== "pending" && (
                    <button
                      className="mt-3 text-sm font-medium text-brand-700 flex items-center gap-1.5 hover:underline"
                      onClick={() => {
                        setVideoSkill(s.skill);
                        videoRef.current?.click();
                      }}
                    >
                      <Video size={15} /> Upload a 30-second video to get this skill verified
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
                  toast("Video sent", "Our team will verify your skill", "success");
                } catch (err: any) {
                  toast("Upload failed", err.message, "error");
                }
              }}
            />
          </Section>
        </div>

        <div className="space-y-6">
          <Section icon={<Wallet size={18} />} title="Rates and working area">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="label">{t("daily_rate")} (₹)</div>
                <input className="input font-semibold" type="number" inputMode="numeric" value={form.daily_rate} onChange={(e) => set("daily_rate", Number(e.target.value))} />
              </div>
              <div>
                <div className="label">Per hour (₹)</div>
                <input className="input font-semibold" type="number" inputMode="numeric" value={form.hourly_rate} onChange={(e) => set("hourly_rate", Number(e.target.value))} />
              </div>
              <div>
                <div className="label">Years of experience</div>
                <input className="input font-semibold" type="number" inputMode="numeric" value={form.experience_years} onChange={(e) => set("experience_years", Number(e.target.value))} />
              </div>
              <div>
                <div className="label">UPI ID (to get paid)</div>
                <input className="input" value={form.upi_id} onChange={(e) => set("upi_id", e.target.value)} placeholder="name@upi" />
              </div>
            </div>
            <div>
              <div className="label">
                {t("radius")} — {form.radius_km} km
              </div>
              <input type="range" min={2} max={30} value={form.radius_km} onChange={(e) => set("radius_km", Number(e.target.value))} className="w-full accent-[#1f6b65]" />
            </div>
            <div>
              <div className="label">Days I work</div>
              <div className="grid grid-cols-7 gap-1.5">
                {DAYS.map((d) => {
                  const on = form.available_days.includes(d);
                  return (
                    <button key={d} onClick={() => set("available_days", on ? form.available_days.filter((x: string) => x !== d) : [...form.available_days, d])} className={`rounded-lg py-2.5 text-sm font-medium border ${on ? "bg-brand-600 text-white border-brand-600" : "bg-white border-line"}`}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="label">From</div>
                <input className="input" type="time" value={form.available_from} onChange={(e) => set("available_from", e.target.value)} />
              </div>
              <div>
                <div className="label">To</div>
                <input className="input" type="time" value={form.available_to} onChange={(e) => set("available_to", e.target.value)} />
              </div>
            </div>
          </Section>

          <Section icon={<IdCard size={18} />} title={t("verification")}>
            <p className="text-sm text-muted -mt-1">Verified workers get more jobs. Documents are only seen by our safety team.</p>
            {[
              ["phone", Smartphone, "Mobile number", "verified"],
              ["id", IdCard, "Aadhaar / ID card photo", user.verification.id],
              ["face", ScanFace, "Selfie (face check)", user.verification.face],
              ["address", House, "Address proof", user.verification.address],
            ].map(([k, Icon, label, st]: any) => (
              <div key={k} className="flex items-center gap-3 rounded-lg border border-line p-3">
                <Icon size={18} className="text-muted" />
                <span className="flex-1 font-medium text-sm">{label}</span>
                {st === "verified" || st === true ? (
                  <span className="chip !text-xs bg-emerald-50 text-emerald-700"><Check size={13} /> Done</span>
                ) : st === "pending" ? (
                  <span className="chip !text-xs bg-amber-50 text-amber-700"><Clock size={13} /> Under review</span>
                ) : (
                  <label className="btn-ghost !py-1.5 text-sm cursor-pointer">
                    Upload
                    <input type="file" accept="image/*" capture={k === "face" ? "user" : "environment"} hidden onChange={(e) => e.target.files?.[0] && verifyDoc(k, e.target.files[0])} />
                  </label>
                )}
              </div>
            ))}
          </Section>

          <Section icon={<LifeBuoy size={18} />} title="Trusted contact (for safety)">
            <div className="grid sm:grid-cols-2 gap-4">
              <input className="input" placeholder="Name" value={trusted.name} onChange={(e) => setTrusted({ ...trusted, name: e.target.value })} />
              <input className="input" placeholder="Phone" inputMode="numeric" value={trusted.phone} onChange={(e) => setTrusted({ ...trusted, phone: e.target.value })} />
            </div>
          </Section>

          <button className="btn-primary btn-lg w-full" disabled={saving} onClick={save}>
            <Save size={18} /> {saving ? "Saving…" : t("save")}
          </button>
        </div>
      </div>

      <Modal open={picker} onClose={() => setPicker(false)} title={t("add_skill")} wide>
        <div className="space-y-5">
          {meta.categories
            .filter((c) => meta.skills.some((s) => s.cat === c.id))
            .map((c) => (
              <div key={c.id}>
                <div className="label flex items-center gap-2">
                  <CatBadge cat={c.id} size={24} /> {catName(c)}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {meta.skills
                    .filter((s) => s.cat === c.id)
                    .map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (!has(s.id)) set("skills", [...form.skills, { skill: s.id, level: "intermediate", verified: false, status: "none" }]);
                          setPicker(false);
                        }}
                        className={`tile py-2.5 !flex-row !justify-start text-left ${has(s.id) ? "tile-on" : ""}`}
                      >
                        <SkillBadge skill={s.id} size={30} />
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
