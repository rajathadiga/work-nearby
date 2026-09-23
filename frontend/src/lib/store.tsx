"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { api, getToken, setToken } from "./api";
import { Lang, t as translate } from "./i18n";
import { speak } from "./speech";

export type Skill = { id: string; cat: string; icon: string; en: string; kn: string; hi: string; unit: string; rate: number; related: string[] };
export type Category = { id: string; icon: string; en: string; kn: string; hi: string };
export type Meta = { categories: Category[]; skills: Skill[]; places: { name: string; lat: number; lng: number }[]; safety_critical: string[]; llm_enabled: boolean; demo_otp: string };
export type Theme = "dark" | "light";
export type Toast = { id: number; title: string; body?: string; link?: string; kind?: string };

type Ctx = {
  user: any;
  loading: boolean;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: string) => string;
  meta: Meta | null;
  skillName: (id: string) => string;
  skillIcon: (id: string) => string;
  catName: (c: Category | undefined) => string;
  login: (token: string, user: any) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  unread: number;
  refreshNotifications: () => void;
  toasts: Toast[];
  toast: (title: string, body?: string, kind?: string, link?: string) => void;
  dismissToast: (id: number) => void;
  voiceOn: boolean;
  setVoiceOn: (v: boolean) => void;
  say: (text: string) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLangState] = useState<Lang>("en");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [voiceOn, setVoiceOnState] = useState(false);
  const seenIds = useRef<Set<number> | null>(null);
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    try {
      const l = localStorage.getItem("kn_lang") as Lang | null;
      if (l) setLangState(l);
      setVoiceOnState(localStorage.getItem("kn_voice") === "1");
      if (localStorage.getItem("kn_theme") === "light") setThemeState("light");
    } catch {}
    api<Meta>("/meta").then(setMeta).catch(() => {});
    if (getToken()) {
      api("/me")
        .then((u) => {
          setUser(u);
          if (u.language && !localStorage.getItem("kn_lang")) setLangState(u.language);
        })
        .catch(() => setToken(""))
        .finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      try {
        localStorage.setItem("kn_lang", l);
      } catch {}
      if (getToken()) api("/me", { method: "PATCH", body: { language: l } }).catch(() => {});
    },
    []
  );

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("kn_theme", t);
    } catch {}
  }, []);

  const setVoiceOn = useCallback((v: boolean) => {
    setVoiceOnState(v);
    try {
      localStorage.setItem("kn_voice", v ? "1" : "0");
    } catch {}
  }, []);

  const t = useCallback((k: string) => translate(k, lang), [lang]);
  const skillName = useCallback(
    (id: string) => {
      const s = meta?.skills.find((x) => x.id === id);
      return s ? s[lang] || s.en : id;
    },
    [meta, lang]
  );
  const skillIcon = useCallback((id: string) => meta?.skills.find((x) => x.id === id)?.icon || "", [meta]);
  const catName = useCallback((c: Category | undefined) => (c ? c[lang] || c.en : ""), [lang]);

  const dismissToast = useCallback((id: number) => setToasts((ts) => ts.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (title: string, body?: string, kind?: string, link?: string) => {
      const id = Date.now() + Math.random();
      setToasts((ts) => [...ts.slice(-3), { id, title, body, kind, link }]);
      setTimeout(() => dismissToast(id), 6000);
    },
    [dismissToast]
  );

  const say = useCallback((text: string) => speak(text, lang), [lang]);

  const refreshNotifications = useCallback(() => {
    if (!getToken()) return;
    api("/notifications")
      .then((r) => {
        setUnread(r.unread);
        const ids: number[] = r.items.map((n: any) => n.id);
        if (seenIds.current === null) {
          seenIds.current = new Set(ids);
          return;
        }
        const fresh = r.items.filter((n: any) => !seenIds.current!.has(n.id) && !n.read);
        fresh.reverse().forEach((n: any) => {
          toast(n.title, n.body, n.kind, n.link);
          if (voiceOn) speak(n.title, lang);
          try {
            if ("Notification" in window && Notification.permission === "granted" && document.hidden) new Notification(n.title, { body: n.body });
          } catch {}
        });
        ids.forEach((i) => seenIds.current!.add(i));
      })
      .catch(() => {});
  }, [toast, voiceOn, lang]);

  useEffect(() => {
    if (!user) return;
    refreshNotifications();
    const iv = setInterval(refreshNotifications, 8000);
    return () => clearInterval(iv);
  }, [user, refreshNotifications]);

  const login = useCallback((token: string, u: any) => {
    setToken(token);
    seenIds.current = null;
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    setToken("");
    setUser(null);
    seenIds.current = null;
  }, []);

  const refreshUser = useCallback(async () => {
    const u = await api("/me");
    setUser(u);
  }, []);

  return (
    <AppCtx.Provider
      value={{ user, loading, lang, setLang, t, meta, skillName, skillIcon, catName, login, logout, refreshUser, unread, refreshNotifications, toasts, toast, dismissToast, voiceOn, setVoiceOn, say, theme, setTheme }}
    >
      {children}
    </AppCtx.Provider>
  );
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}
