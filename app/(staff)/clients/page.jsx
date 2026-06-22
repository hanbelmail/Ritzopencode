"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Download, Mail, Phone, Search, SlidersHorizontal, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTickets } from "@/lib/store";
import { fmtDate, fmtMoney } from "@/lib/calc";

const primaryButton = "h-10 rounded-[8px] bg-[#cc785c] px-4 text-sm font-medium text-white shadow-none hover:bg-[#a9583e]";
const darkInput = "h-10 rounded-[8px] border-[#252320] bg-[#1f1e1b] text-[#faf9f5] shadow-none placeholder:text-[#b8b3aa] focus-visible:ring-[#cc785c]";
const selectTrigger = "h-10 rounded-[8px] border-[#252320] bg-[#1f1e1b] text-[#faf9f5] shadow-none focus:ring-[#cc785c]";

const segmentOptions = [
  { value: "all", label: "All clients" },
  { value: "vip", label: "VIP" },
  { value: "repeat", label: "Repeat clients" },
  { value: "recent", label: "Recent stays" },
  { value: "missing", label: "Missing contact" },
  { value: "inactive", label: "Inactive" },
];

const sortOptions = [
  { value: "lastCheckIn", label: "Last stay" },
  { value: "totalValue", label: "Total value" },
  { value: "reservations", label: "Reservations" },
  { value: "name", label: "Name" },
];

function dateValue(value) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function daysSince(value) {
  const timestamp = dateValue(value);
  if (!timestamp) return Infinity;
  return Math.floor((Date.now() - timestamp) / 86400000);
}

function clientKey(ticket, primaryGuest) {
  const email = ticket.email?.trim().toLowerCase();
  const phone = ticket.phone?.replace(/\D/g, "");
  const name = primaryGuest?.trim().toLowerCase();
  if (email) return `email:${email}`;
  if (phone) return `phone:${phone}`;
  return `name:${name}`;
}

