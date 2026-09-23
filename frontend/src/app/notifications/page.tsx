"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, BellOff, Briefcase, CalendarCheck, MessageSquare, Wallet, Star, Scale, Siren, Info, ShieldCheck, ChevronRight } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { IconBadge } from "@/lib/icons";
import { useRequireUser, Loading, PageTitle, Empty, timeAgo, SpeakButton, clean } from "@/components/ui";

const KIND: Record<string, [any, string]> = {
  job_alert: [Briefcase, "brand"],
  booking: [CalendarCheck, "sky"],
  chat: [MessageSquare, "slate"],
  payment: [Wallet, "brand"],
  review: [Star, "amber"],
  dispute: [Scale, "amber"],
  sos: [Siren, "rose"],
  admin: [ShieldCheck, "violet"],
  info: [Info, "slate"],
};

export default function Notifications() {
  const user = useRequireUser();
  const { t, refreshNotifications } = useApp();
  const [items, setItems] = useState<any[] | null>(null);

  useEffect(() => {
    if (!user) return;
    api("/notifications").then((r) => {
      setItems(r.items);
      api("/notifications/read", { body: {} }).then(refreshNotifications);
    });
    try {
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user || !items) return <Loading />;
  return (
    <div className="max-w-4xl">
      <PageTitle icon={Bell} title={t("notifications")} speakText={items.slice(0, 3).map((n) => clean(n.title)).join(". ")} />
      {items.length === 0 ? (
        <Empty icon={BellOff} text={t("empty")} />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {items.map((n) => {
            const [Icon, tone] = KIND[n.kind] || KIND.info;
            const body = (
              <div className={`px-5 py-4 flex gap-4 items-start ${!n.read ? "bg-brand-500/10" : ""} ${n.link ? "hover:bg-surface-2" : ""}`}>
                <IconBadge icon={Icon} size={38} tone={tone} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {!n.read && <span className="h-2 w-2 rounded-full bg-brand-600 shrink-0" />}
                    {clean(n.title)}
                  </div>
                  {n.body && <div className="text-sm text-muted">{clean(n.body)}</div>}
                  <div className="text-xs text-muted mt-1">{timeAgo(n.created_at)}</div>
                </div>
                <SpeakButton text={`${clean(n.title)}. ${clean(n.body)}`} />
                {n.link && <ChevronRight size={18} className="text-muted self-center" />}
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} className="block">
                {body}
              </Link>
            ) : (
              <div key={n.id}>{body}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
