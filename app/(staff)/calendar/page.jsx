"use client";

import { useState, useMemo } from "react";
import { DEFAULT_SETTINGS, useSettings, useTickets } from "@/lib/store";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── helpers ────────────────────────────────────────────────────────────────

function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ─── colour map ──────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  QUOTE: "bg-slate-600 text-white border-slate-700",
  PENDING: "bg-amber-600 text-white border-amber-700",
  CONFIRMED: "bg-blue-700 text-white border-blue-800",
  "PAYMENT RECEIVED": "bg-emerald-700 text-white border-emerald-800",
  COMPLETED: "bg-primary text-primary-foreground border-primary",
  CANCELLED: "bg-red-700 text-white border-red-800",
};

const PAYMENT_ICONS = {
  Airbnb:          "✈",
  Booking:         "B.",
  "Direct Booking":"B.",
  Zelle:           "Z",
  Venmo:           "V",
  Cash:            "$",
  Stripe:          "◎",
};

function paymentIcon(method) {
  return PAYMENT_ICONS[method] || method?.charAt(0) || "?";
}

// ─── build weeks grid for a month ───────────────────────────────────────────
function buildWeeks(year, month) {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const weeks = [];
  let week = [];

  // Pad start
  for (let i = 0; i < first.getDay(); i++) week.push(null);

  for (let d = 1; d <= last.getDate(); d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) { weeks.push(week); week = []; }
  }

  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

// ─── compute bar segments for a reservation ─────────────────────────────────
// Returns array of { weekIdx, colStart, colSpan, visualStart, visualEnd, isFirst, isLast, reservation }
function computeSegments(reservation, weeks) {
  const start = parseDate(reservation.checkIn);
  const end   = parseDate(reservation.checkOut);
  if (!start || !end) return [];

  const segments = [];
  weeks.forEach((week, weekIdx) => {
    const validDays = week.filter(Boolean);
    if (!validDays.length) return;

    let colStart = -1, colSpan = 0;
    week.forEach((day, col) => {
      if (!day) return;
      const inRange = day >= start && day <= end;
      if (inRange) {
        if (colStart === -1) colStart = col;
        colSpan++;
      }
    });

    if (colStart === -1 || colSpan === 0) return;

    const firstDayOfWeek = week.find(Boolean);
    const lastDayOfWeek  = week.filter(Boolean).slice(-1)[0];

    const lastCol = colStart + colSpan - 1;
    const isFirst = isSameDay(week[colStart], start) || (colStart === week.findIndex(Boolean) && start < firstDayOfWeek);
    const isLast  = isSameDay(week[lastCol], end) || (lastCol === week.findLastIndex(Boolean) && end > lastDayOfWeek);
    const startsOnCheckIn = isSameDay(week[colStart], start);
    const endsOnCheckOut = isSameDay(week[lastCol], end);
    const visualStart = colStart + (startsOnCheckIn ? 0.5 : 0);
    const visualEnd = lastCol + (endsOnCheckOut ? 0.5 : 1);

    segments.push({ weekIdx, colStart, colSpan, visualStart, visualEnd, isFirst, isLast, reservation });
  });

  return segments;
}

