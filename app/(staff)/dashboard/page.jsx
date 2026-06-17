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
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-4 bg-[#f7f7f7] min-h-screen">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reservations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage all reservations — data is saved in Convex.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setView("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${view === "table" ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-secondary/50"}`}
            >
              <Table2 className="w-3.5 h-3.5" /> Table
            </button>
            <button
              onClick={() => setView("board")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border-l ${view === "board" ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-secondary/50"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </button>
          </div>
          <Button asChild size="sm">
            <Link href="/new"><Plus className="w-4 h-4 mr-1" /> Add Reservation</Link>
          </Button>
        </div>
      </div>

      <StatsBar stats={stats} />

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reservations…" className="pl-9 bg-card" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {view === "board" ? (
        <div className="space-y-3">
          {filtered.map((t) => (
            <TicketCard key={t.id} ticket={t} onDelete={handleDelete} onStatusChange={handleStatusChange} />
          ))}
          {filtered.length === 0 && (
            <div className="border border-dashed rounded-xl py-16 text-center text-sm text-muted-foreground">
              No reservations found. <Link href="/new" className="underline">Create one</Link>.
            </div>
          )}
        </div>
      ) : (
        <TicketTable tickets={filtered} />
      )}
    </div>
  );
}
