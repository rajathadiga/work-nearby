"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { Modal, StarInput } from "./ui";

export function ReviewModal({ b, title, onClose, onDone, tags }: any) {
  const { t, toast } = useApp();
  const [rating, setRating] = useState(5);
  const [sel, setSel] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  if (!b) return null;
  return (
    <Modal open onClose={onClose} title={title}>
      <div className="space-y-4">
        <StarInput value={rating} onChange={setRating} />
        <div className="flex flex-wrap gap-2 justify-center">
          {tags.map((x: string) => (
            <button key={x} onClick={() => setSel(sel.includes(x) ? sel.filter((y) => y !== x) : [...sel, x])} className={`chip ${sel.includes(x) ? "bg-brand-600 text-white" : "bg-surface-3 text-slate-300"}`}>
              {x}
            </button>
          ))}
        </div>
        <textarea className="input" rows={2} placeholder="Say something (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        <button
          className="btn-primary btn-lg w-full"
          onClick={async () => {
            try {
              await api(`/bookings/${b.id}/review`, { body: { rating, comment, tags: sel } });
              toast("Thank you for the review", "", "success");
              onDone();
            } catch (e: any) {
              toast("Something went wrong", e.message, "error");
            }
          }}
        >
          {t("submit")}
        </button>
      </div>
    </Modal>
  );
}

export function DisputeModal({ b, onClose, onDone }: any) {
  const { t, toast } = useApp();
  const [reason, setReason] = useState("");
  const presets = ["Work not complete", "Poor quality", "Asked for extra money", "Damaged something", "Payment not received", "Rude behaviour"];
  if (!b) return null;
  return (
    <Modal open onClose={onClose} title={t("report_problem")}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button key={p} onClick={() => setReason(p)} className={`chip ${reason === p ? "bg-sun-500 text-white" : "bg-surface-3 text-slate-300"}`}>
              {p}
            </button>
          ))}
        </div>
        <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain the problem" />
        <p className="text-xs text-muted font-semibold">Our team will check photos, chat, check-in/out times and payment before deciding.</p>
        <button
          className="btn-sun btn-lg w-full"
          disabled={!reason.trim()}
          onClick={async () => {
            try {
              await api(`/bookings/${b.id}/dispute`, { body: { reason } });
              toast("Problem reported", "Our team will contact you", "success");
              onDone();
            } catch (e: any) {
              toast("Something went wrong", e.message, "error");
            }
          }}
        >
          {t("submit")}
        </button>
      </div>
    </Modal>
  );
}
