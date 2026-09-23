"use client";
import { useEffect, useState } from "react";
import { UsersRound, Plus, MapPin, Check } from "lucide-react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { SkillBadge } from "@/lib/icons";
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
    toast(g.is_member ? `Joined ${g.name}` : `Left ${g.name}`, "", "success");
    load();
  }

  return (
    <div>
      <PageTitle
        icon={UsersRound}
        title={t("groups")}
        sub="Get team jobs — harvesting, events, construction"
        right={
          <button className="btn-primary !py-2" onClick={() => setCreating(true)}>
            <Plus size={16} /> New group
          </button>
        }
      />
      <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {groups.map((g) => (
          <div key={g.id} className={`card p-5 flex flex-col ${g.is_member ? "border-brand-500/40" : ""}`}>
            <div className="flex items-start gap-3">
              <SkillBadge skill={g.skill} size={46} tone={g.is_member ? "brand" : "slate"} />
              <button className="flex-1 text-left min-w-0" onClick={() => setOpen(g)}>
                <div className="font-semibold hover:text-brand-300">{g.name}</div>
                <div className="text-sm text-muted flex items-center gap-1">
                  <MapPin size={13} /> {g.area} · {g.distance_km} km
                </div>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 my-4 text-center">
              <div className="rounded-lg bg-surface-2 py-2">
                <div className="font-semibold">{g.size}</div>
                <div className="text-xs text-muted">Members</div>
              </div>
              <div className="rounded-lg bg-surface-2 py-2">
                <div className="font-semibold text-emerald-300">{g.available_now}</div>
                <div className="text-xs text-muted">Free now</div>
              </div>
              <div className="rounded-lg bg-surface-2 py-2">
                <div className="font-semibold text-sm truncate px-1">{g.skill_name}</div>
                <div className="text-xs text-muted">Main skill</div>
              </div>
            </div>
            <div className="flex items-center mt-auto">
              <div className="flex -space-x-2 flex-1">
                {g.members.slice(0, 6).map((m: any) => (
                  <span key={m.id} className="ring-2 ring-surface rounded-full">
                    <Avatar name={m.name} size={30} />
                  </span>
                ))}
                {g.size > 6 && <span className="h-[30px] px-2 rounded-full bg-surface-3 text-xs font-medium grid place-items-center ring-2 ring-surface">+{g.size - 6}</span>}
              </div>
              <button className={g.is_member ? "btn-ghost !py-2" : "btn-primary !py-2"} onClick={() => join(g.id)}>
                {g.is_member ? (
                  <>
                    <Check size={15} /> Joined
                  </>
                ) : (
                  "Join"
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name}>
        <div className="divide-y divide-line">
          {open?.members.map((m: any) => (
            <a key={m.id} href={`/workers/${m.id}`} className="flex items-center gap-3 py-2.5 hover:bg-surface-2 px-1 rounded">
              <Avatar name={m.name} size={38} online={m.available} />
              <span className="flex-1 font-medium">{m.name}</span>
              <span className="text-sm text-muted">★ {m.rating || "–"}</span>
            </a>
          ))}
        </div>
      </Modal>
      <Modal open={creating} onClose={() => setCreating(false)} title="Create a worker group">
        <div className="space-y-3">
          <div>
            <div className="label">Group name</div>
            <input className="input" placeholder="e.g. Kemmannu Painters" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <div className="label">Main skill</div>
            <select className="input" value={skill} onChange={(e) => setSkill(e.target.value)}>
              <option value="">Select…</option>
              {meta.skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s[lang] || s.en}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn-primary btn-lg w-full"
            disabled={!name || !skill}
            onClick={async () => {
              await api("/groups", { body: { name, skill } });
              setCreating(false);
              toast("Group created", "", "success");
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
