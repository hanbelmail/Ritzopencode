"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BadgeCheck, BadgeDollarSign, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, CreditCard, Download, Filter, Search, Plus, ListTodo, Table2, Trash2, XCircle } from "lucide-react";
import TicketCard from "@/components/tickets/TicketCard";
import TicketTable, { ticketTableColumnKeys } from "@/components/tickets/TicketTable";
import {
  DASHBOARD_DATE_FIELD_OPTIONS,
  DASHBOARD_PAGE_SIZE_OPTIONS,
  STATUSES,
  useDashboardPreferenceActions,
  useDashboardPreferences,
  useTicketActions,
  useTicketPage,
} from "@/lib/store";
import { isE164Phone } from "@/lib/phone";
import { getPriceSentNotificationFeedback, notifyPriceSent } from "@/lib/price-sent-email";
import { notifyPaymentSubmitted } from "@/lib/payment-submitted-alert";
import { notifyBookingRequestHotel } from "@/lib/booking-request-hotel-alert";
import { notifyBookingConfirmedHotel } from "@/lib/booking-confirmed-hotel-alert";
import { useToast } from "@/components/ui/use-toast";
import { readDashboardTableColumns, saveDashboardTableColumns } from "@/lib/ui-preferences";

const primaryButton = "h-10 rounded-[8px] bg-[#cc785c] px-5 text-sm font-medium text-white shadow-none hover:bg-[#a9583e]";
const darkInput = "h-10 rounded-[8px] border-[#252320] bg-[#1f1e1b] text-[#faf9f5] shadow-none placeholder:text-[#b8b3aa] focus-visible:ring-[#cc785c] [color-scheme:dark]";
const activeInput = "border-[#cc785c] bg-[#2a211d]";
const statusIcons = {
  "QUOTE REQUESTED": Clock,
  "PRICE SENT": BadgeDollarSign,
  "PAYMENT SUBMITTED": CreditCard,
  "PAYMENT VERIFIED": CheckCircle2,
  "BOOKING CONFIRMED": BadgeCheck,
  CANCELLED: XCircle,
};

const csvColumns = [
  { key: "id", label: "Ticket ID" },
  { key: "createdAt", label: "Quote Date", value: (t) => dateStamp(t.createdAt) },
  { key: "guests", label: "Guests", value: (t) => (t.guests || []).filter(Boolean).join(", ") },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "status", label: "Status" },
  { key: "checkIn", label: "Check-in", value: (t) => dateStamp(t.checkIn) },
  { key: "checkOut", label: "Check-out", value: (t) => dateStamp(t.checkOut) },
  { key: "nights", label: "Nights" },
  { key: "roomType", label: "Room Type" },
  { key: "retailPrice", label: "Retail Price" },
  { key: "discountPct", label: "Discount %" },
  { key: "rateOffered", label: "Rate Offered" },
  { key: "costPerNight", label: "Cost Per Night" },
  { key: "paymentMethod", label: "Payment Method" },
  { key: "reservationConfirmationNumber", label: "Reservation Confirmation Number" },
  { key: "notes", label: "Notes" },
  { key: "referredBy", label: "Referred By" },
];

