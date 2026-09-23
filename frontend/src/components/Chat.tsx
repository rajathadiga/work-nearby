"use client";
import { useEffect, useRef, useState } from "react";
import { Send, Camera, MapPin, Mic, MessageSquare } from "lucide-react";
import { api, uploadFile, fileUrl } from "@/lib/api";
import { useApp } from "@/lib/store";
import { useVoiceInput } from "@/lib/speech";

const QUICK = ["OK", "Coming now", "10 minutes late", "Please send location", "Work done", "Thank you"];

export default function Chat({ jobId, otherId, otherName }: { jobId: number; otherId: number; otherName: string }) {
  const { user, lang, toast } = useApp();
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const voice = useVoiceInput(lang, (t) => setText((x) => (x ? x + " " : "") + t));

  const load = () =>
    api(`/jobs/${jobId}/messages?with_user=${otherId}`)
      .then(setMsgs)
      .catch(() => {});

  useEffect(() => {
    load();
    const iv = setInterval(load, 4000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, otherId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs.length]);

  async function send(body: any) {
    try {
      const r = await api(`/jobs/${jobId}/messages`, { body: { to: otherId, ...body } });
      if (r.warnings?.length) toast("Be careful", r.warnings.join(", "), "error");
      setText("");
      load();
    } catch (e: any) {
      toast("Message not sent", e.message, "error");
    }
  }

  function shareLocation() {
    navigator.geolocation?.getCurrentPosition(
      (p) => send({ kind: "location", text: "My location", payload: { lat: p.coords.latitude, lng: p.coords.longitude } }),
      () => send({ kind: "location", text: "My location", payload: { lat: user.lat, lng: user.lng } })
    );
  }

  return (
    <div className="card overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-line font-semibold flex items-center gap-2"><MessageSquare size={17} className="text-brand-600" /> {otherName}</div>
      <div className="h-80 overflow-y-auto p-3 space-y-2 bg-slate-50">
        {msgs.length === 0 && <div className="text-center text-sm text-muted py-8">Start the conversation</div>}
        {msgs.map((m) => {
          const mine = m.sender_id === user.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-[15px] shadow-sm ${mine ? "bg-brand-600 text-white" : "bg-white"}`}>
                {m.kind === "image" && m.payload?.url && <img src={fileUrl(m.payload.url)} alt="photo" className="rounded-xl max-h-48 mb-1" />}
                {m.kind === "location" && m.payload?.lat && (
                  <a className="underline font-semibold inline-flex items-center gap-1" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${m.payload.lat},${m.payload.lng}`}>
                    <MapPin size={14} /> Open location on map
                  </a>
                )}
                {m.text && m.kind !== "location" && <div>{m.text}</div>}
                <div className="text-[10px] opacity-60 text-right">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-3 pt-2">
        {QUICK.map((q) => (
          <button key={q} onClick={() => send({ text: q })} className="chip bg-white border border-line whitespace-nowrap shrink-0 hover:border-brand-300">
            {q}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 p-3">
        <button onClick={voice.listening ? voice.stop : voice.start} className={`h-11 w-11 shrink-0 rounded-lg grid place-items-center ${voice.listening ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-600"}`} aria-label="voice">
          <Mic size={20} />
        </button>
        <button onClick={() => fileRef.current?.click()} className="h-11 w-11 shrink-0 rounded-lg grid place-items-center bg-slate-100 text-slate-600" aria-label="photo">
          <Camera size={20} />
        </button>
        <button onClick={shareLocation} className="h-11 w-11 shrink-0 rounded-lg grid place-items-center bg-slate-100 text-slate-600" aria-label="location">
          <MapPin size={20} />
        </button>
        <input
          className="input !py-2 !text-base"
          value={voice.interim || text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && text.trim() && send({ text })}
          placeholder="Message…"
        />
        <button onClick={() => text.trim() && send({ text })} className="h-11 w-11 shrink-0 rounded-lg grid place-items-center bg-brand-600 text-white" aria-label="send">
          <Send size={20} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const url = await uploadFile(f);
            send({ kind: "image", text: "", payload: { url } });
          }}
        />
      </div>
    </div>
  );
}

export function PhotoPicker({ label, photos, onAdd }: { label: string; photos: string[]; onAdd: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <div className="label">{label}</div>
      <div className="flex gap-2 flex-wrap">
        {photos.map((p) => (
          <img key={p} src={fileUrl(p)} alt={label} className="h-24 w-24 object-cover rounded-xl border border-line" />
        ))}
        <button onClick={() => ref.current?.click()} className="h-24 w-24 rounded-xl border-2 border-dashed border-line grid place-items-center text-muted font-medium text-sm hover:border-brand-300">
          {busy ? "…" : <span className="flex flex-col items-center">
              <Camera />+ Photo
            </span>}
        </button>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try {
            onAdd(await uploadFile(f));
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
