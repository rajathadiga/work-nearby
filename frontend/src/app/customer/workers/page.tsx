"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { UsersRound, Heart, Search, Repeat } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { catIconFor } from "@/lib/icons";
import { useRequireUser, Loading, PageTitle, Empty } from "@/components/ui";
import { WorkerCard } from "@/components/cards";
import MapView from "@/components/MapView";

export default function BrowseWorkers() {
  const user = useRequireUser();
  const { t, meta, catName } = useApp();
  const [tab, setTab] = useState<"all" | "fav">("all");
  const [cat, setCat] = useState("");
  const [onlyAvail, setOnlyAvail] = useState(false);
  const [q, setQ] = useState("");
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
  const base = tab === "fav" ? favs : list;
  const shown = base?.filter((w) => !q || w.name.toLowerCase().includes(q.toLowerCase()) || w.skills.some((s: any) => s.name.toLowerCase().includes(q.toLowerCase())));

  return (
    <div>
      <PageTitle icon={UsersRound} title={t("find_workers")} sub={`Near ${user.area}`} />
      <div className="card p-3 mb-5 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="grid grid-cols-2 rounded-lg bg-surface-3 p-0.5 text-sm font-medium shrink-0">
          <button onClick={() => setTab("all")} className={`px-4 py-1.5 rounded-md ${tab === "all" ? "bg-surface-3 shadow-sm" : "text-muted"}`}>
            Nearby
          </button>
          <button onClick={() => setTab("fav")} className={`px-4 py-1.5 rounded-md flex items-center gap-1.5 ${tab === "fav" ? "bg-surface-3 shadow-sm" : "text-muted"}`}>
            <Heart size={14} /> {t("favorites")} ({favs.length})
          </button>
        </div>
        <div className="relative lg:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input !py-2 !pl-9 !text-sm" placeholder="Search name or skill" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {tab === "all" && (
          <>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1">
              <button onClick={() => setCat("")} className={`chip shrink-0 border ${!cat ? "bg-brand-600 text-white border-brand-600" : "bg-surface border-line"}`}>
                All
              </button>
              {meta.categories
                .filter((c) => c.id !== "other")
                .map((c) => {
                  const I = catIconFor(c.id);
                  return (
                    <button key={c.id} onClick={() => setCat(c.id)} className={`chip shrink-0 border ${cat === c.id ? "bg-brand-600 text-white border-brand-600" : "bg-surface border-line hover:border-brand-500/40"}`}>
                      <I size={14} /> {catName(c)}
                    </button>
                  );
                })}
            </div>
            <label className="flex items-center gap-2 text-sm font-medium shrink-0">
              <input type="checkbox" className="h-4 w-4 accent-[#f97a2e]" checked={onlyAvail} onChange={(e) => setOnlyAvail(e.target.checked)} />
              {t("available_now")}
            </label>
          </>
        )}
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
        <div className="min-w-0">
          {shown === null || shown === undefined ? (
            <Loading />
          ) : shown.length === 0 ? (
            <Empty icon={UsersRound} text={t("empty")} />
          ) : (
            <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-4">
              {shown.map((w) => (
                <WorkerCard key={w.id} w={w}>
                  <Link href={`/customer/post?rebook=${w.id}${w.last_job ? `&from=${w.last_job.id}` : ""}`} className="btn-primary !py-2 flex-1">
                    {tab === "fav" ? (
                      <>
                        <Repeat size={15} /> {t("book_again")}
                      </>
                    ) : (
                      t("hire")
                    )}
                  </Link>
                  <Link href={`/workers/${w.id}`} className="btn-ghost !py-2">
                    {t("view")}
                  </Link>
                </WorkerCard>
              ))}
            </div>
          )}
        </div>
        <aside className="hidden xl:block sticky top-24">
          <div className="card p-3">
            <MapView
              center={[user.lat, user.lng]}
              height={560}
              zoom={12}
              markers={[
                { lat: user.lat, lng: user.lng, kind: "home", size: 32, popup: "You" },
                ...(shown || []).slice(0, 60).map((w) => ({ lat: w.lat, lng: w.lng, kind: (w.available ? "worker" : "worker_off") as any, size: 24, popup: `<a href="/workers/${w.id}"><b>${w.name}</b></a><br/>★ ${w.rating} · ₹${w.daily_rate}/day` })),
              ]}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