function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function statusTone(status) {
  if (["BOOKING CONFIRMED", "PAYMENT VERIFIED"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["PAYMENT SUBMITTED", "PRICE SENT"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "CANCELLED") return "border-red-200 bg-red-50 text-red-700";
  return "border-[#e6dfd8] bg-[#faf9f5] text-[#6f6a60]";
}

function ClientBadges({ client }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {client.isVip && <Badge className="border-[#cc785c]/30 bg-[#f7e4dc] text-[#9a4f35] hover:bg-[#f7e4dc]">VIP</Badge>}
      {client.reservations > 1 && <Badge variant="secondary" className="bg-[#ebe5dc] text-[#5f574d]">Repeat</Badge>}
      {client.isRecent && <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Recent</Badge>}
      {client.hasMissingContact && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Needs contact</Badge>}
      {client.isInactive && <Badge variant="outline" className="border-[#e1dbd1] text-[#8a8277]">Inactive</Badge>}
    </div>
  );
}

export default function Clients() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [segment, setSegment] = useState("all");
  const [sortBy, setSortBy] = useState("lastCheckIn");
  const [selectedClientKey, setSelectedClientKey] = useState(null);
  const tickets = useTickets();

  const clients = useMemo(() => {
    const map = {};
    tickets.forEach((t) => {
      const [primary] = (t.guests || []).filter(Boolean);
      if (!primary) return;
      const key = clientKey(t, primary);
      if (!map[key]) {
        map[key] = {
          key,
          name: primary,
          email: t.email || "",
          phone: t.phone || "",
          reservations: 0,
          lastCheckIn: null,
          lastCreatedAt: null,
          totalValue: 0,
          tickets: [],
        };
      }
      const client = map[key];
      client.reservations += 1;
      client.totalValue += t.rateOffered || 0;
      client.tickets.push(t);

      const isNewerStay = dateValue(t.checkIn) >= dateValue(client.lastCheckIn);
      if (isNewerStay) {
        client.lastCheckIn = t.checkIn || client.lastCheckIn;
        client.name = primary || client.name;
        if (t.email) client.email = t.email;
        if (t.phone) client.phone = t.phone;
      }
      if (dateValue(t.createdAt) > dateValue(client.lastCreatedAt)) client.lastCreatedAt = t.createdAt;
    });

    const values = Object.values(map);
    const vipFloor = values.length ? Math.max(5000, [...values].sort((a, b) => b.totalValue - a.totalValue)[Math.max(0, Math.ceil(values.length * 0.1) - 1)]?.totalValue || 0) : 5000;

    return values.map((client) => {
      const orderedTickets = [...client.tickets].sort((a, b) => dateValue(b.checkIn || b.createdAt) - dateValue(a.checkIn || a.createdAt));
      return {
        ...client,
        tickets: orderedTickets,
        hasMissingContact: !client.email || !client.phone,
        isRecent: daysSince(client.lastCheckIn || client.lastCreatedAt) <= 90,
        isInactive: daysSince(client.lastCheckIn || client.lastCreatedAt) > 365,
        isVip: client.totalValue >= vipFloor && client.totalValue > 0,
      };
    });
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const matching = clients.filter((c) => {
      const matchesSearch = !q || [c.name, c.email, c.phone].some((v) => String(v || "").toLowerCase().includes(q));
      const matchesSegment =
        segment === "all" ||
        (segment === "vip" && c.isVip) ||
        (segment === "repeat" && c.reservations > 1) ||
        (segment === "recent" && c.isRecent) ||
        (segment === "missing" && c.hasMissingContact) ||
        (segment === "inactive" && c.isInactive);
      return matchesSearch && matchesSegment;
    });

    return matching.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "totalValue") return b.totalValue - a.totalValue;
      if (sortBy === "reservations") return b.reservations - a.reservations;
      return dateValue(b.lastCheckIn || b.lastCreatedAt) - dateValue(a.lastCheckIn || a.lastCreatedAt);
    });
  }, [clients, deferredSearch, segment, sortBy]);

  const selectedClient = clients.find((client) => client.key === selectedClientKey) || null;

  const stats = useMemo(() => {
    const repeatClients = clients.filter((client) => client.reservations > 1).length;
    const totalValue = clients.reduce((sum, client) => sum + client.totalValue, 0);
    const missingContact = clients.filter((client) => client.hasMissingContact).length;
    return [
      { label: "Total Clients", value: clients.length, sub: "unique records" },
      { label: "Repeat Clients", value: repeatClients, sub: "2+ reservations" },
      { label: "Client Value", value: fmtMoney(totalValue), sub: "quoted total" },
      { label: "Missing Contact", value: missingContact, sub: "needs cleanup" },
    ];
  }, [clients]);

  const exportClientsCsv = () => {
    const columns = ["Client", "Email", "Phone", "Reservations", "Last Check-in", "Total Value", "VIP", "Missing Contact"];
    const rows = filtered.map((client) => [
      client.name,
      client.email,
      client.phone,
      client.reservations,
      client.lastCheckIn || "",
      client.totalValue,
      client.isVip ? "Yes" : "No",
      client.hasMissingContact ? "Yes" : "No",
    ]);
    const csv = [columns, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#faf9f5] px-5 py-8 text-[#141413] md:px-8 lg:px-10">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <div className="rounded-[16px] bg-[#181715] p-6 text-[#faf9f5] md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-[#a09d96]">Client workspace</p>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.04em] md:text-5xl">Clients</h1>
              <p className="mt-4 text-sm leading-[1.65] text-[#a09d96]">Find VIPs, repeat guests, missing contact details, and full reservation history from one client view.</p>
            </div>
            <Button onClick={exportClientsCsv} disabled={filtered.length === 0} className={primaryButton}>
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>

          <div className="mt-8 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8e8b82]" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, or phone" className={`${darkInput} pl-9`} />
            </div>
            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger className={selectTrigger}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-[12px] border-[#e6dfd8] bg-[#faf9f5] text-[#141413]">
                {segmentOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className={selectTrigger}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-[12px] border-[#e6dfd8] bg-[#faf9f5] text-[#141413]">
                {sortOptions.map((option) => <SelectItem key={option.value} value={option.value}>Sort: {option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-[14px] border border-[#e6dfd8] bg-white p-4 shadow-sm">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#8a8277]">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#181715]">{stat.value}</p>
              <p className="mt-1 text-xs text-[#8a8277]">{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#e6dfd8] bg-white px-4 py-3 text-sm text-[#6f6a60]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#cc785c]" />
            Showing <span className="font-semibold text-[#181715]">{filtered.length}</span> of <span className="font-semibold text-[#181715]">{clients.length}</span> clients
          </div>
          <p className="text-xs">Clients are grouped by email first, then phone, then name.</p>
        </div>

        <div className="hidden overflow-hidden rounded-[16px] border border-[#e6dfd8] bg-white shadow-sm lg:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e6dfd8] bg-[#f4efe8]">
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#8a8277]">Client</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#8a8277]">Contact</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#8a8277]">Segments</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#8a8277]">Reservations</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#8a8277]">Last Stay</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#8a8277]">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client.key} onClick={() => setSelectedClientKey(client.key)} className="cursor-pointer border-b border-[#eee7dd] transition-colors last:border-0 hover:bg-[#faf6ef]">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e6dfd8] bg-[#181715] text-xs font-semibold text-[#faf9f5]">{initials(client.name)}</div>
                      <div>
                        <div className="flex items-center gap-1.5 font-semibold text-[#181715]">
                          {client.isVip && <Star className="h-3.5 w-3.5 fill-[#cc785c] text-[#cc785c]" />}
                          {client.name}
                        </div>
                        <p className="text-xs text-[#8a8277]">{client.tickets.length} reservation record{client.tickets.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[#6f6a60]">
                    <div className="space-y-1">
                      <p>{client.email || "No email"}</p>
                      <p>{client.phone || "No phone"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4"><ClientBadges client={client} /></td>
                  <td className="px-4 py-4 font-semibold">{client.reservations}</td>
                  <td className="px-4 py-4 text-[#6f6a60]">{client.lastCheckIn ? fmtDate(client.lastCheckIn) : "—"}</td>
                  <td className="px-4 py-4 font-semibold text-[#181715]">{fmtMoney(client.totalValue)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-sm text-[#8a8277]">No clients match the current search or segment.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 lg:hidden">
          {filtered.map((client) => (
            <button key={client.key} type="button" onClick={() => setSelectedClientKey(client.key)} className="rounded-[16px] border border-[#e6dfd8] bg-white p-4 text-left shadow-sm transition-colors hover:bg-[#faf6ef]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#181715] text-xs font-semibold text-[#faf9f5]">{initials(client.name)}</div>
                  <div>
                    <p className="font-semibold text-[#181715]">{client.name}</p>
                    <p className="text-xs text-[#8a8277]">{client.reservations} reservation{client.reservations !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <p className="font-semibold text-[#181715]">{fmtMoney(client.totalValue)}</p>
              </div>
              <div className="mt-3 space-y-1 text-sm text-[#6f6a60]">
                <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {client.email || "No email"}</p>
                <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {client.phone || "No phone"}</p>
              </div>
              <div className="mt-3"><ClientBadges client={client} /></div>
            </button>
          ))}
          {filtered.length === 0 && <div className="rounded-[16px] border border-[#e6dfd8] bg-white px-4 py-14 text-center text-sm text-[#8a8277]">No clients match the current search or segment.</div>}
        </div>
      </div>

      <Sheet open={Boolean(selectedClient)} onOpenChange={(open) => !open && setSelectedClientKey(null)}>
        <SheetContent className="w-full overflow-y-auto bg-[#faf9f5] p-0 sm:max-w-xl">
          {selectedClient && (
            <div>
              <div className="bg-[#181715] px-6 py-7 text-[#faf9f5]">
                <SheetHeader className="text-left">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#38342d] bg-[#252320] text-sm font-semibold">{initials(selectedClient.name)}</div>
                  <SheetTitle className="text-2xl tracking-[-0.03em] text-[#faf9f5]">{selectedClient.name}</SheetTitle>
                  <SheetDescription className="text-[#a09d96]">Client profile, contact quality, and reservation history.</SheetDescription>
                </SheetHeader>
              </div>

              <div className="space-y-5 p-6">
                <ClientBadges client={selectedClient} />

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-[12px] border border-[#e6dfd8] bg-white p-3">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#8a8277]">Bookings</p>
                    <p className="mt-1 text-xl font-semibold">{selectedClient.reservations}</p>
                  </div>
                  <div className="rounded-[12px] border border-[#e6dfd8] bg-white p-3">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#8a8277]">Value</p>
                    <p className="mt-1 text-xl font-semibold">{fmtMoney(selectedClient.totalValue)}</p>
                  </div>
                  <div className="rounded-[12px] border border-[#e6dfd8] bg-white p-3">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#8a8277]">Last Stay</p>
                    <p className="mt-1 text-sm font-semibold">{selectedClient.lastCheckIn ? fmtDate(selectedClient.lastCheckIn) : "—"}</p>
                  </div>
                </div>

                <div className="rounded-[14px] border border-[#e6dfd8] bg-white p-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-[#8a8277]">Contact</p>
                  <div className="space-y-2 text-sm text-[#5f574d]">
                    <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#cc785c]" /> {selectedClient.email || "No email saved"}</p>
                    <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#cc785c]" /> {selectedClient.phone || "No phone saved"}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8a8277]">Reservation History</p>
                  {selectedClient.tickets.map((ticket) => (
                    <div key={ticket.id} className="rounded-[14px] border border-[#e6dfd8] bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#181715]">{ticket.roomType || "Reservation"}</p>
                          <p className="mt-1 text-xs text-[#8a8277]">{ticket.id}</p>
                        </div>
                        <Badge variant="outline" className={statusTone(ticket.status)}>{ticket.status || "No status"}</Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.12em] text-[#8a8277]">Stay</p>
                          <p className="mt-1 text-[#181715]">{ticket.checkIn ? fmtDate(ticket.checkIn) : "—"} to {ticket.checkOut ? fmtDate(ticket.checkOut) : "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.12em] text-[#8a8277]">Value</p>
                          <p className="mt-1 font-semibold text-[#181715]">{fmtMoney(ticket.rateOffered)}</p>
                        </div>
                      </div>
                      {ticket.notes && <p className="mt-3 rounded-[10px] bg-[#f4efe8] p-3 text-sm text-[#5f574d]">{ticket.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
