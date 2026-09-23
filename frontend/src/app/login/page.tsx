"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Delete } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { LANGS } from "@/lib/i18n";
import { SpeakButton } from "@/components/ui";

function Keypad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) =>
        k === "" ? (
          <span key={i} />
        ) : (
          <button key={i} onClick={() => onKey(k)} className="h-14 rounded-2xl bg-white border border-black/10 text-2xl font-black active:bg-brand-50 grid place-items-center">
            {k === "del" ? <Delete /> : k}
          </button>
        )
      )}
    </div>
  );
}

export default function Login() {
  const { t, lang, setLang, login, toast } = useApp();
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp" | "role">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("customer");
  const [exists, setExists] = useState(false);
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState("");
  const [queryRole, setQueryRole] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("role")) {
      setRole(q.get("role")!);
      setQueryRole(q.get("role")!);
    }
    setNext(q.get("next") || "");
  }, []);

  async function sendOtp() {
    setBusy(true);
    try {
      const r = await api("/auth/send-otp", { body: { phone } });
      setExists(r.exists);
      if (r.name) setName(r.name);
      setStep("otp");
      toast("📩 OTP sent", `Demo OTP: ${r.demo_otp}`);
    } catch (e: any) {
      toast("❌", e.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(chosenRole?: string) {
    if (!exists && step === "otp") {
      setStep("role");
      return;
    }
    setBusy(true);
    try {
      let lat: number | undefined, lng: number | undefined;
      if (!exists) {
        await new Promise<void>((res) =>
          navigator.geolocation
            ? navigator.geolocation.getCurrentPosition(
                (p) => {
                  lat = p.coords.latitude;
                  lng = p.coords.longitude;
                  res();
                },
                () => res(),
                { timeout: 4000 }
              )
            : res()
        );
        // keep demo inside the Udupi region if the browser is far away
        if (lat && (Math.abs(lat - 13.34) > 0.6 || Math.abs((lng || 0) - 74.74) > 0.6)) lat = lng = undefined;
      }
      const r = await api("/auth/verify", { body: { phone, otp, name, role: chosenRole || (exists ? queryRole : role), language: lang, lat, lng } });
      login(r.token, r.user);
      const target = next || (r.user.role === "admin" ? "/admin" : r.user.role === "worker" ? (r.is_new ? "/worker/profile?onboard=1" : "/worker") : "/customer");
      router.replace(target);
    } catch (e: any) {
      toast("❌", e.message);
      setOtp("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="card p-4">
        <div className="label">🌐 {t("language")}</div>
        <div className="grid grid-cols-3 gap-2">
          {LANGS.map((l) => (
            <button key={l.id} onClick={() => setLang(l.id)} className={`tile py-3 ${lang === l.id ? "tile-on" : ""}`}>
              <span className="text-lg">{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      {step === "phone" && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black flex-1">📱 {t("your_phone")}</h1>
            <SpeakButton text={t("your_phone")} />
          </div>
          <div className="input !text-3xl font-black tracking-widest text-center h-16 flex items-center justify-center">
            <span className="text-muted mr-2">+91</span>
            {phone || <span className="text-gray-300">98765 43210</span>}
          </div>
          <Keypad onKey={(k) => setPhone((p) => (k === "del" ? p.slice(0, -1) : p.length < 10 ? p + k : p))} />
          <button className="btn-primary btn-lg w-full" disabled={phone.length !== 10 || busy} onClick={sendOtp}>
            {t("get_otp")} →
          </button>
        </motion.div>
      )}

      {step === "otp" && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black flex-1">🔐 {t("enter_otp")}</h1>
            <SpeakButton text={t("enter_otp")} />
          </div>
          <p className="text-muted font-semibold">
            +91 {phone} • <span className="text-brand-700 font-black">Demo OTP: 1234</span>
          </p>
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-16 w-14 rounded-2xl border-2 grid place-items-center text-3xl font-black ${otp[i] ? "border-brand-500 bg-brand-50" : "border-black/10 bg-white"}`}>
                {otp[i] || ""}
              </span>
            ))}
          </div>
          <Keypad onKey={(k) => setOtp((p) => (k === "del" ? p.slice(0, -1) : p.length < 4 ? p + k : p))} />
          <button className="btn-primary btn-lg w-full" disabled={otp.length !== 4 || busy} onClick={() => verify()}>
            {t("continue")} →
          </button>
          <button className="btn-ghost w-full" onClick={() => setStep("phone")}>
            ← {t("back")}
          </button>
        </motion.div>
      )}

      {step === "role" && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card p-5 space-y-4">
          <div>
            <div className="label">{t("your_name")}</div>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ramesh" />
          </div>
          <div className="label">{t("i_am")}</div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setRole("customer")} className={`tile py-6 ${role === "customer" ? "tile-on" : ""}`}>
              <span className="text-5xl">🙋</span>
              <span>{t("need_worker")}</span>
            </button>
            <button onClick={() => setRole("worker")} className={`tile py-6 ${role === "worker" ? "tile-on" : ""}`}>
              <span className="text-5xl">👷</span>
              <span>{t("need_work")}</span>
            </button>
          </div>
          <button className="btn-primary btn-lg w-full" disabled={!name.trim() || busy} onClick={() => verify(role)}>
            {t("continue")} →
          </button>
        </motion.div>
      )}
    </div>
  );
}
