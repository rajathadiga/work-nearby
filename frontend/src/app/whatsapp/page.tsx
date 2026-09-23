"use client";
import { useEffect, useRef, useState } from "react";
import { Send, Mic } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { useVoiceInput } from "@/lib/speech";

type Msg = { from: "me" | "bot"; text: string; time: string };
const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function fmt(s: string) {
  return s
    .split("\n")
    .map((line, i) => (
      <div key={i} className="min-h-[1em]">
        {line.split(/(\*[^*]+\*|_[^_]+_)/g).map((p, j) =>
          p.startsWith("*") && p.endsWith("*") ? <b key={j}>{p.slice(1, -1)}</b> : p.startsWith("_") && p.endsWith("_") ? <i key={j}>{p.slice(1, -1)}</i> : <span key={j}>{p}</span>
        )}
      </div>
    ));
}

const SAMPLES = ["Hi", "Need gardener tomorrow 9am near Manipal", "Nanage ivattu kelsa beku Udupi", "कल सुबह 3 मज़दूर चाहिए सामान लोड करने Malpe", "ನಾಳೆ ಬೆಳಗ್ಗೆ ತೋಟ ಸ್ವಚ್ಛ ಮಾಡೋಕೆ ಒಬ್ಬರು ಬೇಕು"];

export default function WhatsAppSim() {
  const { user, lang } = useApp();
  const [phone, setPhone] = useState("9123400001");
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: "🙏 Namaskara! Send *Hi* to start, or just type what you need.", time: now() }]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const voice = useVoiceInput(lang, (t) => send(t));

  useEffect(() => {
    if (user?.phone) setPhone(user.phone);
  }, [user?.phone]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  async function send(t: string) {
    if (!t.trim()) return;
    setMsgs((m) => [...m, { from: "me", text: t, time: now() }]);
    setText("");
    try {
      const r = await api("/bot/message", { body: { phone, text: t } });
      for (const rep of r.replies) {
        await new Promise((res) => setTimeout(res, 450));
        setMsgs((m) => [...m, { from: "bot", text: rep, time: now() }]);
      }
    } catch (e: any) {
      setMsgs((m) => [...m, { from: "bot", text: "⚠️ " + e.message, time: now() }]);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-sm font-bold text-muted mb-2 flex items-center gap-2">
        📱 Simulating WhatsApp from
        <input className="input !py-1 !text-sm !w-36" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="rounded-[2rem] overflow-hidden shadow-2xl border-8 border-gray-900 bg-[#efeae2]">
        <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3">
          <span className="h-10 w-10 rounded-full bg-white/20 grid place-items-center text-xl">🤝</span>
          <div className="flex-1">
            <div className="font-bold">KaamNear</div>
            <div className="text-xs text-white/75">Business account • online</div>
          </div>
        </div>
        <div className="h-[55vh] overflow-y-auto p-3 space-y-2">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[15px] shadow-sm ${m.from === "me" ? "bg-[#d9fdd3]" : "bg-white"}`}>
                {fmt(m.text)}
                <div className="text-[10px] text-gray-500 text-right">{m.time}</div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="flex gap-1 overflow-x-auto no-scrollbar px-2 pb-1">
          {SAMPLES.map((s) => (
            <button key={s} onClick={() => send(s)} className="chip bg-white text-xs shrink-0">
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 p-2 bg-[#f0f0f0]">
          <input className="flex-1 rounded-full px-4 py-2.5 bg-white outline-none" placeholder="Message" value={voice.interim || text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(text)} />
          {text ? (
            <button onClick={() => send(text)} className="h-11 w-11 rounded-full bg-[#00a884] text-white grid place-items-center" aria-label="send">
              <Send size={20} />
            </button>
          ) : (
            <button onClick={voice.listening ? voice.stop : voice.start} className={`h-11 w-11 rounded-full text-white grid place-items-center ${voice.listening ? "bg-red-500" : "bg-[#00a884]"}`} aria-label="voice">
              <Mic size={20} />
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted font-semibold mt-3 text-center">In production this connects to the WhatsApp Business API – same bot logic, no app install needed.</p>
    </div>
  );
}
