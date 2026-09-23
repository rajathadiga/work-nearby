"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { useRequireUser, Loading, PageTitle, Empty } from "@/components/ui";
import { WorkerCard } from "@/components/cards";
import MapView from "@/components/MapView";

export default function BrowseWorkers() {
  const user = useRequireUser();
  const { t, meta, catName } = useApp();
  const [tab, setTab] = useState<"all" | "fav">("all");
  const [cat, setCat] = useState("");
  const [onlyAvail, setOnlyAvail] = useState(false);
  const [list, setList] = useState<any[] | null>(null);
  const [favs, setFavs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    setList(null);
    api(`/workers?skill=${cat}&available=${onlyAvail}`).then(setList);
  }, [user?.id, cat, onlyAvail]);
  useEffect(() => {
    if (user) api("/favorites").then(setFavs);
  }, [user?.id]);

  if (!user || !meta) return <Loading />;
  const shown = tab === "fav" ? favs : list;

  return (
    <div className="space-y-4">
      <PageTitle title={`👷 ${t("find_workers")}`} sub={`📍 ${user.area}`} />
      <div className="flex rounded-full bg-white border border-black/10 p-1 font-bold">
        <button onClick={() => setTab("all")} className={`flex-1 py-2 rounded-full ${tab === "all" ? "bg-brand-600 text-white" : ""}`}>
          🔎 Nearby
        </button>
        <button onClick={() => setTab("fav")} className={`flex-1 py-2 rounded-full ${tab === "fav" ? "bg-brand-600 text-white" : ""}`}>
          ❤️ {t("favorites")} ({favs.length})
        </button>
      </div>
      {tab === "all" && (
        <>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button onClick={() => setCat("")} className={`chip shrink-0 ${!cat ? "bg-brand-600 text-white" : "bg-white border border-black/10"}`}>
              All
            </button>
            {meta.categories
              .filter((c) => c.id !== "other")
              .map((c) => (
                <button key={c.id} onClick={() => setCat(c.id)} className={`chip shrink-0 ${cat === c.id ? "bg-brand-600 text-white" : "bg-white border border-black/10"}`}>
                  {c.icon} {catName(c)}
                </button>
              ))}
          </div>
          <label className="flex items-center gap-2 font-bold">
            <input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={onlyAvail} onChange={(e) => setOnlyAvail(e.target.checked)} />
            🟢 {t("available_now")}
          </label>
          {list && list.length > 0 && (
            <MapView
              center={[user.lat, user.lng]}
              height={220}
              zoom={12}
              markers={[
                { lat: user.lat, lng: user.lng, emoji: "🏠", size: 28, popup: "You" },
                ...list.slice(0, 40).map((w) => ({ lat: w.lat, lng: w.lng, emoji: w.available ? "👷" : "🧑", popup: `<a href="/workers/${w.id}"><b>${w.name}</b></a><br/>⭐ ${w.rating} • ₹${w.daily_rate}/day` })),
              ]}
            />
          )}
        </>
      )}
      {shown === null ? (
        <Loading />
      ) : shown.length === 0 ? (
        <Empty icon="👷" text={t("empty")} />
      ) : (
        shown.map((w) => (
          <WorkerCard key={w.id} w={w}>
            <Link href={`/customer/post?rebook=${w.id}${w.last_job ? `&from=${w.last_job.id}` : ""}`} className="btn-primary !py-2 flex-1">
              {tab === "fav" ? `🔁 ${t("book_again")}` : t("hire")}
            </Link>
            <Link href={`/workers/${w.id}`} className="btn-ghost !py-2">
              {t("view")}
            </Link>
          </WorkerCard>
        ))
      )}
    </div>
  );
}
