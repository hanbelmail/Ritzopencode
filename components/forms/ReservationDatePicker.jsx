"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useUnavailableStays } from "@/lib/store";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isBefore, isAfter, isWithinInterval, parseISO, isToday } from "date-fns";

function getReservedRanges(stays) {
  return stays.map((stay) => ({ checkIn: parseISO(stay.checkIn), checkOut: parseISO(stay.checkOut) }));
}

function getReservationMarker(date, reservedRanges) {
  return reservedRanges.reduce(
    (marker, { checkIn, checkOut }) => ({
      starts: marker.starts || isSameDay(date, checkIn),
      ends: marker.ends || isSameDay(date, checkOut),
      inside: marker.inside || (isAfter(date, checkIn) && isBefore(date, checkOut)),
    }),
    { starts: false, ends: false, inside: false }
  );
}

function isOccupiedNight(date, { checkIn, checkOut }) {
  return !isBefore(date, checkIn) && isBefore(date, checkOut);
}

function overlapsOccupiedNights(start, end, reservedRanges) {
  if (!isBefore(start, end)) return false;
  return reservedRanges.some(({ checkIn, checkOut }) => isBefore(start, checkOut) && isAfter(end, checkIn));
}

function isDateUnavailable(date, { focusField, checkIn, checkOut, reservedRanges }) {
  if (focusField === "checkOut" && checkIn) {
    const start = parseISO(checkIn);
    return !isAfter(date, start) || overlapsOccupiedNights(start, date, reservedRanges);
  }

  if (focusField === "checkIn" && checkOut) {
    const end = parseISO(checkOut);
    return isBefore(date, end) && overlapsOccupiedNights(date, end, reservedRanges);
  }

  if (focusField === "checkIn") {
    return reservedRanges.some((range) => isOccupiedNight(date, range));
  }

  return reservedRanges.some(({ checkIn: start, checkOut: end }) => isAfter(date, start) && isBefore(date, end));
}

function ReservationMarker({ marker }) {
  if (!marker.starts && !marker.ends && !marker.inside) return null;

  return (
    <span className="absolute inset-0 overflow-hidden rounded-full">
      {marker.inside && <span className="absolute inset-0 bg-[#e8dcc8]" />}
      {marker.starts && <span className="absolute inset-y-0 right-0 w-1/2 bg-[#e8dcc8]" />}
      {marker.ends && <span className="absolute inset-y-0 left-0 w-1/2 bg-[#e8dcc8]" />}
    </span>
  );
}

function CalendarMonth({ month, checkIn, checkOut, focusField, onSelectDate, reservedRanges }) {
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
        const marker = inMonth(date) ? getReservationMarker(date, reservedRanges) : { starts: false, ends: false, inside: false };
        const unavailable = inMonth(date) && isDateUnavailable(date, { focusField, checkIn, checkOut, reservedRanges });
        const past = isPast(date);
        const outOfMonth = !inMonth(date);
        const start_ = isStart(date);
        const end_ = isEnd(date);
        const inRange = isInRange(date);
        const marked = marker.starts || marker.ends || marker.inside;
        const disabled = past || unavailable || outOfMonth;

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
                ${unavailable ? "cursor-not-allowed" : ""}
                ${!disabled && !start_ && !end_ ? "hover:bg-[#efe9de]" : ""}
                ${start_ || end_ ? "bg-[#cc785c] text-white font-semibold" : ""}
                ${past && !start_ && !end_ ? "text-[#c8c0b6] cursor-not-allowed" : ""}
                ${marked && !start_ && !end_ ? "text-[#6c6a64]" : ""}
                ${!start_ && !end_ && !past && !unavailable && !outOfMonth && !marked ? "text-[#252523]" : ""}
                ${isToday(date) && !start_ && !end_ ? "ring-1 ring-[#cc785c]" : ""}
              `}
            >
              {!outOfMonth && !start_ && !end_ && <ReservationMarker marker={marker} />}
              <span className="relative z-10">{outOfMonth ? "" : date.getDate()}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function ReservationDatePicker({ checkIn, checkOut, onCheckInChange, onCheckOutChange, excludeId }) {
  const unavailableStays = useUnavailableStays(excludeId);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [checkInMonth, setCheckInMonth] = useState(checkIn ? parseISO(checkIn) : new Date());
  const [checkOutMonth, setCheckOutMonth] = useState(checkOut ? parseISO(checkOut) : new Date());
  const reservedRanges = getReservedRanges(unavailableStays);

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
              reservedRanges={reservedRanges}
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
              reservedRanges={reservedRanges}
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
