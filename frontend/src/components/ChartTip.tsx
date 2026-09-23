"use client";

export function ChartTip({ active, payload, label, prefix = "₹" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-surface border border-line shadow-md px-3 py-2 text-sm">
      <div className="text-muted text-xs">{label}</div>
      <div className="font-semibold">
        {prefix}
        {Number(payload[0].value).toLocaleString("en-IN")}
      </div>
    </div>
  );
}