function dateStamp(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const match = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function StatusIcon({ status, className = "h-4 w-4" }) {
  const Icon = statusIcons[status] || Clock;
  return <Icon className={className} />;
}

function formatStatusLabel(status) {
  return status.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function uniqueSortedTickets(groups) {
  const byId = new Map();
  groups.flat().forEach((ticket) => {
    if (ticket?.id) byId.set(ticket.id, ticket);
  });

  return Array.from(byId.values()).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

export default function Dashboard() {
  const convex = useConvex();
  const { deleteTicket, updateTicket } = useTicketActions();
  const { toast } = useToast();
  const savedDashboardPreferences = useDashboardPreferences(ticketTableColumnKeys);
  const { saveDashboardPreferences } = useDashboardPreferenceActions(ticketTableColumnKeys);
  const preferencesLoadedRef = useRef(false);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [view, setView] = useState("table");
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [dateFilter, setDateFilter] = useState({ field: "checkIn", from: "", to: "" });
  const [visibleColumns, setVisibleColumns] = useState(() => readDashboardTableColumns(ticketTableColumnKeys));
  const [selectedIds, setSelectedIds] = useState([]);
  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCursors, setPageCursors] = useState([null]);
  const [exporting, setExporting] = useState(false);
  const [statusCounts, setStatusCounts] = useState({});
  const [multiStatusTickets, setMultiStatusTickets] = useState([]);
  const [loadingMultiStatus, setLoadingMultiStatus] = useState(false);

  const cursor = pageCursors[pageIndex] || null;
  const isMultiStatusFilter = selectedStatuses.length > 1;
  const serverStatusFilter = selectedStatuses.length === 1 ? selectedStatuses[0] : "all";
  const pageResult = useTicketPage({ search, status: serverStatusFilter, dateFilter, pageSize, cursor });
  const pageTickets = isMultiStatusFilter
    ? multiStatusTickets.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)
    : pageResult?.page || [];
  const isLoadingPage = isMultiStatusFilter ? loadingMultiStatus : pageResult === undefined;

  const hasDateFilter = Boolean(dateFilter.from || dateFilter.to);
  const selectedDateField = DASHBOARD_DATE_FIELD_OPTIONS.find((option) => option.value === dateFilter.field)?.label || "Date";
  const allStatusCount = STATUSES.reduce((total, status) => total + (statusCounts[status] || 0), 0);
  const statusFilterLabel = selectedStatuses.length === 0
    ? "All statuses"
    : selectedStatuses.length === 1
      ? formatStatusLabel(selectedStatuses[0])
      : `${selectedStatuses.length} statuses`;

  const updateDateFilter = (key, value) => {
    setDateFilter((current) => ({ ...current, [key]: value }));
  };

  const clearDateFilters = () => {
    setDateFilter((current) => ({ ...current, from: "", to: "" }));
  };

  const resetPagination = () => {
    setPageIndex(0);
    setPageCursors([null]);
    setSelectedIds([]);
  };

  const pageStart = pageTickets.length ? pageIndex * pageSize + 1 : 0;
  const pageEnd = pageTickets.length ? pageIndex * pageSize + pageTickets.length : 0;
  const hasPreviousPage = pageIndex > 0;
  const hasNextPage = isMultiStatusFilter
    ? pageIndex * pageSize + pageTickets.length < multiStatusTickets.length
    : Boolean(pageResult && !pageResult.isDone);

  const exportFilters = {
    search: search.trim() || undefined,
    status: selectedStatuses.length === 1 ? selectedStatuses[0] : undefined,
    dateField: dateFilter.field,
    from: dateFilter.from || undefined,
    to: dateFilter.to || undefined,
  };
  const statusCountFilters = useMemo(() => ({
    search: search.trim() || undefined,
    dateField: dateFilter.field,
    from: dateFilter.from || undefined,
    to: dateFilter.to || undefined,
  }), [search, dateFilter]);

  const toggleStatusFilter = (status) => {
    setSelectedStatuses((current) => (
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status]
    ));
  };

  const fetchTicketsForStatuses = async (statuses) => {
    if (!statuses.length) {
      return convex.query(api.tickets.listFilteredForExport, statusCountFilters);
    }

    const groups = await Promise.all(
      statuses.map((status) => convex.query(api.tickets.listFilteredForExport, { ...statusCountFilters, status }))
    );
    return uniqueSortedTickets(groups);
  };

  const goToNextPage = () => {
    if (isMultiStatusFilter) {
      if (!hasNextPage) return;
      setPageIndex((current) => current + 1);
      setSelectedIds([]);
      return;
    }

    if (!pageResult || pageResult.isDone) return;
    setPageCursors((current) => {
      const next = current.slice(0, pageIndex + 2);
      next[pageIndex + 1] = pageResult.continueCursor;
      return next;
    });
    setPageIndex((current) => current + 1);
    setSelectedIds([]);
  };

  const goToPreviousPage = () => {
    if (!hasPreviousPage) return;
    setPageIndex((current) => current - 1);
    setSelectedIds([]);
  };

  const paginationControls = (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#e6dfd8] bg-[#fffdf8] px-4 py-3 text-sm text-[#6c6a64]">
      <div className="flex flex-wrap items-center gap-2">
        <span>
          {isLoadingPage ? "Loading reservations" : pageTickets.length ? `Showing ${pageStart}-${pageEnd}` : "No reservations to show"}
        </span>
        <span className="text-[#aaa399]">Page {pageIndex + 1}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
          <SelectTrigger className="h-9 w-28 rounded-[8px] border-[#d8d0c7] bg-[#faf9f5] text-[#252523] shadow-none focus:ring-[#cc785c]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-[12px] border-[#e6dfd8] bg-[#faf9f5] text-[#141413]">
            {DASHBOARD_PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={goToPreviousPage} disabled={!hasPreviousPage || isLoadingPage} className="h-9 rounded-[8px] border-[#d8d0c7] bg-[#faf9f5] text-[#252523] hover:bg-[#efe9de]">
          <ChevronLeft className="mr-1 h-4 w-4" /> Previous
        </Button>
        <Button type="button" variant="outline" onClick={goToNextPage} disabled={!hasNextPage || isLoadingPage} className="h-9 rounded-[8px] border-[#d8d0c7] bg-[#faf9f5] text-[#252523] hover:bg-[#efe9de]">
          Next <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const handleDelete = async (id) => {
    await deleteTicket(id);
  };

  const handleStatusChange = async (id, status) => {
    if (status === "PRICE SENT") {
      const ticket = pageTickets.find((item) => item.id === id);
      if (!ticket?.phone || !isE164Phone(ticket.phone)) {
        toast({
          title: "Guest phone number required",
          description: "Edit this reservation and enter an E.164 phone number, for example +18085551234, before sending the price.",
          variant: "destructive",
        });
        return;
      }
    }

    await updateTicket(id, { status });
    if (status === "PRICE SENT") {
      try {
        const result = await notifyPriceSent(id);
        toast(getPriceSentNotificationFeedback(result));
      } catch (error) {
        toast({
          title: "Price notifications failed",
          description: error.message || "The reservation was updated, but price notifications were not sent.",
          variant: "destructive",
        });
      }
    }

    if (status === "PAYMENT SUBMITTED") {
      try {
        const result = await notifyPaymentSubmitted(id);
        toast({
          title: result.sent ? "Payment alert sent" : "Payment alert skipped",
          description: result.sent ? "Active staff recipients received the payment proof alert." : result.reason,
          variant: result.sent ? "success" : "destructive",
        });
      } catch (error) {
        toast({
          title: "Payment alert failed",
          description: error.message || "The reservation was updated, but the staff alert was not sent.",
          variant: "destructive",
        });
      }
    }

    if (status === "PAYMENT VERIFIED") {
      try {
        const result = await notifyBookingRequestHotel(id);
        toast({
          title: result.sent ? "Booking request sent" : "Booking request skipped",
          description: result.sent ? "Active hotel inboxes received the booking request." : result.reason,
          variant: result.sent ? "success" : "destructive",
        });
      } catch (error) {
        toast({
          title: "Booking request failed",
          description: error.message || "The reservation was updated, but the hotel alert was not sent.",
          variant: "destructive",
        });
      }
    }

    if (status === "BOOKING CONFIRMED") {
      try {
        const result = await notifyBookingConfirmedHotel(id);
        toast({
          title: result.sent ? "Booking confirmation sent" : "Booking confirmation skipped",
          description: result.sent ? "Active hotel inboxes received the booking confirmation." : result.reason,
          variant: result.sent ? "success" : "destructive",
        });
      } catch (error) {
        toast({
          title: "Booking confirmation failed",
          description: error.message || "The reservation was updated, but the hotel alert was not sent.",
          variant: "destructive",
        });
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    await Promise.all(selectedIds.map((id) => deleteTicket(id)));
    setSelectedIds([]);
  };

  const exportFilteredCsv = async () => {
    setExporting(true);
    let exportTickets = [];
    try {
      exportTickets = isMultiStatusFilter
        ? await fetchTicketsForStatuses(selectedStatuses)
        : await convex.query(api.tickets.listFilteredForExport, exportFilters);
    } finally {
      setExporting(false);
    }

    const header = csvColumns.map((column) => csvCell(column.label)).join(",");
    const rows = exportTickets.map((ticket) =>
      csvColumns
        .map((column) => csvCell(column.value ? column.value(ticket) : ticket[column.key]))
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reservations-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const filterKey = useMemo(
    () => JSON.stringify({ search: search.trim(), selectedStatuses, dateFilter, pageSize }),
    [search, selectedStatuses, dateFilter, pageSize]
  );
  const dashboardPreferenceSnapshot = useMemo(
    () => ({ view, search, selectedStatuses, dateFilter, pageSize, visibleColumns }),
    [view, search, selectedStatuses, dateFilter, pageSize, visibleColumns]
  );
  const statusCountKey = useMemo(
    () => JSON.stringify(statusCountFilters),
    [statusCountFilters]
  );

  useEffect(() => {
    if (savedDashboardPreferences === undefined || preferencesLoadedRef.current) return;

    if (savedDashboardPreferences) {
      setView(savedDashboardPreferences.view);
      setSearch(savedDashboardPreferences.search);
      setSelectedStatuses(savedDashboardPreferences.selectedStatuses);
      setDateFilter(savedDashboardPreferences.dateFilter);
      setPageSize(savedDashboardPreferences.pageSize);
      setVisibleColumns(savedDashboardPreferences.visibleColumns);
    }

    preferencesLoadedRef.current = true;
    setPreferencesReady(true);
  }, [savedDashboardPreferences]);

  useEffect(() => {
    if (!preferencesReady) return;

    const timeout = setTimeout(() => {
      saveDashboardTableColumns(dashboardPreferenceSnapshot.visibleColumns);
      saveDashboardPreferences(dashboardPreferenceSnapshot).catch(() => {
        // Keep dashboard controls responsive if preference persistence is temporarily unavailable.
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [dashboardPreferenceSnapshot, preferencesReady, saveDashboardPreferences]);

  useEffect(resetPagination, [filterKey]);

  useEffect(() => {
    let cancelled = false;

    Promise.all(
      STATUSES.map((status) => convex.query(api.tickets.listFilteredForExport, { ...statusCountFilters, status }))
    )
      .then((groups) => {
        if (cancelled) return;
        setStatusCounts(
          groups.reduce((counts, tickets, index) => {
            counts[STATUSES[index]] = tickets.length;
            return counts;
          }, {})
        );
      })
      .catch(() => {
        if (!cancelled) setStatusCounts({});
      });

    return () => {
      cancelled = true;
    };
  }, [convex, statusCountFilters, statusCountKey]);

  useEffect(() => {
    if (!isMultiStatusFilter) {
      setMultiStatusTickets([]);
      setLoadingMultiStatus(false);
      return;
    }

    let cancelled = false;
    setLoadingMultiStatus(true);

    fetchTicketsForStatuses(selectedStatuses)
      .then((tickets) => {
        if (!cancelled) setMultiStatusTickets(tickets);
      })
      .catch(() => {
        if (!cancelled) setMultiStatusTickets([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingMultiStatus(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isMultiStatusFilter, selectedStatuses, statusCountKey]);

  useEffect(() => {
    const filteredIds = new Set(pageTickets.map((ticket) => ticket.id));
    setSelectedIds((current) => {
      const next = current.filter((id) => filteredIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [pageTickets]);

  return (
    <div className="min-h-screen bg-[#faf9f5] px-5 py-8 text-[#141413] md:px-8 lg:px-10">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <div className="rounded-[16px] bg-[#181715] p-6 text-[#faf9f5] md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-[#a09d96]">Staff workspace</p>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.04em] md:text-5xl">Reservations</h1>
              <p className="mt-4 text-sm leading-[1.65] text-[#a09d96]">Manage every quote, payment, stay date, and guest record.</p>
            </div>
            <Button asChild className={primaryButton}>
              <Link href="/new"><Plus className="w-4 h-4 mr-1" /> Add Reservation</Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-xl flex-1 flex-col gap-3 sm:flex-row">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8e8b82]" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reservations" className={`${darkInput} pl-9`} />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className={`h-10 w-full justify-start rounded-[8px] border-[#252320] bg-[#1f1e1b] px-3 text-[#faf9f5] shadow-none hover:bg-[#252320] hover:text-[#faf9f5] sm:w-auto ${selectedStatuses.length ? "border-[#cc785c] bg-[#2a211d]" : ""}`}>
                    <Filter className="mr-2 h-4 w-4 text-[#cc785c]" />
                    <span className="truncate">{statusFilterLabel}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] rounded-[14px] border-[#e6dfd8] bg-[#fffdf8] p-2 text-[#141413] shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#efe9de] px-3 py-2.5">
                    <p className="text-sm font-semibold tracking-[-0.01em] text-[#252523]">Filter by Status</p>
                    {selectedStatuses.length > 0 && (
                      <button type="button" onClick={() => setSelectedStatuses([])} className="text-xs font-medium text-[#cc785c] hover:text-[#a9583e]">
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="mt-1 space-y-1">
                    <button
                      type="button"
                      onClick={() => setSelectedStatuses([])}
                      className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm transition-colors ${selectedStatuses.length === 0 ? "bg-[#efe9de] text-[#141413]" : "text-[#252523] hover:bg-[#f4eee6]"}`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selectedStatuses.length === 0 ? "border-[#cc785c] bg-[#cc785c] text-white" : "border-transparent text-transparent"}`}>
                        <Check className={`h-3.5 w-3.5 ${selectedStatuses.length === 0 ? "opacity-100" : "opacity-0"}`} />
                      </span>
                      <Filter className={`h-4 w-4 ${selectedStatuses.length === 0 ? "text-[#cc785c]" : "text-[#8e8b82]"}`} />
                      <span className="min-w-0 flex-1 truncate font-medium">All statuses</span>
                      <span className="rounded-full border border-[#e6dfd8] bg-[#faf9f5] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#6c6a64]">
                        {allStatusCount}
                      </span>
                    </button>
                    {STATUSES.map((status) => {
                      const active = selectedStatuses.includes(status);
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => toggleStatusFilter(status)}
                          className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm transition-colors ${active ? "bg-[#efe9de] text-[#141413]" : "text-[#252523] hover:bg-[#f4eee6]"}`}
                        >
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${active ? "border-[#cc785c] bg-[#cc785c] text-white" : "border-transparent text-transparent"}`}>
                            <Check className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-0"}`} />
                          </span>
                          <StatusIcon status={status} className={`h-4 w-4 ${active ? "text-[#cc785c]" : "text-[#8e8b82]"}`} />
                          <span className="min-w-0 flex-1 truncate font-medium">{status}</span>
                          <span className="rounded-full border border-[#e6dfd8] bg-[#faf9f5] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#6c6a64]">
                            {statusCounts[status] || 0}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex overflow-hidden rounded-[8px] border border-[#252320] bg-[#1f1e1b]">
              <button
                onClick={() => setView("table")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs ${view === "table" ? "bg-[#252320] font-medium text-[#faf9f5]" : "text-[#a09d96] hover:bg-[#252320]"}`}
              >
                <Table2 className="w-3.5 h-3.5" /> Table
              </button>
              <button
                onClick={() => setView("board")}
                className={`flex items-center gap-1.5 border-l border-[#252320] px-3 py-2 text-xs ${view === "board" ? "bg-[#252320] font-medium text-[#faf9f5]" : "text-[#a09d96] hover:bg-[#252320]"}`}
              >
                <ListTodo className="w-3.5 h-3.5" /> To Do
              </button>
            </div>
          </div>
          <div className={`mt-4 rounded-[12px] border p-4 transition-colors ${hasDateFilter ? "border-[#cc785c] bg-[#211b18]" : "border-[#252320] bg-[#1f1e1b]"}`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#a09d96]">Date filter</p>
                {hasDateFilter && (
                  <span className="rounded-full border border-[#cc785c] bg-[#3a281f] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#f0b49d]">
                    Active: {selectedDateField}
                  </span>
                )}
              </div>
              {hasDateFilter && (
                <button type="button" onClick={clearDateFilters} className="text-xs font-medium text-[#cc785c] hover:text-[#e09a82]">
                  Clear dates
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(180px,220px)_minmax(280px,420px)] lg:items-end">
              <label className="space-y-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#a09d96]">
                Date type
                <Select value={dateFilter.field} onValueChange={(value) => updateDateFilter("field", value)}>
                  <SelectTrigger className={`h-10 rounded-[8px] border-[#252320] bg-[#1f1e1b] text-[#faf9f5] shadow-none focus:ring-[#cc785c] ${hasDateFilter ? activeInput : ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-[12px] border-[#e6dfd8] bg-[#faf9f5] text-[#141413]">
                    {DASHBOARD_DATE_FIELD_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#a09d96]">
                  From
                  <Input type="date" value={dateFilter.from} onChange={(e) => updateDateFilter("from", e.target.value)} className={`${darkInput} ${dateFilter.from ? activeInput : ""}`} />
                </label>
                <label className="space-y-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#a09d96]">
                  To
                  <Input type="date" value={dateFilter.to} onChange={(e) => updateDateFilter("to", e.target.value)} className={`${darkInput} ${dateFilter.to ? activeInput : ""}`} />
                </label>
              </div>
            </div>
          </div>
        </div>

        {view === "table" && (
          <div className="flex flex-col gap-3 rounded-[12px] border border-[#e6dfd8] bg-[#fffdf8] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-[#6c6a64]">
              <span className="font-medium text-[#252523]">{selectedIds.length}</span> selected from <span className="font-medium text-[#252523]">{pageTickets.length}</span> reservation{pageTickets.length === 1 ? "" : "s"} on this page
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={exportFilteredCsv} disabled={pageTickets.length === 0 || exporting} className="rounded-[8px] border-[#d8d0c7] bg-[#faf9f5] text-[#252523] hover:bg-[#efe9de]">
                <Download className="mr-2 h-4 w-4" /> {exporting ? "Exporting..." : "Export CSV"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" disabled={selectedIds.length === 0} className="rounded-[8px] border-[#e4b5a7] bg-[#fff7f4] text-[#a9583e] hover:bg-[#f7e4dd]">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete selected
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md rounded-[18px] border-[#e6dfd8] bg-[#fffdf8] p-0 text-[#141413] shadow-2xl">
                  <div className="border-b border-[#efe9de] px-6 py-5">
                    <AlertDialogHeader className="space-y-2 text-left">
                      <AlertDialogTitle className="text-xl font-semibold tracking-[-0.02em]">Delete selected reservations?</AlertDialogTitle>
                      <AlertDialogDescription className="text-sm leading-6 text-[#6c6a64]">
                        This will permanently delete {selectedIds.length} selected reservation{selectedIds.length === 1 ? "" : "s"}. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                  </div>
                  <AlertDialogFooter className="gap-2 px-6 py-4 sm:space-x-0">
                    <AlertDialogCancel className="mt-0 rounded-[8px] border-[#d8d0c7] bg-[#faf9f5] text-[#252523] hover:bg-[#efe9de]">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete} className="rounded-[8px] bg-[#b84f34] text-white hover:bg-[#963f2a]">
                      Delete {selectedIds.length}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

      <div className="hidden md:block">
        {paginationControls}
      </div>

      {view === "board" ? (
        <div className="space-y-3">
          {pageTickets.map((t) => (
            <TicketCard key={t.id} ticket={t} onDelete={handleDelete} onStatusChange={handleStatusChange} />
          ))}
          {!isLoadingPage && pageTickets.length === 0 && (
            <div className="border border-dashed border-[#e6dfd8] rounded-[12px] bg-[#faf9f5] py-16 text-center text-sm text-[#6c6a64]">
              No reservations found. <Link href="/new" className="text-[#cc785c] underline underline-offset-4">Create one</Link>.
            </div>
          )}
        </div>
      ) : (
        <TicketTable tickets={pageTickets} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} visibleColumns={visibleColumns} onVisibleColumnsChange={setVisibleColumns} onStatusChange={handleStatusChange} onTicketUpdate={updateTicket} />
      )}
      {paginationControls}
      </div>
    </div>
  );
}
