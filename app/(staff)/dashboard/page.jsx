"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, LayoutGrid, Table2 } from "lucide-react";
import StatsBar from "@/components/tickets/StatsBar";
import TicketCard from "@/components/tickets/TicketCard";
import TicketTable from "@/components/tickets/TicketTable";
import { useTickets, useTicketActions, STATUSES } from "@/lib/store";
import { fmtMoney } from "@/lib/calc";

const primaryButton = "h-10 rounded-[8px] bg-[#cc785c] px-5 text-sm font-medium text-white shadow-none hover:bg-[#a9583e]";
const darkInput = "h-10 rounded-[8px] border-[#252320] bg-[#1f1e1b] text-[#faf9f5] shadow-none placeholder:text-[#b8b3aa] focus-visible:ring-[#cc785c] [color-scheme:dark]";
const activeInput = "border-[#cc785c] bg-[#2a211d]";
const dateFieldOptions = [
  { value: "checkIn", label: "Check-in" },
  { value: "checkOut", label: "Check-out" },
  { value: "createdAt", label: "Quote-created" },
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

function inDateRange(value, from, to) {
  if (!from && !to) return true;
  const stamp = dateStamp(value);
  if (!stamp) return false;
  return (!from || stamp >= from) && (!to || stamp <= to);
}

export default function Dashboard() {
  const tickets = useTickets();
  const { deleteTicket, updateTicket } = useTicketActions();
  const [view, setView] = useState("board");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState({ field: "checkIn", from: "", to: "" });

  const hasDateFilter = Boolean(dateFilter.from || dateFilter.to);
  const selectedDateField = dateFieldOptions.find((option) => option.value === dateFilter.field)?.label || "Date";

  const updateDateFilter = (key, value) => {
    setDateFilter((current) => ({ ...current, [key]: value }));
  };

  const clearDateFilters = () => {
    setDateFilter((current) => ({ ...current, from: "", to: "" }));
  };

  const handleDelete = async (id) => {
    await deleteTicket(id);
  };

  const handleStatusChange = async (id, status) => {
    await updateTicket(id, { status });
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tickets.filter((t) => {
      const matchSearch =
        !q ||
        [...(t.guests || []), t.id, t.email, t.phone, t.roomType, t.referredBy]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      const matchDate = inDateRange(t[dateFilter.field], dateFilter.from, dateFilter.to);
      return matchSearch && matchStatus && matchDate;
    });
  }, [tickets, search, statusFilter, dateFilter]);

  const stats = useMemo(() => {
    const revenue = tickets
      .filter((t) => ["PAYMENT VERIFIED", "PAYMENT SUBMITTED", "BOOKING CONFIRMED"].includes(t.status))
      .reduce((sum, t) => sum + (t.rateOffered || 0), 0);
    const clients = new Set(tickets.flatMap((t) => (t.guests || []).filter(Boolean))).size;
    return [
      { label: "Total", value: tickets.length },
      { label: "Pending", value: tickets.filter((t) => ["PRICE SENT", "QUOTE REQUESTED"].includes(t.status)).length },
      { label: "Booked Revenue", value: fmtMoney(revenue) },
      { label: "Clients", value: clients, sub: "unique guests" },
    ];
  }, [tickets]);

  return (
    <div className="min-h-screen bg-[#faf9f5] px-5 py-8 text-[#141413] md:px-8 lg:px-10">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <div className="rounded-[16px] bg-[#181715] p-6 text-[#faf9f5] md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-[#a09d96]">Staff workspace</p>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.04em] md:text-5xl">Reservations</h1>
              <p className="mt-4 text-sm leading-[1.65] text-[#a09d96]">Manage every quote, payment, stay date, and guest record. Data is saved in Convex.</p>
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-full rounded-[8px] border-[#252320] bg-[#1f1e1b] text-[#faf9f5] shadow-none focus:ring-[#cc785c] sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[12px] border-[#e6dfd8] bg-[#faf9f5] text-[#141413]">
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <LayoutGrid className="w-3.5 h-3.5" /> Board
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
                    {dateFieldOptions.map((option) => (
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

        <StatsBar stats={stats} />

      {view === "board" ? (
        <div className="space-y-3">
          {filtered.map((t) => (
            <TicketCard key={t.id} ticket={t} onDelete={handleDelete} onStatusChange={handleStatusChange} />
          ))}
          {filtered.length === 0 && (
            <div className="border border-dashed border-[#e6dfd8] rounded-[12px] bg-[#faf9f5] py-16 text-center text-sm text-[#6c6a64]">
              No reservations found. <Link href="/new" className="text-[#cc785c] underline underline-offset-4">Create one</Link>.
            </div>
          )}
        </div>
      ) : (
        <TicketTable tickets={filtered} />
      )}
      </div>
    </div>
  );
}
