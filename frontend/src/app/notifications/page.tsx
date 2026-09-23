"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { useRequireUser, Loading, PageTitle, Empty, timeAgo, SpeakButton } from "@/components/ui";

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
    <div className="space-y-3 max-w-2xl mx-auto">
      <PageTitle title={`🔔 ${t("notifications")}`} speakText={items.slice(0, 3).map((n) => n.title).join(". ")} />
      {items.length === 0 && <Empty icon="🔕" text={t("empty")} />}
      {items.map((n) => {
        const body = (
          <div className={`card p-4 flex gap-3 items-start ${!n.read ? "border-l-4 border-l-sun-500" : ""}`}>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold">{n.title}</div>
              {n.body && <div className="text-sm text-muted font-semibold">{n.body}</div>}
              <div className="text-xs text-muted mt-1">{timeAgo(n.created_at)}</div>
            </div>
            <SpeakButton text={`${n.title}. ${n.body}`} />
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
  );
}
