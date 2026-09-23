"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { useRequireUser, Loading, PageTitle, Avatar, Modal } from "@/components/ui";

export default function Groups() {
  const user = useRequireUser("worker");
  const { t, meta, lang, toast } = useApp();
  const [groups, setGroups] = useState<any[] | null>(null);
  const [open, setOpen] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [skill, setSkill] = useState("");

  const load = () => api("/groups").then(setGroups);
  useEffect(() => {
    if (user) load();
  }, [user?.id]);

  if (!user || !groups || !meta) return <Loading />;

  async function join(id: number) {
    const g = await api(`/groups/${id}/join`, { body: {} });
    toast(g.is_member ? `👥 Joined ${g.name}` : `Left ${g.name}`);
    load();
  }

  return (
    <div className="space-y-4">
      <PageTitle
        title={`👥 ${t("groups")}`}
        sub="Get team jobs – harvesting, events, construction"
        right={
          <button className="btn-primary !py-2 text-sm" onClick={() => setCreating(true)}>
            + New
          </button>
        }
      />
      {groups.map((g) => (
        <div key={g.id} className={`card p-4 ${g.is_member ? "ring-2 ring-brand-400" : ""}`}>
          <div className="flex items-center gap-3">
            <span className="h-14 w-14 rounded-2xl bg-sun-100 grid place-items-center text-3xl">{g.icon}</span>
            <button className="flex-1 text-left" onClick={() => setOpen(g)}>
              <div className="font-extrabold text-lg">{g.name}</div>
              <div className="text-sm text-muted font-semibold">
                📍 {g.area} • {g.distance_km} km • {g.size} workers • 🟢 {g.available_now} free now
              </div>
            </button>
            <button className={g.is_member ? "btn-ghost !py-2" : "btn-primary !py-2"} onClick={() => join(g.id)}>
              {g.is_member ? "✓ Joined" : "Join"}
            </button>
          </div>
          <div className="flex -space-x-2 mt-3">
            {g.members.slice(0, 8).map((m: any) => (
              <span key={m.id} className="ring-2 ring-white rounded-full">
                <Avatar name={m.name} size={32} />
              </span>
            ))}
            {g.size > 8 && <span className="h-8 px-2 rounded-full bg-gray-100 text-xs font-bold grid place-items-center ring-2 ring-white">+{g.size - 8}</span>}
          </div>
        </div>
      ))}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name}>
        <div className="divide-y">
          {open?.members.map((m: any) => (
            <a key={m.id} href={`/workers/${m.id}`} className="flex items-center gap-3 py-2">
              <Avatar name={m.name} size={40} online={m.available} />
              <span className="flex-1 font-bold">{m.name}</span>
              <span className="font-bold">⭐ {m.rating || "–"}</span>
            </a>
          ))}
        </div>
      </Modal>
      <Modal open={creating} onClose={() => setCreating(false)} title="Create a worker group">
        <div className="space-y-3">
          <input className="input" placeholder="e.g. Kemmannu Painters" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="input" value={skill} onChange={(e) => setSkill(e.target.value)}>
            <option value="">Main skill…</option>
            {meta.skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {s[lang] || s.en}
              </option>
            ))}
          </select>
          <button
            className="btn-primary btn-lg w-full"
            disabled={!name || !skill}
            onClick={async () => {
              await api("/groups", { body: { name, skill } });
              setCreating(false);
              toast("👥 Group created");
              load();
            }}
          >
            {t("save")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