// ─── single month grid ───────────────────────────────────────────────────────
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function MonthGrid({ year, month, reservations, settings }) {
  const weeks = useMemo(() => buildWeeks(year, month), [year, month]);

  // Per-week bar layout (multi-row stacking)
  const weekBars = useMemo(() => {
    const result = weeks.map(() => []);  // array of arrays of segments

    reservations.forEach((res) => {
      const segments = computeSegments(res, weeks);
      segments.forEach((seg) => {
        // Find a free row
        let row = 0;
        while (true) {
          const occupied = result[seg.weekIdx].filter(s => s.row === row);
          const overlaps = occupied.some(s =>
            seg.visualStart < s.visualEnd && seg.visualEnd > s.visualStart
          );
          if (!overlaps) break;
          row++;
        }
        result[seg.weekIdx].push({ ...seg, row });
      });
    });

    return result;
  }, [weeks, reservations]);

  const maxRows = weekBars.map(segs => segs.length ? Math.max(...segs.map(s => s.row)) + 1 : 0);

  const monthName = new Date(year, month, 1).toLocaleString("en-US", { month: "short" });

  // Per-day pricing: show nightly cost on last day of each stay
  const dayPrices = useMemo(() => {
    const map = {};
    reservations.forEach((res) => {
      const end = parseDate(res.checkOut);
      if (!end) return;
      const lastNight = addDays(end, -1);
      const key = toKey(lastNight);
      const { rateOffered, nights } = res._computed || {};
      const nightly = rateOffered && nights ? Math.round(rateOffered / nights) : null;
      if (nightly) map[key] = (map[key] || []).concat(`$${nightly}`);
    });
    return map;
  }, [reservations]);

  return (
    <div className="mb-10">
      {/* Month title */}
      <h2 className="text-xl font-bold text-gray-900 mb-3">{monthName} {year}</h2>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-l border-t border-gray-200">
        {DAYS.map(d => (
          <div key={d} className="border-r border-b border-gray-200 py-1 px-1 text-center text-[11px] text-gray-400 font-medium bg-white">
            {d}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div className="border-l border-gray-200">
        {weeks.map((week, wi) => {
          const barRows = maxRows[wi] || 0;
          const rowHeight = Math.max(70, 36 + barRows * 22 + 20);

          return (
            <div
              key={wi}
              className="grid grid-cols-7 relative border-b border-gray-200"
              style={{ minHeight: rowHeight }}
            >
              {/* Day cells */}
              {week.map((day, ci) => (
                <div
                  key={ci}
                  className="border-r border-gray-200 relative"
                  style={{ minHeight: rowHeight }}
                >
                  {day && (
                    <>
                      {/* Day number */}
                      <span className="absolute top-1.5 left-2 text-sm font-medium text-gray-700 z-10">
                        {day.getDate()}
                      </span>

                      {/* Diagonal split lines */}
                      <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ opacity: 0.07 }}
                        preserveAspectRatio="none"
                      >
                        <line x1="0" y1="100%" x2="100%" y2="0" stroke="#94a3b8" strokeWidth="1" />
                      </svg>

                      {/* Price label bottom-right */}
                      {dayPrices[toKey(day)] && (
                        <span className="absolute bottom-1.5 right-2 text-[11px] text-gray-400 z-10">
                          {dayPrices[toKey(day)].join(" / ")}
                        </span>
                      )}
                    </>
                  )}
                </div>
              ))}

              {/* Reservation bars (absolute overlay) */}
              {weekBars[wi].map((seg, si) => {
                const res = seg.reservation;
                const color = STATUS_COLORS[res.status] || STATUS_COLORS.QUOTE;
                const colWidth = 100 / 7;
                const left  = `${seg.visualStart * colWidth}%`;
                const width = `${(seg.visualEnd - seg.visualStart) * colWidth}%`;
                const top   = `${22 + seg.row * 22}px`;

                // Slant clip path
                const slantPx = 8;
                let clipPath = "none";
                if (seg.isFirst && seg.isLast) {
                  clipPath = `polygon(${slantPx}px 0%, 100% 0%, calc(100% - ${slantPx}px) 100%, 0% 100%)`;
                } else if (seg.isFirst) {
                  clipPath = `polygon(${slantPx}px 0%, 100% 0%, 100% 100%, 0% 100%)`;
                } else if (seg.isLast) {
                  clipPath = `polygon(0% 0%, 100% 0%, calc(100% - ${slantPx}px) 100%, 0% 100%)`;
                }

                return (
                  <div
                    key={si}
                    className={`absolute flex items-center px-2 overflow-hidden z-20 border ${color}`}
                    style={{
                      left,
                      width,
                      top,
                      height: "18px",
                      clipPath,
                      borderRadius: "2px",
                    }}
                  >
                    <span className="truncate text-[11px] font-medium leading-none flex items-center gap-1 w-full">
                      <span className="truncate">{res.guestName || res.guests?.[0] || "Guest"}</span>
                      {res.paymentMethod && (
                        <span className="shrink-0 ml-auto bg-current/10 rounded px-0.5 text-[9px] font-bold">
                          {paymentIcon(res.paymentMethod)}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────
export default function CalendarView() {
  const today = new Date();
  const [startMonth, setStartMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const NUM_MONTHS = 3;

  const tickets = useTickets();
  const settings = useSettings() || DEFAULT_SETTINGS;

  // Build computed reservations
  const reservations = useMemo(() => {
    return tickets
      .filter(t => t.checkIn && t.checkOut && t.status !== "CANCELLED" && t.status !== "QUOTE")
      .map(t => ({
        ...t,
        guestName: t.guests?.[0] || "Guest",
        _computed: (() => {
          const nights = t.checkIn && t.checkOut
            ? Math.round((new Date(t.checkOut) - new Date(t.checkIn)) / 86400000)
            : 0;
          return { rateOffered: t.rateOffered, nights };
        })(),
      }));
  }, [tickets]);

  const months = useMemo(() => {
    return Array.from({ length: NUM_MONTHS }, (_, i) => {
      const d = new Date(startMonth.year, startMonth.month + i, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }, [startMonth]);

  // Filter reservations visible in a given month
  function resForMonth(year, month) {
    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);
    return reservations.filter(r => {
      const s = parseDate(r.checkIn);
      const e = parseDate(r.checkOut);
      return s && e && s <= last && e >= first;
    });
  }

  const prev = () => {
    const d = new Date(startMonth.year, startMonth.month - 1, 1);
    setStartMonth({ year: d.getFullYear(), month: d.getMonth() });
  };
  const next = () => {
    const d = new Date(startMonth.year, startMonth.month + 1, 1);
    setStartMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Property Calendar</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prev}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={next}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-6 text-xs">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-sm inline-block border ${color}`} />
              <span className="text-gray-600">{status}</span>
            </div>
          ))}
        </div>

        {/* Month grids */}
        {months.map(({ year, month }) => (
          <MonthGrid
            key={`${year}-${month}`}
            year={year}
            month={month}
            reservations={resForMonth(year, month)}
            settings={settings}
          />
        ))}
      </div>
    </div>
  );
}
