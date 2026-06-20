"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, Phone, MoreHorizontal, Pencil, Trash2, Eye, CheckCircle, CircleDot, XCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import StatusBadge from "./StatusBadge";
import { fmtDate, fmtMoney } from "@/lib/calc";

export default function TicketCard({ ticket, onDelete, onStatusChange }) {
  const router = useRouter();
  const guests = (ticket.guests || []).filter(Boolean);
  const [primary, ...others] = guests;

  return (
    <div
      className="rounded-[12px] border border-[#e6dfd8] bg-[#faf9f5] p-5 transition-shadow hover:shadow-[0_1px_3px_rgba(20,20,19,0.08)] cursor-pointer"
      onClick={() => router.push(`/ticket/${ticket.id}`)}
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
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-[#efe9de]">
                <MoreHorizontal className="w-4 h-4 text-[#6c6a64]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-[12px] border-[#e6dfd8] bg-[#faf9f5] text-[#141413]">
              <DropdownMenuItem asChild>
                <Link href={`/ticket/${ticket.id}`}><Eye className="w-4 h-4 mr-2" />View Details</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/new?id=${ticket.id}`}><Pencil className="w-4 h-4 mr-2" />Edit</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onStatusChange(ticket.id, "CONFIRMED")}>
                <CheckCircle className="w-4 h-4 mr-2" />Mark Confirmed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(ticket.id, "PENDING")}>
                <CircleDot className="w-4 h-4 mr-2" />Mark Pending
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onStatusChange(ticket.id, "CANCELLED")}>
                <XCircle className="w-4 h-4 mr-2" />Cancel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(ticket.id)}>
                <Trash2 className="w-4 h-4 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
