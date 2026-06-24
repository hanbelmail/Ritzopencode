"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, Phone, MoreHorizontal, Pencil, Trash2, Eye, CheckCircle, CircleDot, XCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

const statusActions = {
  "PAYMENT VERIFIED": { label: "Mark Payment Verified", title: "Mark payment verified?" },
  "PRICE SENT": { label: "Mark Price Sent", title: "Mark price sent?" },
  "BOOKING CONFIRMED": { label: "Mark Booking Confirmed", title: "Mark booking confirmed?" },
  CANCELLED: { label: "Cancel", title: "Cancel this reservation?" },
};

export default function TicketCard({ ticket, onDelete, onStatusChange }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusToConfirm, setStatusToConfirm] = useState(null);
  const guests = (ticket.guests || []).filter(Boolean);
  const [primary, ...others] = guests;
  const pendingStatusAction = statusToConfirm ? statusActions[statusToConfirm] : null;

  const confirmStatusChange = () => {
    if (!statusToConfirm) return;
    onStatusChange(ticket.id, statusToConfirm);
    setStatusToConfirm(null);
  };

  const openStatusDialog = (status) => {
    setMenuOpen(false);
    setStatusToConfirm(status);
  };

  const openDeleteDialog = () => {
    setMenuOpen(false);
    setDeleteOpen(true);
  };

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
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
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
              <DropdownMenuItem onSelect={(event) => { event.preventDefault(); openStatusDialog("PAYMENT VERIFIED"); }}>
                <CheckCircle className="w-4 h-4 mr-2" />Mark Payment Verified
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(event) => { event.preventDefault(); openStatusDialog("PRICE SENT"); }}>
                <CircleDot className="w-4 h-4 mr-2" />Mark Price Sent
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(event) => { event.preventDefault(); openStatusDialog("BOOKING CONFIRMED"); }}>
                <CheckCircle className="w-4 h-4 mr-2" />Mark Booking Confirmed
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onSelect={(event) => { event.preventDefault(); openStatusDialog("CANCELLED"); }}>
                <XCircle className="w-4 h-4 mr-2" />Cancel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onSelect={(event) => { event.preventDefault(); openDeleteDialog(); }}>
                <Trash2 className="w-4 h-4 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialog open={Boolean(statusToConfirm)} onOpenChange={(open) => { if (!open) setStatusToConfirm(null); }}>
            <AlertDialogContent className="max-w-md rounded-[18px] border-[#e6dfd8] bg-[#fffdf8] p-0 text-[#141413] shadow-2xl">
              <div className="border-b border-[#efe9de] px-6 py-5">
                <AlertDialogHeader className="space-y-2 text-left">
                  <AlertDialogTitle className="text-xl font-semibold tracking-[-0.02em]">{pendingStatusAction?.title}</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm leading-6 text-[#6c6a64]">
                    This will update {primary || "this reservation"} to <span className="font-medium text-[#252523]">{statusToConfirm}</span>.
                    {statusToConfirm === "PRICE SENT" && !ticket.retailPriceScreenshotKey && (
                      <span className="mt-2 block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                        No retail price screenshot is attached. The PRICE SENT email will send without that attachment unless you edit the reservation first.
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
              </div>
              <AlertDialogFooter className="gap-2 px-6 py-4 sm:space-x-0">
                <AlertDialogCancel className="mt-0 rounded-[8px] border-[#d8d0c7] bg-[#faf9f5] text-[#252523] hover:bg-[#efe9de]">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={confirmStatusChange} className={`rounded-[8px] text-white ${statusToConfirm === "CANCELLED" ? "bg-[#b84f34] hover:bg-[#963f2a]" : "bg-[#cc785c] hover:bg-[#a9583e]"}`}>
                  {pendingStatusAction?.label}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent className="max-w-md rounded-[18px] border-[#e6dfd8] bg-[#fffdf8] p-0 text-[#141413] shadow-2xl">
              <div className="border-b border-[#efe9de] px-6 py-5">
                <AlertDialogHeader className="space-y-2 text-left">
                  <AlertDialogTitle className="text-xl font-semibold tracking-[-0.02em]">Delete this reservation?</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm leading-6 text-[#6c6a64]">
                    This will permanently delete {primary || "this reservation"}. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
              </div>
              <AlertDialogFooter className="gap-2 px-6 py-4 sm:space-x-0">
                <AlertDialogCancel className="mt-0 rounded-[8px] border-[#d8d0c7] bg-[#faf9f5] text-[#252523] hover:bg-[#efe9de]">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(ticket.id)} className="rounded-[8px] bg-[#b84f34] text-white hover:bg-[#963f2a]">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
