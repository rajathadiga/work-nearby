"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { api, uploadFile } from "@/lib/api";
import { LANGS } from "@/lib/i18n";
import { useRequireUser, Loading, PageTitle, Stars } from "@/components/ui";

export default function Settings() {
  const user = useRequireUser();
  const { t, lang, setLang, voiceOn, setVoiceOn, logout, refreshUser, toast, meta } = useApp();
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [trusted, setTrusted] = useState({ name: "", phone: "" });
  const [biz, setBiz] = useState("");

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setArea(user.area);
    setTrusted(user.trusted_contact);
    setBiz(user.business_name);
  }, [user?.id]);

  if (!user || !meta) return <Loading />;

  async function save() {
    const pl = meta!.places.find((p) => p.name === area);
    await api("/me", {
      method: "PATCH",
      body: { name, area, business_name: biz, trusted_contact_name: trusted.name, trusted_contact_phone: trusted.phone, ...(pl ? { lat: pl.lat, lng: pl.lng } : {}) },
    });
    await refreshUser();
    toast("✅ Saved");
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <PageTitle title={`⚙️ ${t("settings")}`} />
      <div className="card p-4 flex items-center gap-3">
        <div className="flex-1">
          <div className="font-black text-lg">{user.name}</div>
          <div className="text-sm text-muted font-semibold">+91 {user.phone}</div>
        </div>
        <div className="text-right text-sm font-semibold">
          <div>
            <Stars value={user.customer.rating} count={user.customer.rating_count} />
          </div>
          <div className="text-muted">
            {user.customer.jobs_posted} jobs • {user.customer.payments_completed} paid
          </div>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="label">🌐 {t("language")}</div>
        <div className="grid grid-cols-3 gap-2">
          {LANGS.map((l) => (
            <button key={l.id} onClick={() => setLang(l.id)} className={`tile py-3 ${lang === l.id ? "tile-on" : ""}`}>
              {l.label}
            </button>
          ))}
        </div>
        <button onClick={() => setVoiceOn(!voiceOn)} className={`w-full flex items-center gap-3 rounded-2xl p-3 ${voiceOn ? "bg-sun-50" : "bg-gray-50"}`}>
          <span className="text-2xl">🔊</span>
          <span className="flex-1 text-left font-bold">Read alerts aloud automatically</span>
          <span className={`h-7 w-12 rounded-full p-1 transition ${voiceOn ? "bg-sun-500" : "bg-gray-300"}`}>
            <span className={`block h-5 w-5 rounded-full bg-white transition ${voiceOn ? "translate-x-5" : ""}`} />
          </span>
        </button>
      </div>

      <div className="card p-4 space-y-3">
        <div>
          <div className="label">{t("your_name")}</div>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <div className="label">📍 My area</div>
          <select className="input" value={area} onChange={(e) => setArea(e.target.value)}>
            {!meta.places.some((p) => p.name === area) && <option>{area}</option>}
            {meta.places.map((p) => (
              <option key={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="label">🏢 Business name (optional)</div>
          <input className="input" value={biz} onChange={(e) => setBiz(e.target.value)} placeholder="Hotel / farm / shop name" />
        </div>
        <div>
          <div className="label">🛟 Trusted contact</div>
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="Name" value={trusted.name} onChange={(e) => setTrusted({ ...trusted, name: e.target.value })} />
            <input className="input" placeholder="Phone" value={trusted.phone} onChange={(e) => setTrusted({ ...trusted, phone: e.target.value })} />
          </div>
        </div>
        <button className="btn-primary w-full" onClick={save}>
          💾 {t("save")}
        </button>
      </div>

      <div className="card p-4 space-y-2">
        <div className="label">🪪 {t("verification")}</div>
        {[
          ["id", "🪪 ID card", user.verification.id],
          ["face", "🤳 Selfie", user.verification.face],
        ].map(([k, label, st]) => (
          <div key={k} className="flex items-center gap-2 rounded-2xl bg-gray-50 p-3">
            <span className="flex-1 font-bold">{label}</span>
            {st === "verified" ? (
              <span className="chip bg-green-100 text-green-700">✓</span>
            ) : st === "pending" ? (
              <span className="chip bg-amber-100 text-amber-700">⏳</span>
            ) : (
              <label className="btn-primary !py-2 text-sm cursor-pointer">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const url = await uploadFile(f);
                    await api(`/verify/${k}`, { body: { url } });
                    refreshUser();
                    toast("📤 Sent for verification");
                  }}
                />
              </label>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link href="/plans" className="btn-ghost">
          ⭐ {t("plans")}
        </Link>
        <Link href="/business" className="btn-ghost">
          🏢 {t("business")}
        </Link>
        <Link href="/whatsapp" className="btn-ghost">
          💬 {t("whatsapp")}
        </Link>
        <Link href="/worker" className="btn-ghost">
          👷 {t("need_work")}
        </Link>
      </div>
      <button
        className="btn-ghost w-full text-red-600"
        onClick={() => {
          logout();
          window.location.href = "/";
        }}
      >
        {t("logout")}
      </button>
    </div>
  );
}
