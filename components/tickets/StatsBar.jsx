"use client";

export default function StatsBar({ stats }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="border border-gray-200 rounded-xl bg-white px-4 py-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">{s.label}</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">{s.value}</p>
          {s.sub && <p className="text-[11px] text-gray-400 mt-0.5">{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}
