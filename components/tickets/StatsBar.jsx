"use client";

export default function StatsBar({ stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-[12px] bg-[#efe9de] px-5 py-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#6c6a64] font-medium">{s.label}</p>
          <p className="font-['Cormorant_Garamond',_'EB_Garamond',_'Times_New_Roman',_serif] text-4xl font-medium tracking-[-0.03em] mt-1 text-[#141413]">{s.value}</p>
          {s.sub && <p className="text-[11px] text-[#6c6a64] mt-0.5">{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}
