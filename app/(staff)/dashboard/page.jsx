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

const serif = "font-['Cormorant_Garamond',_'EB_Garamond',_'Times_New_Roman',_serif]";
const primaryButton = "h-10 rounded-[8px] bg-[#cc785c] px-5 text-sm font-medium text-white shadow-none hover:bg-[#a9583e]";

export default function Dashboard() {
  const tickets = useTickets();
  const { deleteTicket, updateTicket } = useTicketActions();
  const [view, setView] = useState("board");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
      return matchSearch && matchStatus;
    });
  }, [tickets, search, statusFilter]);

  const stats = useMemo(() => {
    const revenue = tickets
      .filter((t) => ["CONFIRMED", "PAYMENT RECEIVED", "COMPLETED"].includes(t.status))
      .reduce((sum, t) => sum + (t.rateOffered || 0), 0);
    const clients = new Set(tickets.flatMap((t) => (t.guests || []).filter(Boolean))).size;
    return [
      { label: "Total", value: tickets.length },
      { label: "Pending", value: tickets.filter((t) => ["PENDING", "QUOTE"].includes(t.status)).length },
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
              <h1 className={`${serif} text-5xl font-medium leading-[1.02] tracking-[-0.04em] md:text-6xl`}>Reservations</h1>
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
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reservations" className="h-10 rounded-[8px] border-[#252320] bg-[#1f1e1b] pl-9 text-[#faf9f5] shadow-none placeholder:text-[#8e8b82] focus-visible:ring-[#cc785c]" />
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
