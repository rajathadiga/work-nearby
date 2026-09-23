"use client";

export function ChartTip({ active, payload, label, prefix = "₹" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-sm">
      <div className="font-bold text-muted">{label}</div>
      <div className="font-black">
        {prefix}
        {Number(payload[0].value).toLocaleString("en-IN")}
      </div>
    </div>
  );
}
