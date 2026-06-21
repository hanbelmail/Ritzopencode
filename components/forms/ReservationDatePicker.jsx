"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useTickets } from "@/lib/store";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isBefore, isAfter, isWithinInterval, parseISO, isToday } from "date-fns";

// Get all blocked date ranges from finalized reservations
function getBlockedRanges(tickets, excludeId = null) {
  return tickets
    .filter((t) => ["PAYMENT VERIFIED", "BOOKING CONFIRMED"].includes(t.status) && t.id !== excludeId && t.checkIn && t.checkOut)
    .map((t) => ({ checkIn: parseISO(t.checkIn), checkOut: parseISO(t.checkOut) }));
}

// A date is blocked if it falls within [checkIn, checkOut - 1 day] of a confirmed reservation
// (checkOut itself is NOT blocked since a new check-in can happen that day)
function isDateBlocked(date, blockedRanges) {
  return blockedRanges.some(({ checkIn, checkOut }) => {
    // Don't block checkIn or checkOut dates — another reservation can share those turnover days
    const blockStart = addDays(checkIn, 1);
    const blockEnd = addDays(checkOut, -1);
    return !isBefore(date, blockStart) && !isAfter(date, blockEnd);
  });
}

function CalendarMonth({ month, checkIn, checkOut, focusField, onSelectDate, blockedRanges }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = startOfWeek(startOfMonth(month));
  const end = endOfWeek(endOfMonth(month));

  const days = [];
  let d = start;
  while (!isAfter(d, end)) {
    days.push(new Date(d));
    d = addDays(d, 1);
  }

  const inMonth = (date) => date.getMonth() === month.getMonth();
  const isPast = (date) => isBefore(date, today);

  const isStart = (date) => checkIn && isSameDay(date, parseISO(checkIn));
  const isEnd = (date) => checkOut && isSameDay(date, parseISO(checkOut));
  const isInRange = (date) => {
    if (!checkIn || !checkOut) return false;
    return isWithinInterval(date, { start: parseISO(checkIn), end: parseISO(checkOut) }) &&
      !isSameDay(date, parseISO(checkIn)) && !isSameDay(date, parseISO(checkOut));
  };

  return (
    <div className="grid grid-cols-7 gap-y-0.5">
      {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
        <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
      ))}
      {days.map((date, i) => {
        const blocked = inMonth(date) && isDateBlocked(date, blockedRanges);
        const past = isPast(date);
        const outOfMonth = !inMonth(date);
        const start_ = isStart(date);
        const end_ = isEnd(date);
        const inRange = isInRange(date);
        const disabled = past || blocked || outOfMonth;

        // Determine click: if focusField is checkout, only allow after checkIn
        const handleClick = () => {
          if (disabled) return;
          if (focusField === "checkOut" && checkIn && isBefore(date, parseISO(checkIn))) return;
          onSelectDate(date);
        };

        return (
          <div key={i} className={`relative flex items-center justify-center`}>
            {/* Range background strip */}
            {inRange && (
              <div className="absolute inset-y-0 left-0 right-0 bg-[#efe9de]" />
            )}
            {/* Half-strip for start */}
            {start_ && checkOut && (
              <div className="absolute inset-y-0 right-0 left-1/2 bg-[#efe9de]" />
            )}
            {/* Half-strip for end */}
            {end_ && checkIn && (
              <div className="absolute inset-y-0 left-0 right-1/2 bg-[#efe9de]" />
            )}

            <button
              type="button"
              disabled={disabled}
              onClick={handleClick}
              className={`
                relative z-10 w-9 h-9 flex flex-col items-center justify-center text-sm rounded-full transition-colors
                ${outOfMonth ? "invisible" : ""}
                ${blocked ? "cursor-not-allowed" : ""}
                ${!disabled && !start_ && !end_ ? "hover:bg-[#efe9de]" : ""}
                ${start_ || end_ ? "bg-[#cc785c] text-white font-semibold" : ""}
                ${past && !start_ && !end_ ? "text-[#c8c0b6] cursor-not-allowed" : ""}
                ${!start_ && !end_ && !past && !blocked && !outOfMonth ? "text-[#252523]" : ""}
                ${isToday(date) && !start_ && !end_ ? "ring-1 ring-[#cc785c]" : ""}
              `}
            >
              {blocked && !outOfMonth ? (
                <span className="relative w-9 h-9 flex items-center justify-center rounded-full overflow-hidden">
                  {/* Diagonal slash mask */}
                  <svg className="absolute inset-0 w-9 h-9" viewBox="0 0 36 36">
                    <polygon points="0,36 36,0 36,36" fill="#e8dcc8" opacity="0.85" />
                  </svg>
                  <span className="relative text-xs text-[#8e8b82]">{date.getDate()}</span>
                </span>
              ) : (
                <span>{outOfMonth ? "" : date.getDate()}</span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function ReservationDatePicker({ checkIn, checkOut, onCheckInChange, onCheckOutChange, excludeId }) {
  const tickets = useTickets();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [checkInMonth, setCheckInMonth] = useState(checkIn ? parseISO(checkIn) : new Date());
  const [checkOutMonth, setCheckOutMonth] = useState(checkOut ? parseISO(checkOut) : new Date());
  const blockedRanges = getBlockedRanges(tickets, excludeId);

  const fmtDate = (d) => d ? format(parseISO(d), "MMM d, yyyy") : null;

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Check-in Picker */}
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none text-[#252523]">Check-in</label>
        <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={`h-10 w-full justify-start rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] text-left font-normal text-[#141413] shadow-none hover:bg-[#efe9de] ${!checkIn ? "text-[#6c6a64]" : ""}`}
            >
              <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
              {fmtDate(checkIn) || "Pick date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-[12px] border-[#e6dfd8] bg-[#faf9f5] p-4 text-[#141413]" align="start">
            <div className="flex items-center justify-between mb-3">
              <Button type="button" variant="ghost" size="icon" className="rounded-full hover:bg-[#efe9de]" onClick={() => setCheckInMonth((m) => subMonths(m, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-semibold">{format(checkInMonth, "MMMM yyyy")}</span>
              <Button type="button" variant="ghost" size="icon" className="rounded-full hover:bg-[#efe9de]" onClick={() => setCheckInMonth((m) => addMonths(m, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <CalendarMonth
              month={checkInMonth}
              checkIn={checkIn}
              checkOut={checkOut}
              focusField="checkIn"
              blockedRanges={blockedRanges}
              onSelectDate={(date) => {
                const iso = format(date, "yyyy-MM-dd");
                onCheckInChange(iso);
                // If new checkIn is after current checkOut, clear checkOut
                if (checkOut && !isBefore(date, parseISO(checkOut))) {
                  onCheckOutChange("");
                }
                setCheckInOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Check-out Picker */}
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none text-[#252523]">Check-out</label>
        <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={`h-10 w-full justify-start rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] text-left font-normal text-[#141413] shadow-none hover:bg-[#efe9de] ${!checkOut ? "text-[#6c6a64]" : ""}`}
            >
              <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
              {fmtDate(checkOut) || "Pick date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-[12px] border-[#e6dfd8] bg-[#faf9f5] p-4 text-[#141413]" align="start">
            <div className="flex items-center justify-between mb-3">
              <Button type="button" variant="ghost" size="icon" className="rounded-full hover:bg-[#efe9de]" onClick={() => setCheckOutMonth((m) => subMonths(m, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-semibold">{format(checkOutMonth, "MMMM yyyy")}</span>
              <Button type="button" variant="ghost" size="icon" className="rounded-full hover:bg-[#efe9de]" onClick={() => setCheckOutMonth((m) => addMonths(m, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <CalendarMonth
              month={checkOutMonth}
              checkIn={checkIn}
              checkOut={checkOut}
              focusField="checkOut"
              blockedRanges={blockedRanges}
              onSelectDate={(date) => {
                const iso = format(date, "yyyy-MM-dd");
                onCheckOutChange(iso);
                setCheckOutOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
