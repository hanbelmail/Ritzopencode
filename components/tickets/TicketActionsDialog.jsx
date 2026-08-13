"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle, CircleDot, Eye, Loader2, Pencil, XCircle } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fmtDate, fmtMoney, shortId } from "@/lib/calc";
import StatusBadge from "./StatusBadge";

const statusActions = {
  "PRICE SENT": { label: "Mark Price Sent", title: "Mark price sent?", icon: CircleDot },
  "PAYMENT VERIFIED": { label: "Mark Payment Verified", title: "Mark payment verified?", icon: CheckCircle },
  "BOOKING CONFIRMED": { label: "Mark Booking Confirmed", title: "Mark booking confirmed?", icon: CheckCircle },
  CANCELLED: { label: "Cancel Reservation", title: "Cancel this reservation?", icon: XCircle, destructive: true },
};

const quickStatusActions = ["PRICE SENT", "PAYMENT VERIFIED", "BOOKING CONFIRMED", "CANCELLED"];

export default function TicketActionsDialog({ ticket, onOpenChange, onStatusChange, onTicketUpdate }) {
  const [statusToConfirm, setStatusToConfirm] = useState(null);
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [savingConfirmationNumber, setSavingConfirmationNumber] = useState(false);
  const [confirmationNumberSaved, setConfirmationNumberSaved] = useState(false);
  const dialogTitleRef = useRef(null);
  const guests = (ticket?.guests || []).filter(Boolean);
  const primaryGuest = guests[0] || "Unnamed guest";
  const pendingStatusAction = statusToConfirm ? statusActions[statusToConfirm] : null;
  const persistedConfirmationNumber = String(ticket?.reservationConfirmationNumber || "").trim();
  const confirmationNumberIsSaved = confirmationNumberSaved || (Boolean(persistedConfirmationNumber) && confirmationNumber.trim() === persistedConfirmationNumber);

  useEffect(() => {
    setConfirmationNumber(ticket?.reservationConfirmationNumber || "");
  }, [ticket?.id, ticket?.reservationConfirmationNumber]);

  useEffect(() => {
    setConfirmationNumberSaved(false);
  }, [ticket?.id]);

  const closeTicketDialog = () => {
    setStatusToConfirm(null);
    onOpenChange(false);
  };

  const openStatusDialog = (status) => {
    if (!ticket || typeof onStatusChange !== "function") return;
    setStatusToConfirm(status);
  };

  const confirmStatusChange = () => {
    if (!ticket || !statusToConfirm || typeof onStatusChange !== "function") return;
    if (statusToConfirm === "BOOKING CONFIRMED" && !confirmationNumberIsSaved) return;
    onStatusChange(ticket.id, statusToConfirm);
    closeTicketDialog();
  };

  const saveConfirmationNumber = async () => {
    if (!ticket || typeof onTicketUpdate !== "function") return;
    setSavingConfirmationNumber(true);
    setConfirmationNumberSaved(false);
    try {
      const normalizedConfirmationNumber = confirmationNumber.trim();
      await onTicketUpdate(ticket.id, { reservationConfirmationNumber: normalizedConfirmationNumber });
      setConfirmationNumberSaved(Boolean(normalizedConfirmationNumber));
    } finally {
      setSavingConfirmationNumber(false);
    }
  };

  return (
    <>
      <Dialog open={Boolean(ticket)} onOpenChange={(open) => { if (!open && !statusToConfirm) closeTicketDialog(); }}>
        <DialogContent
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            dialogTitleRef.current?.focus();
          }}
          className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-lg overflow-hidden rounded-[18px] border-[#e6dfd8] bg-[#fffdf8] p-0 text-[#141413] shadow-2xl sm:w-full"
        >
          {ticket && (
            <>
              <div className="border-b border-[#efe9de] px-5 py-5 pr-12 sm:px-6 sm:pr-12">
                <DialogHeader className="space-y-2 text-left">
                  <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:justify-between">
                    <div className="min-w-0">
                      <DialogTitle ref={dialogTitleRef} tabIndex={-1} className="truncate text-xl font-semibold tracking-[-0.02em] outline-none">{primaryGuest}</DialogTitle>
                      <DialogDescription className="mt-1 font-mono text-xs text-[#6c6a64]">
                        Ticket {shortId(ticket.id)}
                      </DialogDescription>
                    </div>
                    <div className="max-w-full shrink-0 overflow-hidden">
                      <StatusBadge status={ticket.status} />
                    </div>
                  </div>
                </DialogHeader>
              </div>
              <div className="max-h-[calc(100dvh-9rem)] space-y-4 overflow-y-auto overflow-x-hidden px-5 py-5 sm:px-6">
                <div className="grid min-w-0 gap-3 rounded-[12px] border border-[#efe9de] bg-[#faf9f5] p-3 text-sm text-[#252523] sm:grid-cols-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#8e8b82]">Check-in</p>
                    <p className="mt-1 font-medium">{fmtDate(ticket.checkIn)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#8e8b82]">Check-out</p>
                    <p className="mt-1 font-medium">{fmtDate(ticket.checkOut)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#8e8b82]">Rate Offered</p>
                    <p className="mt-1 font-medium">{fmtMoney(ticket.rateOffered)}</p>
                  </div>
                  <div className="min-w-0 sm:col-span-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#8e8b82]">Reservation confirmation number</p>
                    <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        value={confirmationNumber}
                        onChange={(event) => {
                          setConfirmationNumber(event.target.value);
                          setConfirmationNumberSaved(false);
                        }}
                        placeholder="Enter confirmation number"
                        className="h-9 bg-white"
                        onClick={(event) => event.stopPropagation()}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={saveConfirmationNumber}
                        disabled={savingConfirmationNumber || typeof onTicketUpdate !== "function" || (ticket.status === "BOOKING CONFIRMED" && !confirmationNumber.trim())}
                        className={`h-9 min-w-[92px] shrink-0 rounded-[8px] px-4 text-white transition-all duration-200 ${confirmationNumberSaved ? "bg-emerald-600 hover:bg-emerald-600" : "bg-[#25211d] hover:bg-[#3a3028]"}`}
                      >
                        <span key={savingConfirmationNumber ? "saving" : confirmationNumberSaved ? "saved" : "save"} className="inline-flex animate-in items-center gap-1.5 fade-in zoom-in-95 duration-200" aria-live="polite">
                          {savingConfirmationNumber ? (
                            <><Loader2 className="animate-spin" /> Saving</>
                          ) : confirmationNumberSaved ? (
                            <><Check /> Saved</>
                          ) : (
                            "Save"
                          )}
                        </span>
                      </Button>
                    </div>
                    {!confirmationNumberIsSaved && (
                      <p className="mt-2 text-xs text-amber-700">Save a confirmation number before marking this booking confirmed.</p>
                    )}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button asChild variant="outline" className="h-11 w-full min-w-0 justify-start rounded-[10px] border-[#d8d0c7] bg-[#faf9f5] text-[#252523] hover:bg-[#efe9de]">
                    <Link href={`/ticket/${ticket.id}`}>
                      <Eye className="mr-2 h-4 w-4" /> View Details
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 w-full min-w-0 justify-start rounded-[10px] border-[#d8d0c7] bg-[#faf9f5] text-[#252523] hover:bg-[#efe9de]">
                    <Link href={`/new?id=${ticket.id}`}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Link>
                  </Button>
                </div>
                <div className="min-w-0 rounded-[12px] border border-[#efe9de] bg-[#faf9f5] p-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-[#8e8b82]">Quick actions</p>
                  <div className="grid gap-2">
                    {quickStatusActions.map((status) => {
                      const action = statusActions[status];
                      const Icon = action.icon;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => openStatusDialog(status)}
                          disabled={typeof onStatusChange !== "function"}
                          className={`flex min-h-11 w-full items-center gap-3 rounded-[10px] border px-3 py-2 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${action.destructive ? "border-[#e4b5a7] bg-[#fff7f4] text-[#a9583e] hover:bg-[#f7e4dd]" : "border-[#e6dfd8] bg-[#fffdf8] text-[#252523] hover:bg-[#efe9de]"}`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1">{action.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={Boolean(statusToConfirm)} onOpenChange={(open) => { if (!open) setStatusToConfirm(null); }}>
        <AlertDialogContent className="w-[calc(100vw-1rem)] max-w-md rounded-[18px] border-[#e6dfd8] bg-[#fffdf8] p-0 text-[#141413] shadow-2xl sm:w-full">
          <div className="border-b border-[#efe9de] px-6 py-5">
            <AlertDialogHeader className="space-y-2 text-left">
              <AlertDialogTitle className="text-xl font-semibold tracking-[-0.02em]">{pendingStatusAction?.title}</AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-6 text-[#6c6a64]">
                This will update {primaryGuest} to <span className="font-medium text-[#252523]">{statusToConfirm}</span>.
                {statusToConfirm === "PRICE SENT" && ticket && !ticket.retailPriceScreenshotKey && (
                  <span className="mt-2 block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                    No retail price screenshot is attached. The PRICE SENT email will send without that attachment unless you edit the reservation first.
                  </span>
                )}
                {statusToConfirm === "BOOKING CONFIRMED" && !confirmationNumberIsSaved && (
                  <span className="mt-2 block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                    Save the reservation confirmation number first, then mark the booking confirmed.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter className="gap-2 px-6 py-4 sm:space-x-0">
            <AlertDialogCancel className="mt-0 rounded-[8px] border-[#d8d0c7] bg-[#faf9f5] text-[#252523] hover:bg-[#efe9de]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction disabled={statusToConfirm === "BOOKING CONFIRMED" && !confirmationNumberIsSaved} onClick={confirmStatusChange} className={`rounded-[8px] text-white ${statusToConfirm === "CANCELLED" ? "bg-[#b84f34] hover:bg-[#963f2a]" : "bg-[#cc785c] hover:bg-[#a9583e]"}`}>
              {pendingStatusAction?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
