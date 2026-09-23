"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { LANGS, Lang } from "./i18n";

const speechCode = (lang: Lang) => LANGS.find((l) => l.id === lang)?.speech || "en-IN";

/** Read text aloud in the user's language (Web Speech API). */
export function speak(text: string, lang: Lang) {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*_#•|]/g, " "));
    const code = speechCode(lang);
    u.lang = code;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang === code) || window.speechSynthesis.getVoices().find((v) => v.lang.startsWith(code.slice(0, 2)));
    if (voice) u.voice = voice;
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  } catch {}
}

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel();
  } catch {}
}

/** Voice input hook – returns live transcript. Works in Chrome/Edge/Android (kn-IN, hi-IN, en-IN). */
export function useVoiceInput(lang: Lang, onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(true);
  const recRef = useRef<any>(null);
  const cbRef = useRef(onFinal);
  cbRef.current = onFinal;

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) setSupported(false);
  }, []);

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    stopSpeaking();
    const rec = new SR();
    rec.lang = speechCode(lang);
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e: any) => {
      let inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else inter += r[0].transcript;
      }
      setInterim(finalText + inter);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      if (finalText.trim()) cbRef.current(finalText.trim());
      setInterim("");
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  }, [lang]);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  return { listening, interim, supported, start, stop };
}
