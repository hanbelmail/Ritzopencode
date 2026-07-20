"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowUpDown, Check, CheckCircle, CircleDot, Columns3, Eye, Loader2, Pencil, XCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "./StatusBadge";
import { fmtDate, fmtMoney, shortId } from "@/lib/calc";

const columns = [
  { key: "id", label: "Ticket", render: (t) => <span className="font-mono text-xs">{shortId(t.id)}</span> },
  { key: "createdAt", label: "Quote date", render: (t) => (t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-US") : "—") },
  { key: "guests", label: "Guests", sortVal: (t) => (t.guests?.[0] || ""), render: (t) => <span className="font-medium">{(t.guests || []).filter(Boolean).join(", ")}</span> },
  { key: "status", label: "Status", render: (t) => <StatusBadge status={t.status} /> },
  { key: "checkIn", label: "Check-in", render: (t) => fmtDate(t.checkIn) },
  { key: "checkOut", label: "Check-out", render: (t) => fmtDate(t.checkOut) },
  { key: "nights", label: "Nights", render: (t) => t.nights || 0 },
  { key: "retailPrice", label: "Retail", render: (t) => fmtMoney(t.retailPrice) },
  { key: "discountPct", label: "Disc %", render: (t) => (t.discountPct ? `${t.discountPct}%` : "—") },
  { key: "rateOffered", label: "Rate Offered", render: (t) => <span className="font-medium">{fmtMoney(t.rateOffered)}</span> },
  { key: "costPerNight", label: "Per Night", render: (t) => fmtMoney(t.costPerNight) },
  { key: "paymentMethod", label: "Method", render: (t) => t.paymentMethod || "—" },
  { key: "reservationConfirmationNumber", label: "Confirmation #", render: (t) => t.reservationConfirmationNumber || "—" },
  { key: "notes", label: "Notes/special request", render: (t) => <span className="block max-w-64 truncate" title={t.notes || ""}>{t.notes || "—"}</span> },
  { key: "referredBy", label: "Referred By", render: (t) => t.referredBy || "—" },
];

const statusActions = {
  "PRICE SENT": { label: "Mark Price Sent", title: "Mark price sent?", icon: CircleDot },
  "PAYMENT VERIFIED": { label: "Mark Payment Verified", title: "Mark payment verified?", icon: CheckCircle },
  "BOOKING CONFIRMED": { label: "Mark Booking Confirmed", title: "Mark booking confirmed?", icon: CheckCircle },
  CANCELLED: { label: "Cancel Reservation", title: "Cancel this reservation?", icon: XCircle, destructive: true },
};

const quickStatusActions = ["PRICE SENT", "PAYMENT VERIFIED", "BOOKING CONFIRMED", "CANCELLED"];

export const ticketTableColumnKeys = columns.map((column) => column.key);

export default function TicketTable({ tickets, selectedIds, onSelectedIdsChange, visibleColumns = ticketTableColumnKeys, onVisibleColumnsChange, onStatusChange, onTicketUpdate }) {
  const [sort, setSort] = useState({ key: "createdAt", dir: -1 });
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [statusToConfirm, setStatusToConfirm] = useState(null);
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [savingConfirmationNumber, setSavingConfirmationNumber] = useState(false);
  const [confirmationNumberSaved, setConfirmationNumberSaved] = useState(false);
  const dialogTitleRef = useRef(null);
  const selectable = Array.isArray(selectedIds) && typeof onSelectedIdsChange === "function";
  const safeVisibleColumns = useMemo(() => {
    const allowed = new Set(ticketTableColumnKeys);
    const valid = Array.isArray(visibleColumns) ? visibleColumns.filter((key) => allowed.has(key)) : [];
    return valid.length > 0 ? valid : ticketTableColumnKeys;
  }, [visibleColumns]);
  const visibleColumnSet = useMemo(() => new Set(safeVisibleColumns), [safeVisibleColumns]);
  const activeColumns = useMemo(() => columns.filter((column) => visibleColumnSet.has(column.key)), [visibleColumnSet]);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort.key);
    const val = (t) => (col?.sortVal ? col.sortVal(t) : t[sort.key] ?? "");
    return [...tickets].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va === vb) return 0;
      return (va > vb ? 1 : -1) * sort.dir;
    });
  }, [tickets, sort]);

  const selectedTicket = useMemo(() => sorted.find((ticket) => ticket.id === selectedTicketId) || null, [sorted, selectedTicketId]);
  const guests = (selectedTicket?.guests || []).filter(Boolean);
  const primaryGuest = guests[0] || "Unnamed guest";
  const pendingStatusAction = statusToConfirm ? statusActions[statusToConfirm] : null;

  useEffect(() => {
    setConfirmationNumber(selectedTicket?.reservationConfirmationNumber || "");
  }, [selectedTicket?.id, selectedTicket?.reservationConfirmationNumber]);

  useEffect(() => {
    setConfirmationNumberSaved(false);
  }, [selectedTicket?.id]);

  const toggleSort = (key) =>
    setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }));

  const sortedIds = useMemo(() => sorted.map((ticket) => ticket.id), [sorted]);
  const selectedCount = selectable ? sortedIds.filter((id) => selectedIds.includes(id)).length : 0;
  const allSelected = selectable && sortedIds.length > 0 && selectedCount === sortedIds.length;
  const someSelected = selectable && selectedCount > 0 && selectedCount < sortedIds.length;

  const toggleAll = (checked) => {
    if (!selectable) return;
    onSelectedIdsChange((current) => {
      const otherIds = current.filter((id) => !sortedIds.includes(id));
      return checked ? [...otherIds, ...sortedIds] : otherIds;
    });
  };

  const toggleOne = (id, checked) => {
    if (!selectable) return;
    onSelectedIdsChange((current) => (checked ? [...new Set([...current, id])] : current.filter((selectedId) => selectedId !== id)));
  };

  const toggleColumn = (key, checked) => {
    if (!onVisibleColumnsChange) return;

    let next = safeVisibleColumns;
    if (checked) next = [...new Set([...safeVisibleColumns, key])];
    else if (safeVisibleColumns.length > 1) next = safeVisibleColumns.filter((columnKey) => columnKey !== key);

    if (next !== safeVisibleColumns) onVisibleColumnsChange(next);
  };

  const closeTicketDialog = () => {
    setSelectedTicketId(null);
    setStatusToConfirm(null);
  };

  const openStatusDialog = (status) => {
    if (!selectedTicket || typeof onStatusChange !== "function") return;
    setStatusToConfirm(status);
  };

  const confirmStatusChange = () => {
    if (!selectedTicket || !statusToConfirm || typeof onStatusChange !== "function") return;
    onStatusChange(selectedTicket.id, statusToConfirm);
    closeTicketDialog();
  };

  const saveConfirmationNumber = async () => {
    if (!selectedTicket || typeof onTicketUpdate !== "function") return;
    setSavingConfirmationNumber(true);
    setConfirmationNumberSaved(false);
    try {
      await onTicketUpdate(selectedTicket.id, { reservationConfirmationNumber: confirmationNumber.trim() });
      setConfirmationNumberSaved(true);
    } finally {
      setSavingConfirmationNumber(false);
    }
  };

  return (
    <div className="rounded-[12px] border border-[#e6dfd8] bg-[#faf9f5]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6dfd8] px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8e8b82]">Table view</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#efe9de] hover:bg-[#efe9de]">
              {selectable && (
                <TableHead className="w-12 text-[#6c6a64]">
                  <Checkbox
                    aria-label="Select all reservations"
                    checked={allSelected || (someSelected && "indeterminate")}
                    onCheckedChange={(checked) => toggleAll(checked === true)}
                    className="border-[#8e8b82] data-[state=checked]:border-[#cc785c] data-[state=checked]:bg-[#cc785c]"
                  />
                </TableHead>
              )}
              {activeColumns.map((c) => (
                <TableHead key={c.key} className="whitespace-nowrap text-[#6c6a64]">
                  <button className="flex items-center gap-1 text-xs font-medium" onClick={() => toggleSort(c.key)}>
                    {c.label}
                    <ArrowUpDown className="w-3 h-3 text-[#8e8b82]" />
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((t) => (
              <TableRow key={t.id} className="cursor-pointer border-[#e6dfd8] hover:bg-[#f5f0e8]" onClick={() => setSelectedTicketId(t.id)}>
                {selectable && (
                  <TableCell className="w-12" onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      aria-label={`Select reservation ${t.id}`}
                      checked={selectedIds.includes(t.id)}
                      onCheckedChange={(checked) => toggleOne(t.id, checked === true)}
                      className="border-[#8e8b82] data-[state=checked]:border-[#cc785c] data-[state=checked]:bg-[#cc785c]"
                    />
                  </TableCell>
                )}
                {activeColumns.map((c) => (
                  <TableCell key={c.key} className="whitespace-nowrap text-sm text-[#252523]">{c.render(t)}</TableCell>
                ))}
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={activeColumns.length + (selectable ? 1 : 0)} className="text-center text-[#6c6a64] py-8 text-sm">
                  No reservations found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end border-t border-[#e6dfd8] px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="h-9 rounded-[8px] border-[#d8d0c7] bg-[#fffdf8] text-xs text-[#252523] hover:bg-[#efe9de]">
              <Columns3 className="mr-2 h-4 w-4" /> Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[360px] w-56 overflow-y-auto rounded-[12px] border-[#e6dfd8] bg-[#faf9f5] p-1 text-[#141413]">
            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={visibleColumnSet.has(column.key)}
                disabled={safeVisibleColumns.length === 1 && visibleColumnSet.has(column.key)}
                onCheckedChange={(checked) => toggleColumn(column.key, checked === true)}
                onSelect={(event) => event.preventDefault()}
                className="rounded-[8px] focus:bg-[#efe9de]"
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Dialog open={Boolean(selectedTicket)} onOpenChange={(open) => { if (!open && !statusToConfirm) closeTicketDialog(); }}>
        <DialogContent
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            dialogTitleRef.current?.focus();
          }}
          className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-lg overflow-hidden rounded-[18px] border-[#e6dfd8] bg-[#fffdf8] p-0 text-[#141413] shadow-2xl sm:w-full"
        >
          {selectedTicket && (
            <>
              <div className="border-b border-[#efe9de] px-5 py-5 pr-12 sm:px-6 sm:pr-12">
                <DialogHeader className="space-y-2 text-left">
                  <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:justify-between">
                    <div className="min-w-0">
                      <DialogTitle ref={dialogTitleRef} tabIndex={-1} className="truncate text-xl font-semibold tracking-[-0.02em] outline-none">{primaryGuest}</DialogTitle>
                      <DialogDescription className="mt-1 font-mono text-xs text-[#6c6a64]">
                        Ticket {shortId(selectedTicket.id)}
                      </DialogDescription>
                    </div>
                    <div className="max-w-full shrink-0 overflow-hidden">
                      <StatusBadge status={selectedTicket.status} />
                    </div>
                  </div>
                </DialogHeader>
              </div>
              <div className="max-h-[calc(100dvh-9rem)] space-y-4 overflow-y-auto overflow-x-hidden px-5 py-5 sm:px-6">
                <div className="grid min-w-0 gap-3 rounded-[12px] border border-[#efe9de] bg-[#faf9f5] p-3 text-sm text-[#252523] sm:grid-cols-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#8e8b82]">Check-in</p>
                    <p className="mt-1 font-medium">{fmtDate(selectedTicket.checkIn)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#8e8b82]">Check-out</p>
                    <p className="mt-1 font-medium">{fmtDate(selectedTicket.checkOut)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#8e8b82]">Rate Offered</p>
                    <p className="mt-1 font-medium">{fmtMoney(selectedTicket.rateOffered)}</p>
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
                        disabled={savingConfirmationNumber || typeof onTicketUpdate !== "function"}
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
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button asChild variant="outline" className="h-11 w-full min-w-0 justify-start rounded-[10px] border-[#d8d0c7] bg-[#faf9f5] text-[#252523] hover:bg-[#efe9de]">
                    <Link href={`/ticket/${selectedTicket.id}`}>
                      <Eye className="mr-2 h-4 w-4" /> View Details
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 w-full min-w-0 justify-start rounded-[10px] border-[#d8d0c7] bg-[#faf9f5] text-[#252523] hover:bg-[#efe9de]">
                    <Link href={`/new?id=${selectedTicket.id}`}>
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
                {statusToConfirm === "PRICE SENT" && selectedTicket && !selectedTicket.retailPriceScreenshotKey && (
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
    </div>
  );
}
