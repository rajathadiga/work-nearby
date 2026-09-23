"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Globe, Volume2, UserRound, IdCard, ScanFace, Check, Clock, Crown, Building2, MessageCircle, HardHat, LogOut, LifeBuoy, Save, ChevronRight } from "lucide-react";
import { useApp } from "@/lib/store";
import { api, uploadFile } from "@/lib/api";
import { LANGS } from "@/lib/i18n";
import { useRequireUser, Loading, PageTitle, Stars, Avatar } from "@/components/ui";

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
    toast("Settings saved", "", "success");
  }

  return (
    <div>
      <PageTitle icon={SettingsIcon} title={t("settings")} />
      <div className="grid xl:grid-cols-3 gap-6 items-start">
        <div className="space-y-6 xl:col-span-2">
          <div className="card p-5 space-y-4">
            <div className="section-title">
              <UserRound size={18} className="text-brand-600" /> Profile
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="label">{t("your_name")}</div>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <div className="label">My area</div>
                <select className="input" value={area} onChange={(e) => setArea(e.target.value)}>
                  {!meta.places.some((p) => p.name === area) && <option>{area}</option>}
                  {meta.places.map((p) => (
                    <option key={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <div className="label">Business name (optional)</div>
                <input className="input" value={biz} onChange={(e) => setBiz(e.target.value)} placeholder="Hotel / farm / shop name" />
              </div>
            </div>
            <div>
              <div className="label flex items-center gap-1.5">
                <LifeBuoy size={14} /> Trusted contact
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <input className="input" placeholder="Name" value={trusted.name} onChange={(e) => setTrusted({ ...trusted, name: e.target.value })} />
                <input className="input" placeholder="Phone" value={trusted.phone} onChange={(e) => setTrusted({ ...trusted, phone: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end">
              <button className="btn-primary" onClick={save}>
                <Save size={16} /> {t("save")}
              </button>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <div className="section-title">
              <Globe size={18} className="text-brand-600" /> {t("language")} and accessibility
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-lg">
              {LANGS.map((l) => (
                <button key={l.id} onClick={() => setLang(l.id)} className={`tile py-3 ${lang === l.id ? "tile-on" : ""}`}>
                  {l.label}
                </button>
              ))}
            </div>
            <button onClick={() => setVoiceOn(!voiceOn)} className="w-full max-w-lg flex items-center gap-3 rounded-xl border border-line p-3.5 hover:bg-slate-50">
              <Volume2 size={20} className="text-brand-600" />
              <span className="flex-1 text-left font-medium">Read new alerts aloud automatically</span>
              <span className={`h-6 w-11 rounded-full p-0.5 transition ${voiceOn ? "bg-brand-600" : "bg-slate-300"}`}>
                <span className={`block h-5 w-5 rounded-full bg-white shadow transition ${voiceOn ? "translate-x-5" : ""}`} />
              </span>
            </button>
          </div>

          <div className="card p-5 space-y-3">
            <div className="section-title">
              <IdCard size={18} className="text-brand-600" /> {t("verification")}
            </div>
            {[
              ["id", IdCard, "Government ID card", user.verification.id],
              ["face", ScanFace, "Selfie (face check)", user.verification.face],
            ].map(([k, Icon, label, st]: any) => (
              <div key={k} className="flex items-center gap-3 rounded-lg border border-line p-3 max-w-lg">
                <Icon size={18} className="text-muted" />
                <span className="flex-1 font-medium text-sm">{label}</span>
                {st === "verified" ? (
                  <span className="chip !text-xs bg-emerald-50 text-emerald-700"><Check size={13} /> Verified</span>
                ) : st === "pending" ? (
                  <span className="chip !text-xs bg-amber-50 text-amber-700"><Clock size={13} /> Under review</span>
                ) : (
                  <label className="btn-ghost !py-1.5 text-sm cursor-pointer">
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
                        toast("Sent for verification", "", "success");
                      }}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card p-5 flex items-center gap-4">
            <Avatar name={user.name} size={56} />
            <div className="min-w-0">
              <div className="font-semibold text-lg truncate">{user.name}</div>
              <div className="text-sm text-muted">+91 {user.phone}</div>
              <div className="text-sm mt-1">
                <Stars value={user.customer.rating} count={user.customer.rating_count} />
              </div>
            </div>
          </div>
          <div className="card divide-y divide-line overflow-hidden">
            {[
              ["/plans", Crown, t("plans"), `Current: ${user.subscription}`],
              ["/business", Building2, t("business"), "Bulk and recurring workers"],
              ["/whatsapp", MessageCircle, t("whatsapp"), "Use KaamNear by message"],
              ["/worker", HardHat, t("need_work"), "Switch to worker mode"],
            ].map(([href, Icon, label, sub]: any) => (
              <Link key={href} href={href} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50">
                <Icon size={18} className="text-brand-600" />
                <span className="flex-1">
                  <span className="block font-medium">{label}</span>
                  <span className="text-xs text-muted capitalize">{sub}</span>
                </span>
                <ChevronRight size={17} className="text-muted" />
              </Link>
            ))}
          </div>
          <button
            className="btn-ghost w-full text-rose-600"
            onClick={() => {
              logout();
              window.location.href = "/";
            }}
          >
            <LogOut size={16} /> {t("logout")}
          </button>
        </aside>
      </div>
    </div>
  );
}
