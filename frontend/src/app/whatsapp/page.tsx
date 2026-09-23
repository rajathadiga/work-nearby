"use client";
import { useEffect, useRef, useState } from "react";
import { Send, Mic, MessageCircle, Handshake, CheckCheck, Briefcase, HardHat, Languages } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { useVoiceInput } from "@/lib/speech";
import { IconBadge } from "@/lib/icons";
import { PageTitle } from "@/components/ui";

type Msg = { from: "me" | "bot"; text: string; time: string };
const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function fmt(s: string) {
  return s.split("\n").map((line, i) => (
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
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: "Namaskara! Send *Hi* to start, or just type what you need.", time: now() }]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const voice = useVoiceInput(lang, (t) => send(t));

  useEffect(() => {
    if (user?.phone) setPhone(user.phone);
  }, [user?.phone]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
      setMsgs((m) => [...m, { from: "bot", text: "Error: " + e.message, time: now() }]);
    }
  }

  return (
    <div>
      <PageTitle icon={MessageCircle} title="WhatsApp bot" sub="Post work or find work just by sending a message — no app needed" />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-8 items-start">
        <div className="space-y-4 order-2 lg:order-1">
          {[
            [Briefcase, "Need a worker", "Type what you need — the bot understands the work, suggests a fair price and posts the job."],
            [HardHat, "Need work", "Say “Nanage ivattu kelsa beku” — you’re marked available and get a numbered list of nearby jobs."],
            [Languages, "Any language", "English, Kannada, Hindi or mixed (Kanglish / Hinglish). Voice messages work too."],
          ].map(([Icon, a, b]: any) => (
            <div key={a} className="card p-5 flex gap-4">
              <IconBadge icon={Icon} size={42} />
              <div>
                <div className="font-semibold">{a}</div>
                <div className="text-sm text-muted">{b}</div>
              </div>
            </div>
          ))}
          <div className="card p-5">
            <div className="label">Try these messages</div>
            <div className="flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <button key={s} onClick={() => send(s)} className="chip bg-white border border-line hover:border-brand-300 text-left">
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted">
              Sending from
              <input className="input !py-1.5 !text-sm !w-40" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted">In production this connects to the WhatsApp Business API with the same bot logic.</p>
        </div>

        <div className="order-1 lg:order-2 rounded-[2rem] overflow-hidden border-[10px] border-slate-800 shadow-xl bg-[#efeae2] max-w-[440px] w-full mx-auto">
          <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3">
            <span className="h-10 w-10 rounded-full bg-white/15 grid place-items-center">
              <Handshake size={20} />
            </span>
            <div className="flex-1">
              <div className="font-semibold">KaamNear</div>
              <div className="text-xs text-white/70">Business account · online</div>
            </div>
          </div>
          <div className="h-[60vh] overflow-y-auto p-3 space-y-2">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-[14.5px] shadow-sm ${m.from === "me" ? "bg-[#d9fdd3]" : "bg-white"}`}>
                  {fmt(m.text)}
                  <div className="text-[10px] text-slate-500 text-right flex items-center justify-end gap-1">
                    {m.time} {m.from === "me" && <CheckCheck size={12} className="text-sky-500" />}
                  </div>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="flex items-center gap-2 p-2 bg-[#f0f0f0]">
            <input className="flex-1 rounded-full px-4 py-2.5 bg-white outline-none text-sm" placeholder="Message" value={voice.interim || text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(text)} />
            {text ? (
              <button onClick={() => send(text)} className="h-10 w-10 rounded-full bg-[#00a884] text-white grid place-items-center" aria-label="send">
                <Send size={18} />
              </button>
            ) : (
              <button onClick={voice.listening ? voice.stop : voice.start} className={`h-10 w-10 rounded-full text-white grid place-items-center ${voice.listening ? "bg-rose-500" : "bg-[#00a884]"}`} aria-label="voice">
                <Mic size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
