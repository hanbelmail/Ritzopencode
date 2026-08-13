"use client";

import { Clock, Phone } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { fmtDate, fmtMoney } from "@/lib/calc";

export default function TicketCard({ ticket, onClick }) {
  const guests = (ticket.guests || []).filter(Boolean);
  const [primary, ...others] = guests;

  return (
    <div
      className="rounded-[12px] border border-[#e6dfd8] bg-[#faf9f5] p-5 transition-shadow hover:shadow-[0_1px_3px_rgba(20,20,19,0.08)] cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full border border-[#e6dfd8] bg-[#efe9de] flex items-center justify-center mt-0.5">
            <Clock className="w-4 h-4 text-[#6c6a64]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm text-[#141413]">{primary || "Unnamed guest"}</p>
              {ticket.roomType && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#efe9de] text-[#6c6a64] border border-[#e6dfd8]">
                  {ticket.roomType.length > 30 ? ticket.roomType.slice(0, 30) + "..." : ticket.roomType}
                </span>
              )}
            </div>
            {others.length > 0 && (
              <p className="text-xs text-[#6c6a64] mt-0.5">+{others.join(", ")}</p>
            )}
          </div>
        </div>
      </div>

      {ticket.phone && (
        <div className="flex items-center gap-1.5 text-xs text-[#6c6a64] mt-3">
          <Phone className="w-3 h-3" /> {ticket.phone}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-3 text-xs text-[#252523]">
        <span>
          <span className="text-[#6c6a64] uppercase text-[10px] tracking-[0.12em] mr-1.5">Check-in</span>
          {fmtDate(ticket.checkIn)}
        </span>
        <span>
          <span className="text-[#6c6a64] uppercase text-[10px] tracking-[0.12em] mr-1.5">Check-out</span>
          {fmtDate(ticket.checkOut)}
        </span>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <StatusBadge status={ticket.status} />
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#efe9de] text-[#6c6a64] border border-[#e6dfd8]">
            {ticket.nights || 0} nights
          </span>
        </div>
        <p className="font-medium text-sm text-[#141413]">{fmtMoney(ticket.rateOffered)}</p>
      </div>
    </div>
  );
}
